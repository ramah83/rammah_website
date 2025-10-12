// app/api/membership/leave/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, fromBase64Any, toCoreRole } from "@/lib/server/session";

type Sess = { id: string; role: "user"|"entityManager"|"unionSupervisor"; name?: string|null; email?: string|null };

async function readSession(req: NextRequest): Promise<Sess | null> {
  try {
    const s = await getSession(req) as any;
    if (s?.id) {
      return { id: String(s.id), role: toCoreRole(s.role) as Sess["role"], name: s.name ?? null, email: s.email ?? null };
    }
  } catch {}
  const b64 = req.headers.get("x-session-b64") || "";
  if (b64) {
    try {
      const json = fromBase64Any(b64);
      const parsed = JSON.parse(json);
      if (parsed?.id) {
        return { id: String(parsed.id), role: toCoreRole(parsed.role) as Sess["role"], name: parsed.name ?? null, email: parsed.email ?? null };
      }
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const s = await readSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();

  // استرجاع الكيان الحالي للمستخدم
  const mem = db.prepare(`
    SELECT em.entityId, COALESCE(e.name, em.entityId) AS entityName
      FROM entity_members em
      LEFT JOIN entities e ON e.id = em.entityId
     WHERE em.userId = ?
     LIMIT 1
  `).get(s.id) as { entityId?: string; entityName?: string } | undefined;

  if (!mem?.entityId) {
    return NextResponse.json({ error: "لست عضوًا في أي كيان" }, { status: 409 });
  }

  const entityId = String(mem.entityId);
  const actorName = s.name || s.email || "مستخدم";

  try {
    const tx = (db as any).transaction(() => {
      // احذف العضوية
      db.prepare(`DELETE FROM entity_members WHERE entityId=? AND userId=?`).run(entityId, s.id);

      // وسم آخر طلب انضمام Approved بـ left (إن وجد)
      db.prepare(`
        UPDATE join_requests
           SET status='left', decidedAt=datetime('now'),
               decidedBy=COALESCE(decidedBy,'system'),
               note = COALESCE(note,'') || CASE WHEN note IS NULL OR note='' THEN '' ELSE ' | ' END || 'left via self-service'
         WHERE userId=? AND entityId=? AND status='approved'
      `).run(s.id, entityId);

      // لوج أحداث العضوية
      db.prepare(`
        INSERT INTO membership_events (id, userId, entityId, entityName, type, createdAt, meta)
        VALUES (?, ?, ?, COALESCE((SELECT name FROM entities WHERE id=?), ?), 'left', datetime('now'), json(?))
      `).run(
        uid(), s.id, entityId, entityId, entityId,
        JSON.stringify({ method: "self_service" })
      );

      // لوج أحداث الكيان
      db.prepare(`
        INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
        VALUES (?, ?, 'member_left', NULL, NULL, 'self_service_leave', ?, ?, ?, datetime('now'))
      `).run(uid(), entityId, s.id, actorName, s.role);
    });
    tx();

    return NextResponse.json({ ok: true, entityId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تنفيذ الخروج" }, { status: 500 });
  }
}
