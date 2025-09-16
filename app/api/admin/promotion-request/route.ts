export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "unionSupervisor") return NextResponse.json({ error: "ممنوع" }, { status: 403 });

  const db = getDB();
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_promotion_requests (
        id TEXT PRIMARY KEY,
        applicantUserId TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        decidedAt TEXT,
        decidedBy TEXT,
        note TEXT
      );
    `);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_apr_status ON admin_promotion_requests(status);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_apr_user   ON admin_promotion_requests(applicantUserId);`);
  } catch {
    return NextResponse.json({ error: "تعذر تهيئة الجدول" }, { status: 500 });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("status") ?? "pending";
  const allowed = new Set(["pending", "approved", "rejected", "all"]);
  const status = allowed.has(raw) ? raw : "pending";

  const where = status === "all" ? "" : "WHERE apr.status = ?";
  const params = status === "all" ? [] : [status];

  try {
    const rows = db.prepare(`
      SELECT apr.*, u.name AS applicantName, u.email AS applicantEmail
      FROM admin_promotion_requests apr
      LEFT JOIN users u ON u.id = apr.applicantUserId
      ${where}
      ORDER BY datetime(apr.createdAt) DESC
    `).all(...params);
    return NextResponse.json(rows ?? []);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "unionSupervisor") return NextResponse.json({ error: "القرار حصري لمسؤول الاتحاد" }, { status: 403 });

  const db = getDB();
  let body: any = {};
  try { body = await req.json(); } catch {}

  const id = String(body?.id || "");
  const decision = String(body?.decision || "");
  const note = body?.note ? String(body.note) : null;

  const row = db.prepare(`SELECT * FROM admin_promotion_requests WHERE id=?`).get(id) as any;
  if (!row || row.status !== "pending") {
    return NextResponse.json({ error: "الطلب غير موجود أو غير مُعلّق" }, { status: 404 });
  }

  if (decision === "reject") {
    db.prepare(`UPDATE admin_promotion_requests SET status='rejected', decidedAt=datetime('now'), decidedBy=?, note=? WHERE id=?`)
      .run(s.id, note, id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (decision !== "approve") {
    return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
  }

  try {
    const tx = (db as any).transaction(() => {
      db.prepare(`UPDATE admin_promotion_requests SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=? WHERE id=?`)
        .run(s.id, note, id);
      db.prepare(`UPDATE users SET role='unionSupervisor', entityId=NULL WHERE id=?`).run(row.applicantUserId);
    });
    tx();
    return NextResponse.json({ ok: true, status: "approved" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تطبيق القرار" }, { status: 500 });
  }
}
