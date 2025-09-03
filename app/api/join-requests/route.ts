import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import type { JoinRequest } from "@/lib/types";

/**
 * join_requests:
 * (id, userId, userName, userEmail, entityId, entityName, note, status, createdAt, decidedAt, decidedBy)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const entityId = searchParams.get("entityId");
  const userId = searchParams.get("userId");

  const db = getDB();
  const where: string[] = [];
  const params: any[] = [];

  if (status)   { where.push(`status = ?`);   params.push(status); }
  if (entityId) { where.push(`entityId = ?`); params.push(entityId); }
  if (userId)   { where.push(`userId = ?`);   params.push(userId); }

  const sql = `
    SELECT id, userId, userName, userEmail, entityId, entityName, note,
           status, createdAt, decidedAt, decidedBy
      FROM join_requests
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY datetime(createdAt) DESC
  `;
  const rows = getDB().prepare(sql).all(...params) as JoinRequest[];

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, userName, userEmail, entityId, entityName, note } = body || {};
  if (!userId || !userName || !userEmail || !entityId || !entityName) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const db = getDB();

  // 1) لو المستخدم مثبت بالفعل على نفس الكيان في جدول users → امنع
  const userRow = db.prepare(`SELECT entityId FROM users WHERE id=?`).get(userId) as { entityId?: string | null } | undefined;
  if (userRow?.entityId && String(userRow.entityId) === String(entityId)) {
    return NextResponse.json({ error: "أنت بالفعل عضو في هذا الكيان" }, { status: 409 });
  }

  // 2) امنع التقديم لو فيه طلب pending **أو** approved لنفس الكيان
  const dup = db.prepare(`
    SELECT status FROM join_requests
     WHERE userId=? AND entityId=? AND status IN ('pending','approved')
     LIMIT 1
  `).get(userId, entityId) as { status?: "pending" | "approved" } | undefined;

  if (dup?.status === "approved") {
    return NextResponse.json({ error: "أنت بالفعل عضو في هذا الكيان" }, { status: 409 });
  }
  if (dup?.status === "pending") {
    return NextResponse.json({ error: "عندك طلب قيد المراجعة لنفس الكيان" }, { status: 409 });
  }

  // 3) إنشاء الطلب
  const id = uid();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO join_requests
      (id, userId, userName, userEmail, entityId, entityName, note, status, createdAt)
    VALUES
      (?,  ?,      ?,        ?,         ?,        ?,          ?,    'pending', ?)
  `).run(id, userId, userName, userEmail, entityId, entityName, note ?? null, now);

  const row = db.prepare(`
    SELECT id, userId, userName, userEmail, entityId, entityName, note,
           status, createdAt, decidedAt, decidedBy
      FROM join_requests WHERE id=?
  `).get(id) as JoinRequest;

  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, action, decidedBy } = body || {};
  if (!id || !action) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const db = getDB();
  const row = db.prepare(`SELECT * FROM join_requests WHERE id=?`).get(id) as any;
  if (!row) {
    return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "تم اتخاذ قرار مسبقاً" }, { status: 409 });
  }

  const now = new Date().toISOString();
  let newStatus: "approved" | "rejected";
  if (action === "approve") newStatus = "approved";
  else if (action === "reject") newStatus = "rejected";
  else return NextResponse.json({ error: "إجراء غير صحيح" }, { status: 400 });

  const tx = db.transaction(() => {
    // تحديث حالة الطلب
    db.prepare(`
      UPDATE join_requests
         SET status=?, decidedAt=?, decidedBy=?
       WHERE id=?
    `).run(newStatus, now, decidedBy ?? "admin", id);

    // لو موافقة: ثبّت المستخدم على الكيان
    if (newStatus === "approved") {
      db.prepare(`UPDATE users SET entityId=? WHERE id=?`).run(row.entityId, row.userId);

      // (اختياري) ضيف العضو في members لو مش موجود
      const memberExists = db.prepare(`
        SELECT 1 FROM members WHERE entityId=? AND (email=? OR name=?) LIMIT 1
      `).get(row.entityId, row.userEmail, row.userName);
      if (!memberExists) {
        db.prepare(`
          INSERT INTO members (id, name, email, phone, entityId, roleInEntity, joinedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(uid(), row.userName, row.userEmail, null, row.entityId, "member", now);
      }
    }
  });

  tx();

  const updated = db.prepare(`
    SELECT id, userId, userName, userEmail, entityId, entityName, note,
           status, createdAt, decidedAt, decidedBy
      FROM join_requests WHERE id=?
  `).get(id) as JoinRequest;

  return NextResponse.json(updated);
}
