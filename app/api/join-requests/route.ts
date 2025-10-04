export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, type Session } from "@/lib/server/session";

/**
 * GET:
 * - userId → طلبات مستخدم
 * - entityId → طلبات كيان
 * - لو role=entityManager بدون entityId → طلبات كل الكيانات التي يديرها (managerUserId = session.id)
 * - لو role=unionSupervisor و ?status=... → فلترة بالحالة وإلا كل الطلبات
 */
export async function GET(req: NextRequest) {
  const db = getDB();
  const s = (await getSession(req)) as Session | null;

  const { searchParams } = new URL(req.url);
  const userId   = (searchParams.get("userId")   || "").trim();
  const entityId = (searchParams.get("entityId") || "").trim();
  const status   = (searchParams.get("status")   || "").trim(); // pending | approved | rejected | joined_elsewhere | left ...

  // 1) حسب userId
  if (userId) {
    const rows = db.prepare(`
      SELECT * FROM join_requests
       WHERE userId = ?
         ${status ? `AND status = ?` : ``}
   ORDER BY datetime(createdAt) DESC
    `).all(...(status ? [userId, status] : [userId])) as any[];
    return NextResponse.json(rows, { status: 200 });
  }

  // 2) حسب entityId
  if (entityId) {
    const rows = db.prepare(`
      SELECT * FROM join_requests
       WHERE entityId = ?
         ${status ? `AND status = ?` : ``}
   ORDER BY datetime(createdAt) DESC
    `).all(...(status ? [entityId, status] : [entityId])) as any[];
    return NextResponse.json(rows, { status: 200 });
  }

  // 3) entityManager بدون entityId → كل الكيانات التي يديرها
  if (s?.role === "entityManager") {
    const managed = db.prepare(`SELECT id FROM entities WHERE managerUserId = ?`).all(s.id) as { id: string }[];
    if (managed.length === 0) return NextResponse.json([], { status: 200 });

    const ids = managed.map(r => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const rows = db.prepare(`
      SELECT * FROM join_requests
       WHERE entityId IN (${placeholders})
         ${status ? `AND status = ?` : ``}
   ORDER BY datetime(createdAt) DESC
    `).all(...(status ? [...ids, status] : ids)) as any[];
    return NextResponse.json(rows, { status: 200 });
  }

  // 4) unionSupervisor
  if (s?.role === "unionSupervisor") {
    if (status) {
      const rows = db.prepare(`
        SELECT * FROM join_requests
         WHERE status = ?
     ORDER BY datetime(createdAt) DESC
      `).all(status) as any[];
      return NextResponse.json(rows, { status: 200 });
    }
    const rows = db.prepare(`SELECT * FROM join_requests ORDER BY datetime(createdAt) DESC`).all() as any[];
    return NextResponse.json(rows, { status: 200 });
  }

  // 5) باقي الأدوار بدون محددات
  return NextResponse.json([], { status: 200 });
}

/**
 * POST: إنشاء طلب انضمام (مثل ما كان)
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDB();
    const session = (await getSession(req)) as Session | null;
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

    // تنظيف حالات سابقة موافَقة لم تُسجّل كعضوية
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
