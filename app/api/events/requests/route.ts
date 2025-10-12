export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

function normalizeFiles(files: any) {
  if (files && typeof files === "object" && !Array.isArray(files)) {
    return {
      budgetPdf: files.budgetPdf || null,
      miniPlanPdf: files.miniPlanPdf || null,
      programPdf: files.programPdf || null,
      briefPlanPdf: files.briefPlanPdf || null,
    };
  }
  if (Array.isArray(files)) {
    const out: any = {};
    for (const it of files) {
      const label = String(it?.label || "");
      const url = it?.url ? String(it.url) : null;
      if (!url) continue;
      if (/ميزانية|budget/i.test(label)) out.budgetPdf = url;
      else if (/برنامج|program|timeline/i.test(label)) out.programPdf = url;
      else if (/ترويج|brief/i.test(label)) out.briefPlanPdf = url;
      else if (/خطة/i.test(label) || /plan/i.test(label)) out.miniPlanPdf = url;
    }
    return out;
  }
  return {};
}

export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const title = String(body?.name || body?.title || "").trim();
  if (!title) return NextResponse.json({ error: "اسم الفعالية مطلوب" }, { status: 400 });

  const db = getDB();

  const isSupervisor = s.role === "unionSupervisor";
  const isManager = s.role === "entityManager";

  let targetEntityId: string | null = null;

  if (isSupervisor) {
    if (body?.public) {
      targetEntityId = null;
    } else {
      const eid = String(body?.entityId || "");
      if (!eid) return NextResponse.json({ error: "اختر الكيان أو اجعلها فعالية عامة" }, { status: 400 });
      targetEntityId = eid;
    }
  } else if (isManager) {
    targetEntityId = String(s.entityId || "");
    if (!targetEntityId) return NextResponse.json({ error: "المدير غير مرتبط بكيان" }, { status: 403 });
  } else {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const eventId = uid();
  const payload = {
    name: title,
    date: body?.date || null,
    attendeesTarget: Number(body?.attendeesTarget || 0),
    venue: body?.venue || "",
    goals: body?.goals || "",
    audience: body?.audience || "",
    speakers: body?.speakers || "",
    supportType: body?.supportType || "",
    files: normalizeFiles(body?.files),
  };

  try {
    const tx = (db as any).transaction(() => {
      db.prepare(`
        INSERT INTO events (id, title, date, status, entityId, createdBy, createdByName, createdByRole, createdAt)
        VALUES (?, ?, ?, 'requested', ?, ?, ?, ?, datetime('now'))
      `).run(
        eventId,
        title,
        payload.date || null,
        targetEntityId,
        String(s.id),
        String(s.name || s.email || "مستخدم"),
        s.role
      );

      db.prepare(`
        INSERT INTO event_requests (id, eventId, payload, createdAt)
        VALUES (?, ?, ?, datetime('now'))
      `).run(uid(), eventId, JSON.stringify(payload));
    });
    tx();
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر إرسال الطلب" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: eventId });
}
