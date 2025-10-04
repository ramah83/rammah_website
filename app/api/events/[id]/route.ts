export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

function normalizeFiles(files: any) {
  if (files && typeof files === "object" && !Array.isArray(files)) {
    return {
      budgetPdf: files.budgetPdf || null,
      miniPlanPdf: files.miniPlanPdf || null,
      programPdf: files.programPdf || null,
    };
  }
  if (Array.isArray(files)) {
    const out: any = {};
    for (const it of files) {
      const label = String(it?.label || "");
      const url = it?.url ? String(it.url) : null;
      if (!url) continue;
      if (/ميزانية|budget/i.test(label)) out.budgetPdf = url;
      else if (/خطة|plan/i.test(label)) out.miniPlanPdf = url;
      else if (/برنامج|program/i.test(label)) out.programPdf = url;
    }
    return out;
  }
  return {};
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const ev = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id) as any;
  if (!ev) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const reqRow = db.prepare(`
    SELECT payload, createdAt
      FROM event_requests
     WHERE eventId=?
     ORDER BY datetime(createdAt) DESC
     LIMIT 1
  `).get(params.id) as any;

  let details: any = {};
  try {
    const raw = reqRow?.payload ? JSON.parse(reqRow.payload) : {};
    details = {
      ...raw,
      files: normalizeFiles(raw?.files),
    };
  } catch {
    details = {};
  }

  const evalCountRow = db.prepare(
    `SELECT COUNT(*) AS c FROM event_evaluations WHERE eventId=?`
  ).get(params.id) as any;

  const organizerName = ev?.approvedByName || ev?.createdByName || "—";

  return NextResponse.json({
    ...ev,
    organizerName,
    details,
    evalCount: Number(evalCountRow?.c || 0),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s || !["unionSupervisor", "entityManager"].includes(s.role)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const db = getDB();
  const ex = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id) as any;
  if (!ex) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (s.role === "entityManager" && String(ex.entityId || "") !== String(s.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: تعديل داخل كيانك فقط" }, { status: 403 });
  }

  let b: any = {};
  try { b = await req.json(); } catch {}

  const allowed = ["requested", "draft", "approved", "rejected", "cancelled", "done", "evaluated"];
  const status = b?.status ? String(b.status) : ex.status;
  if (b?.status && !allowed.includes(status)) {
    return NextResponse.json({ error: "status غير صالح" }, { status: 400 });
  }

  const next = {
    title:  b?.title  ?? ex.title,
    date:   b?.date   ?? ex.date,
    status,
    entityId: b?.entityId ?? ex.entityId,
  };

  if (s.role === "entityManager" && String(next.entityId || "") !== String(ex.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: لا يمكنك نقل الفعالية لكيان آخر" }, { status: 403 });
  }

  const isApproving = ex.status !== "approved" && status === "approved" && s.role === "unionSupervisor";

  const sql = `
    UPDATE events
       SET title=?,
           date=?,
           status=?,
           entityId=?${isApproving ? `,
           approvedBy=?,
           approvedByName=?,
           approvedAt=datetime('now')` : ``}
     WHERE id=?`;
  const args: any[] = [next.title, next.date, next.status, next.entityId];
  if (isApproving) args.push(s.id, (s.name || s.email || "—"));
  args.push(params.id);

  db.prepare(sql).run(...args);

  const after = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id);
  return NextResponse.json(after);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s || !["unionSupervisor", "entityManager"].includes(s.role)) {
    return NextResponse.json({ error: "ممنوع: الصلاحيات غير كافية" }, { status: 403 });
  }

  const db = getDB();
  const ex = db.prepare(`SELECT * FROM events WHERE id=?`).get(params.id) as any;
  if (!ex) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  if (s.role === "entityManager" && String(ex.entityId || "") !== String(s.entityId || "")) {
    return NextResponse.json({ error: "غير مصرح: حذف داخل كيانك فقط" }, { status: 403 });
  }

  db.prepare(`DELETE FROM events WHERE id=?`).run(params.id);
  return NextResponse.json({ ok: true });
}
