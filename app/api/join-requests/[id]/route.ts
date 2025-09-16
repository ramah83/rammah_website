// /app/api/join-requests/[id]/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, Session } from "@/lib/server/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = (await getSession(req)) as Session | null;
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "").trim();
  const id = params.id;

  const db = getDB();
  const row = db.prepare(`SELECT * FROM join_requests WHERE id=?`).get(id) as any;
  if (!row || row.status !== "pending") {
    return NextResponse.json({ error: "الطلب غير موجود أو غير مُعلّق" }, { status: 404 });
  }

  const ent = db.prepare(`SELECT id, managerUserId FROM entities WHERE id=?`).get(row.entityId) as any;

  const isEntityManagerForThis =
    s.role === "entityManager" &&
    (String(s.entityId || "") === String(row.entityId) || (ent?.managerUserId && ent.managerUserId === s.id));

  const canDecide = s.role === "unionSupervisor" || isEntityManagerForThis;
  if (!canDecide) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  if (action === "approve") {
    const tx = (db as any).transaction(() => {
      const existing = db.prepare(
        `SELECT entityId FROM entity_members WHERE userId=? LIMIT 1`
      ).get(row.userId) as any;

      if (existing && existing.entityId) {
        if (String(existing.entityId) === String(row.entityId)) {
          db.prepare(`
            UPDATE join_requests
               SET status='approved',
                   decidedAt=datetime('now'),
                   decidedBy=?
             WHERE id=?
          `).run(s.id, id);
        } else {
          db.prepare(`
            UPDATE join_requests
               SET status='joined_elsewhere',
                   decidedAt=datetime('now'),
                   decidedBy=?,
                   note=COALESCE(note,'تم إغلاق الطلب تلقائيًا لانضمام المستخدم إلى كيان آخر')
             WHERE id=?
          `).run(s.id, id);
        }
        return;
      }

      db.prepare(`
        UPDATE join_requests
           SET status='approved',
               decidedAt=datetime('now'),
               decidedBy=?
         WHERE id=?
      `).run(s.id, id);

      db.prepare(`
        INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
        VALUES (?, ?, ?, datetime('now'))
      `).run(uid(), row.entityId, row.userId);

      db.prepare(`
        UPDATE join_requests
           SET status='joined_elsewhere',
               decidedAt=datetime('now'),
               decidedBy=?,
               note=COALESCE(note,'تم إغلاق الطلب تلقائيًا لانضمام المستخدم إلى كيان آخر')
         WHERE userId=? AND status='pending' AND id<>?
      `).run(s.id, row.userId, id);
    });

    try {
      tx();
      const updated = db.prepare(`SELECT status FROM join_requests WHERE id=?`).get(id) as any;
      return NextResponse.json({ ok: true, status: updated?.status || "approved" });
    } catch (e: any) {
      return NextResponse.json({ error: e?.message || "تعذر تطبيق القرار" }, { status: 500 });
    }
  }

  if (action === "reject") {
    db.prepare(`
      UPDATE join_requests
         SET status='rejected',
             decidedAt=datetime('now'),
             decidedBy=?
       WHERE id=?
    `).run(s.id, id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
}