export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  try {
    // هات دوري
    const me = db.prepare(`SELECT role FROM users WHERE id=?`).get(s.id) as any;

    // باراميترات اختيارية
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") || "mine";        // mine | all
    const status = url.searchParams.get("status") || "pending";   // pending | approved | rejected
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);

    // لو أنا مشرف وبطلب غير "mine" -> رجّع قائمة بحسب الحالة
    if (me?.role === "unionSupervisor" && scope !== "mine") {
      const rows = db.prepare(
        `SELECT apr.*, u.name AS applicantName, u.email AS applicantEmail
           FROM admin_promotion_requests apr
           LEFT JOIN users u ON u.id = apr.applicantUserId
          WHERE apr.status = ?
       ORDER BY datetime(apr.createdAt) DESC
          LIMIT ?`
      ).all(status, limit);
      return NextResponse.json(rows, { status: 200 });
    }

    // السلوك القديم: آخر طلب ليا أنا
    const row = db.prepare(
      `SELECT apr.*, u.name AS applicantName, u.email AS applicantEmail
         FROM admin_promotion_requests apr
         LEFT JOIN users u ON u.id = apr.applicantUserId
        WHERE apr.applicantUserId = ?
     ORDER BY datetime(apr.createdAt) DESC
        LIMIT 1`
    ).get(s.id);

    return NextResponse.json(row || null, { status: 200 });
  } catch {
    return NextResponse.json({ error: "تعذر التحميل" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  let body: any = {};
  try { body = await req.json(); } catch {}
  const note = body?.note ? String(body.note) : null;

  try {
    const me = db.prepare(`SELECT role FROM users WHERE id=?`).get(s.id) as any;
    if (!me) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    if (me.role === "unionSupervisor") return NextResponse.json({ error: "أنت بالفعل مسؤول اتحاد" }, { status: 400 });

    const existing = db
      .prepare(`SELECT * FROM admin_promotion_requests WHERE applicantUserId=? AND status='pending' ORDER BY datetime(createdAt) DESC LIMIT 1`)
      .get(s.id);
    if (existing) return NextResponse.json({ error: "لديك طلب معلق", request: existing }, { status: 409 });

    const id = uid();
    db.prepare(
      `INSERT INTO admin_promotion_requests (id, applicantUserId, status, createdAt, note) 
       VALUES (?, ?, 'pending', datetime('now'), ?)`
    ).run(id, s.id, note);

    const row = db
      .prepare(
        `SELECT apr.*, u.name AS applicantName, u.email AS applicantEmail
           FROM admin_promotion_requests apr
           LEFT JOIN users u ON u.id = apr.applicantUserId
          WHERE apr.id=?`
      )
      .get(id);

    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر إنشاء الطلب" }, { status: 500 });
  }
}
