// app/api/membership/leave/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const session = await getSession(req);
    if (!session?.id) return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 401 });

    const current = db.prepare(`
      SELECT em.id AS emId, em.entityId, e.name AS entityName
      FROM entity_members em
      LEFT JOIN entities e ON e.id = em.entityId
      WHERE em.userId = ?
      LIMIT 1
    `).get(session.id) as any;

    if (!current?.emId) {
      return NextResponse.json({ ok: true, message: "لا توجد عضوية حالية" }, { status: 200 });
    }

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM entity_members WHERE id = ?`).run(current.emId);

      db.prepare(`
        UPDATE join_requests
           SET status = 'left',
               decidedAt = datetime('now'),
               decidedBy = COALESCE(decidedBy, 'system'),
               note = COALESCE(note, '') || CASE WHEN note IS NULL OR note = '' THEN '' ELSE ' | ' END || 'left via membership/leave'
         WHERE userId = ? AND entityId = ? AND status = 'approved'
      `).run(session.id, current.entityId);

      const entityNameToStore = current.entityName || String(current.entityId);
      db.prepare(`
        INSERT INTO membership_events (id, userId, entityId, entityName, type, createdAt, meta)
        VALUES (?, ?, ?, ?, 'left', datetime('now'), '{}')
      `).run(uid(), session.id, current.entityId, entityNameToStore);
    });

    tx();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    const message = err?.message || "حدث خطأ غير متوقع أثناء الخروج من الكيان";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
