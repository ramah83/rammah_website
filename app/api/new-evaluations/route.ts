export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS,HEAD",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
export async function HEAD() { return new NextResponse(null, { status: 200 }); }

export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "user") return NextResponse.json({ error: "مسموح للمستخدم فقط" }, { status: 403 });

  let b: any = {};
  try { b = await req.json(); } catch {}
  const eventId = String(b?.eventId || "").trim();
  if (!eventId) return NextResponse.json({ error: "eventId مطلوب" }, { status: 400 });

  const attendees  = Math.max(0, Number.isFinite(Number(b?.attendees)) ? Number(b?.attendees) : 0);
  const goalsScore = Math.max(1, Math.min(5, Number.isFinite(Number(b?.goalsScore)) ? Number(b?.goalsScore) : 0));
  const notes      = String(b?.notes || "");

  const filesObj   = (b?.files && typeof b.files === "object") ? b.files : {};
  const photos: string[] = Array.isArray(filesObj?.photos) ? filesObj.photos.map((u: any) => String(u)).filter(Boolean) : [];
  const attendance = filesObj?.attendance ? String(filesObj.attendance) : null;
  const survey     = filesObj?.survey ? String(filesObj.survey) : null;

  const db = getDB();

  const ev = db.prepare(`SELECT id, entityId, title, date FROM events WHERE id=?`).get(eventId) as any;
  if (!ev) return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });

  if (ev.entityId != null) {
    const sameEntity = String(s.entityId || "") && String(s.entityId) === String(ev.entityId || "");
    const isMember = db.prepare(
      `SELECT 1 FROM entity_members WHERE entityId=? AND userId=? LIMIT 1`
    ).get(ev.entityId, s.id);
    const isApprovedJoin = db.prepare(
      `SELECT 1 FROM join_requests WHERE entityId=? AND userId=? AND status='approved' LIMIT 1`
    ).get(ev.entityId, s.id);
    if (!sameEntity && !isMember && !isApprovedJoin) {
      return NextResponse.json({ error: "غير مسموح: لست ضمن هذا الكيان" }, { status: 403 });
    }
  }

  const dup = db.prepare(
    `SELECT 1 FROM event_evaluations WHERE eventId=? AND submittedBy=? LIMIT 1`
  ).get(eventId, s.id);
  if (dup) return NextResponse.json({ error: "لقد قيّمت هذه الفعالية من قبل" }, { status: 409 });

  let attendeesTarget: number | null = null;
  try {
    const reqRow = db.prepare(`
      SELECT payload
        FROM event_requests
       WHERE eventId=?
       ORDER BY datetime(createdAt) DESC
       LIMIT 1
    `).get(eventId) as any;
    if (reqRow?.payload) {
      const payload = JSON.parse(reqRow.payload);
      const t = Number(payload?.attendeesTarget);
      if (Number.isFinite(t)) attendeesTarget = t;
    }
  } catch {}

  if (attendeesTarget !== null && attendees > attendeesTarget) {
    return NextResponse.json(
      { error: `عدد الحضور المُدخل (${attendees}) أكبر من العدد المستهدف (${attendeesTarget}).` },
      { status: 400 }
    );
  }

  const payload = {
    event: { id: ev.id, title: ev.title, date: ev.date, entityId: ev.entityId },
    submittedBy: { id: s.id, name: s.name, email: s.email },
    scores: { goals: goalsScore },
    attendees,
    notes,
    files: { photos, attendance, survey },
  };

  const id = uid();
  db.prepare(`
    INSERT INTO event_evaluations (id, eventId, entityId, submittedBy, payload, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, ev.id, ev.entityId || null, s.id, JSON.stringify(payload));

  try { db.prepare(`UPDATE events SET status='evaluated' WHERE id=?`).run(eventId); } catch {}

  return NextResponse.json({ ok: true, id });
}

export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const url      = new URL(req.url);
  const eventId  = url.searchParams.get("eventId");
  const entityId = url.searchParams.get("entityId");

  if (s.role === "entityManager" || s.role === "unionSupervisor") {
    let rows: any[] = [];
    if (eventId) {
      rows = db.prepare(`
        SELECT id, eventId, entityId, submittedBy, payload, createdAt
        FROM event_evaluations
        WHERE eventId=?
        ORDER BY datetime(createdAt) DESC
      `).all(eventId);
    } else if (entityId) {
      rows = db.prepare(`
        SELECT id, eventId, entityId, submittedBy, payload, createdAt
        FROM event_evaluations
        WHERE entityId=?
        ORDER BY datetime(createdAt) DESC
      `).all(entityId);
    } else {
      rows = db.prepare(`
        SELECT id, eventId, entityId, submittedBy, payload, createdAt
        FROM event_evaluations
        ORDER BY datetime(createdAt) DESC
      `).all();
    }
    return NextResponse.json(rows ?? []);
  }

  let rows: any[] = [];
  if (eventId) {
    rows = db.prepare(`
      SELECT id, eventId, entityId, submittedBy, payload, createdAt
      FROM event_evaluations
      WHERE eventId=?
      ORDER BY datetime(createdAt) DESC
    `).all(eventId);
  } else if (entityId) {
    rows = db.prepare(`
      SELECT id, eventId, entityId, submittedBy, payload, createdAt
      FROM event_evaluations
      WHERE entityId=?
      ORDER BY datetime(createdAt) DESC
    `).all(entityId);
  } else {
    rows = db.prepare(`
      SELECT id, eventId, entityId, submittedBy, payload, createdAt
      FROM event_evaluations
      ORDER BY datetime(createdAt) DESC
    `).all();
  }
  return NextResponse.json(rows ?? []);
}
