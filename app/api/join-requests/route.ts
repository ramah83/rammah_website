// app/api/join-requests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const db = getDB();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const entityId = searchParams.get("entityId");
  const status = searchParams.get("status");
  if (userId) {
    const rows = db.prepare(`
      SELECT * FROM join_requests
      WHERE userId = ?
      ${status ? `AND status = ?` : ``}
      ORDER BY createdAt DESC
    `).all(...(status ? [userId, status] : [userId])) as any[];
    return NextResponse.json(rows, { status: 200 });
  }
  if (entityId) {
    const rows = db.prepare(`
      SELECT * FROM join_requests
      WHERE entityId = ?
      ${status ? `AND status = ?` : ``}
      ORDER BY createdAt DESC
    `).all(...(status ? [entityId, status] : [entityId])) as any[];
    return NextResponse.json(rows, { status: 200 });
  }
  const rows = db.prepare(`SELECT * FROM join_requests ORDER BY createdAt DESC`).all() as any[];
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const session = await getSession(req);
    if (!session?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const entityId = String(body?.entityId || "").trim();
    if (!entityId) return NextResponse.json({ error: "entityId مطلوب" }, { status: 400 });

    const activeMembership = db.prepare(`
      SELECT 1 FROM entity_members WHERE userId = ? LIMIT 1
    `).get(session.id);
    if (activeMembership) {
      return NextResponse.json({ error: "أنت عضو حاليًا في كيان. اخرج أولًا ثم قدّم طلبًا جديدًا." }, { status: 400 });
    }

    db.prepare(`
      UPDATE join_requests
         SET status = 'left',
             decidedAt = datetime('now'),
             decidedBy = COALESCE(decidedBy,'system'),
             note = COALESCE(note,'') || CASE WHEN note IS NULL OR note = '' THEN '' ELSE ' | ' END || 'auto-left stale approved'
       WHERE userId = ?
         AND status = 'approved'
         AND NOT EXISTS (
           SELECT 1 FROM entity_members em
           WHERE em.userId = join_requests.userId
             AND em.entityId = join_requests.entityId
         )
    `).run(session.id);

    const existsSame = db.prepare(`
      SELECT 1 FROM join_requests
      WHERE userId = ? AND entityId = ? AND status IN ('pending','approved')
      LIMIT 1
    `).get(session.id, entityId);
    if (existsSame) {
      return NextResponse.json({ error: "لديك طلب/عضوية قائمة لهذا الكيان" }, { status: 400 });
    }

    const entity = db.prepare(`SELECT id, name FROM entities WHERE id = ?`).get(entityId) as any;
    if (!entity) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });

    const user = db.prepare(`SELECT id, name, email FROM users WHERE id = ?`).get(session.id) as any;
    if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    db.prepare(`
      INSERT INTO join_requests
        (id, userId, userName, userEmail, entityId, entityName, note, status, createdAt, decidedAt, decidedBy, idFrontPath, idBackPath, phone, position)
      VALUES
        (?,  ?,      ?,        ?,         ?,        ?,          NULL, 'pending', datetime('now'), NULL,     NULL,       NULL,       NULL,   NULL,  NULL)
    `).run(uid(), user.id, user.name, user.email, entity.id, entity.name);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}
