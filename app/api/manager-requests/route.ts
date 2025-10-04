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

  
  db.exec(`
    CREATE TABLE IF NOT EXISTS manager_requests (
      id TEXT PRIMARY KEY,
      entityId TEXT NOT NULL,
      applicantUserId TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,  -- pending | approved | rejected
      createdAt TEXT NOT NULL,
      decidedAt TEXT,
      decidedBy TEXT,
      note TEXT
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mreq_entity ON manager_requests(entityId);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mreq_user   ON manager_requests(applicantUserId);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_mreq_status ON manager_requests(status);`);

  const q = new URL(req.url).searchParams.get("status") ?? "pending";
  const allowed = new Set(["pending", "approved", "rejected", "all"]);
  const status = allowed.has(q) ? q : "pending";

  const where = status === "all" ? "" : "WHERE mr.status = ?";
  const params = status === "all" ? [] : [status];

  const rows = db.prepare(`
    SELECT mr.*,
           u.name  AS applicantName,
           u.email AS applicantEmail,
           e.name  AS entityName
      FROM manager_requests mr
 LEFT JOIN users u ON u.id = mr.applicantUserId
 LEFT JOIN entities e ON e.id = mr.entityId
      ${where}
  ORDER BY datetime(mr.createdAt) DESC
  `).all(...params);

  return NextResponse.json(rows ?? []);
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
  const note = (body?.note ? String(body.note) : null);

  const reqRow = db.prepare(`SELECT * FROM manager_requests WHERE id=?`).get(id) as any;
  if (!reqRow || reqRow.status !== "pending") {
    return NextResponse.json({ error: "الطلب غير موجود أو غير مُعلّق" }, { status: 404 });
  }

  if (decision === "reject") {
    db.prepare(`UPDATE manager_requests SET status='rejected', decidedAt=datetime('now'), decidedBy=?, note=? WHERE id=?`)
      .run(s.id, note, id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }
  if (decision !== "approve") {
    return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
  }

  try {
    const tx = (db as any).transaction(() => {
      
      db.prepare(`UPDATE manager_requests SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=? WHERE id=?`)
        .run(s.id, note, id);

      
      db.prepare(`UPDATE users SET role='entityManager', entityId=? WHERE id=?`)
        .run(reqRow.entityId, reqRow.applicantUserId);

      
      const cur = db.prepare(`SELECT managerUserId FROM entities WHERE id=?`).get(reqRow.entityId) as any;
      if (!cur?.managerUserId) {
        db.prepare(`UPDATE entities SET managerUserId=? WHERE id=?`).run(reqRow.applicantUserId, reqRow.entityId);
      }
    });
    tx();
    return NextResponse.json({ ok: true, status: "approved" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تطبيق القرار" }, { status: 500 });
  }
}
