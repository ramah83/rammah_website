export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, type Session } from "@/lib/server/session";

type FilesObj = {
  budgetPdf?: string | null;
  miniPlanPdf?: string | null;
  programPdf?: string | null;
};

function normalizeFiles(files: any): FilesObj {
  if (files && typeof files === "object" && !Array.isArray(files)) {
    return {
      budgetPdf: files.budgetPdf || null,
      miniPlanPdf: files.miniPlanPdf || null,
      programPdf: files.programPdf || null,
    };
  }
  if (Array.isArray(files)) {
    let out: FilesObj = {};
    for (const it of files) {
      const label = String(it?.label || "").trim();
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

function canSee(sess: Session | null, entId: string) {
  if (!sess) return false;
  if (sess.role === "unionSupervisor") return true;
  if (sess.role === "entityManager") return true;
  if (sess.role === "user")          return String(sess.entityId || "") === String(entId);
  return false;
}

export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!["entityManager", "unionSupervisor"].includes(s.role)) {
    return NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 });
  }

  let b: any = {};
  try { b = await req.json(); } catch {}

  const isPublic = Boolean(b?.public);
  const entityId = String(b?.entityId || "").trim();

  if (!isPublic) {
    if (!entityId) return NextResponse.json({ error: "entityId مطلوب" }, { status: 400 });
    if (s.role === "entityManager" && String(s.entityId || "") !== entityId) {
      return NextResponse.json({ error: "غير مصرح: يجب التقديم على كيانك فقط" }, { status: 403 });
    }
  } else {
    if (s.role !== "unionSupervisor") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  const db = getDB();

  if (!isPublic) {
    const ent = db.prepare(`SELECT id, name, status FROM entities WHERE id=?`).get(entityId) as any;
    if (!ent) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });
    if (ent.status && ent.status !== "approved") {
      return NextResponse.json({ error: "لا يمكن التقديم لكيان غير معتمد" }, { status: 400 });
    }
  }

  const payload = {
    name: String(b?.name || "").trim(),
    date: b?.date || null,
    attendeesTarget: Number(b?.attendeesTarget || 0),
    venue: b?.venue || "",
    goals: b?.goals || "",
    audience: b?.audience || "",
    speakers: b?.speakers || "",
    supportType: b?.supportType || "",
    files: normalizeFiles(b?.files),
  };

  const requestId = uid();
  db.prepare(`
    INSERT INTO event_requests (id, eventId, entityId, createdBy, payload, createdAt)
    VALUES (?, NULL, ?, ?, ?, datetime('now'))
  `).run(requestId, isPublic ? null : entityId, s.id, JSON.stringify(payload));

  const eventId = uid();
  db.prepare(`
    INSERT INTO events (id, title, date, status, entityId, createdBy, createdByName, createdByRole)
    VALUES (?, ?, ?, 'requested', ?, ?, ?, ?)
  `).run(
    eventId,
    payload.name,
    payload.date || null,
    isPublic ? null : entityId,
    s.id,
    (s.name || s.email || "—"),
    String(s.role)
  );

  db.prepare(`UPDATE event_requests SET eventId=? WHERE id=?`).run(eventId, requestId);

  return NextResponse.json({ ok: true, requestId, eventId }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const url = new URL(req.url);
  const eventId  = url.searchParams.get("eventId");
  const entityId = url.searchParams.get("entityId");

  if (eventId) {
    const ev = db.prepare(`SELECT id, entityId FROM events WHERE id=?`).get(eventId) as any;
    if (!ev) return NextResponse.json({ error: "فعالية غير موجودة" }, { status: 404 });

    if (ev.entityId == null) {
      if (s.role === "user" || s.role === "entityManager" || s.role === "unionSupervisor") {
      } else {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    } else {
      if (!canSee(s, String(ev.entityId || ""))) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
    }

    const row = db.prepare(`
      SELECT id, eventId, entityId, payload, createdAt
      FROM event_requests
      WHERE eventId=?
      ORDER BY datetime(createdAt) DESC
      LIMIT 1
    `).get(eventId) as any;

    if (!row) return NextResponse.json({ payload: null });

    let payload: any = {};
    try { payload = JSON.parse(row.payload || "{}"); } catch {}
    const normalized = {
      name: payload?.name ?? payload?.title ?? "",
      date: payload?.date || null,
      attendeesTarget: Number.isFinite(Number(payload?.attendeesTarget)) ? Number(payload?.attendeesTarget) : null,
      venue: payload?.venue || "",
      goals: payload?.goals || "",
      audience: payload?.audience || "",
      speakers: payload?.speakers || "",
      supportType: payload?.supportType || "",
      files: normalizeFiles(payload?.files),
    };

    return NextResponse.json({ ...row, payload: normalized });
  }

  if (entityId) {
    if (!canSee(s, String(entityId))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const rows = db.prepare(`
      SELECT id, eventId, entityId, payload, createdAt
      FROM event_requests
      WHERE entityId=?
      ORDER BY datetime(createdAt) DESC
      LIMIT 50
    `).all(entityId) as any[];

    const mapped = (rows || []).map(r => {
      let payload: any = {};
      try { payload = JSON.parse(r.payload || "{}"); } catch {}
      return {
        ...r,
        payload: {
          name: payload?.name ?? payload?.title ?? "",
          date: payload?.date || null,
          attendeesTarget: Number.isFinite(Number(payload?.attendeesTarget)) ? Number(payload?.attendeesTarget) : null,
          venue: payload?.venue || "",
          goals: payload?.goals || "",
          audience: payload?.audience || "",
          speakers: payload?.speakers || "",
          supportType: payload?.supportType || "",
          files: normalizeFiles(payload?.files),
        }
      };
    });

    return NextResponse.json(mapped ?? []);
  }

  return NextResponse.json([]);
}
