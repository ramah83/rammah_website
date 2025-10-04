// app/api/promotion-request/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const me = db.prepare(`SELECT id, role FROM users WHERE id=?`).get(s.id) as any;
  if (!me) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  if (me.role !== "unionSupervisor")
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "").toLowerCase(); // approve | reject
  const note = body?.note ? String(body.note) : null;
  if (!["approve","reject"].includes(action))
    return NextResponse.json({ error: "إجراء غير مدعوم" }, { status: 400 });

  try {
    const reqRow = db.prepare(`SELECT * FROM admin_promotion_requests WHERE id=?`).get(params.id) as any;
    if (!reqRow) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    if (reqRow.status !== "pending")
      return NextResponse.json({ error: "لا يمكن التعديل على طلب غير معلق" }, { status: 409 });

    const decidedStatus = action === "approve" ? "approved" : "rejected";

    const tx = (db as any).transaction(() => {
      db.prepare(
        `UPDATE admin_promotion_requests
            SET status=?, decidedAt=datetime('now'), decidedBy=?, note=COALESCE(?, note)
          WHERE id=?`
      ).run(decidedStatus, s.id, note, params.id);

      if (action === "approve") {
        // لو عايز ترقي المتقدّم فعلاً
        db.prepare(`UPDATE users SET role='unionSupervisor' WHERE id=?`).run(reqRow.applicantUserId);
      }
    });
    tx();

    const updated = db.prepare(
      `SELECT apr.*, u.name AS applicantName, u.email AS applicantEmail
         FROM admin_promotion_requests apr
         LEFT JOIN users u ON u.id = apr.applicantUserId
        WHERE apr.id=?`
    ).get(params.id);

    return NextResponse.json(updated, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تنفيذ العملية" }, { status: 500 });
  }
}
