// app/api/new-evaluations/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

/* ---------------------------- CORS/HEAD ---------------------------- */
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

/* ---------------------- Helpers (normalization) -------------------- */
function toNum(v: any): number | null {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** نوحِّد payload للتخزين بحيث توافق واجهة العرض */
function normalizeForStore(b: any) {
  const safe = b || {};

  // metrics (أرقام التنفيذ)
  const attendees =
    toNum(safe?.metrics?.attendees) ??
    toNum(safe.attendees) ??
    toNum(safe.attendance) ??
    toNum(safe.attendanceCount);

  const metrics = {
    attendees,
    male:          toNum(safe?.metrics?.male)          ?? toNum(safe.male),
    female:        toNum(safe?.metrics?.female)        ?? toNum(safe.female),
    volunteers:    toNum(safe?.metrics?.volunteers)    ?? toNum(safe.volunteers) ?? toNum(safe.volunteersCount),
    durationHours: toNum(safe?.metrics?.durationHours) ?? toNum(safe.durationHours) ?? toNum(safe.duration),
  };

  // ratings (1–5)
  const ratings = {
    organization: toNum(safe?.ratings?.organization) ?? toNum(safe.orgScore),
    content:      toNum(safe?.ratings?.content)      ?? toNum(safe.contentScore),
    speakers:     toNum(safe?.ratings?.speakers)     ?? toNum(safe.speakersScore),
    logistics:    toNum(safe?.ratings?.logistics)    ?? toNum(safe.logisticsScore),
    media:        toNum(safe?.ratings?.media)        ?? toNum(safe.mediaScore),
    overall:      toNum(safe?.ratings?.overall)      ?? toNum(safe.overallScore),
    // توافق للخلف
    goalsScore:   toNum(safe?.ratings?.goalsScore)   ?? toNum(safe.goalsScore),
  };

  // goals
  const goals = {
    achieved:
      typeof safe?.goals?.achieved === "boolean"
        ? safe.goals.achieved
        : (String(safe.goalsAchieved || "").toLowerCase() === "yes"),
    percent: toNum(safe?.goals?.percent) ?? toNum(safe.goalsPercent),
  };

  // notes
  const notes = {
    general:      String(safe?.notes?.general ?? safe.notes ?? ""),
    positives:    String(safe?.notes?.positives ?? safe.positives ?? ""),
    challenges:   String(safe?.notes?.challenges ?? safe.challenges ?? ""),
    improvements: String(safe?.notes?.improvements ?? safe.improvements ?? ""),
  };

  // links
  const links = Array.isArray(safe?.links) ? safe.links.filter(Boolean).map(String) : [];

  // files
  const filesSrc = safe?.files && typeof safe.files === "object" ? safe.files : {};
  const files = {
    photos: Array.isArray(filesSrc?.photos)
      ? filesSrc.photos.map(String)
      : Array.isArray(safe?.photoUrls) ? safe.photoUrls.map(String) : [],
    attendance:  filesSrc?.attendance  ?? (safe.attendanceUrl  || null),
    survey:      filesSrc?.survey      ?? (safe.surveyUrl      || null),
    finalReport: filesSrc?.finalReport ?? (safe.finalReportUrl || null),
    budgetReport:filesSrc?.budgetReport?? (safe.budgetReportUrl|| null),
  };

  return { metrics, ratings, goals, notes, links, files };
}

/* ------------------------------- POST ------------------------------ */
/** يحفظ تقييم جديد بشكل موحّد يمكن قراءته في صفحة المشرف/مدير الكيان */
export async function POST(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "user") return NextResponse.json({ error: "مسموح للمستخدم فقط" }, { status: 403 });

  let b: any = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Payload غير صالح" }, { status: 400 }); }

  const eventId = String(b?.eventId || "").trim();
  if (!eventId) return NextResponse.json({ error: "eventId مطلوب" }, { status: 400 });

  const db = getDB();

  // تأكد من وجود الحدث
  const ev = db.prepare(`SELECT id, entityId, title, date FROM events WHERE id=?`).get(eventId) as any;
  if (!ev) return NextResponse.json({ error: "الفعالية غير موجودة" }, { status: 404 });

  // لو الحدث تابع لكيان محدد: لازم المُستخدم يكون ضمن الكيان (عضو/طلب انضمام موافَق)
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

  // منع التكرار لنفس المستخدم على نفس الحدث (يمكنك استبدالها بحذف القديم ثم الإدخال)
  const dup = db.prepare(
    `SELECT 1 FROM event_evaluations WHERE eventId=? AND submittedBy=? LIMIT 1`
  ).get(eventId, s.id);
  if (dup) return NextResponse.json({ error: "لقد قيّمت هذه الفعالية من قبل" }, { status: 409 });

  // تحقق العدد المستهدف (من آخر طلب أو من تفاصيل الحدث لو متاحة)
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
    } else {
      const evDetails = db.prepare(`SELECT details FROM events WHERE id=?`).get(eventId) as any;
      if (evDetails?.details) {
        const d = JSON.parse(evDetails.details);
        const t = Number(d?.attendeesTarget);
        if (Number.isFinite(t)) attendeesTarget = t;
      }
    }
  } catch {}

  const normalized = normalizeForStore(b);
  const attendees = normalized.metrics.attendees ?? 0;
  if (attendeesTarget !== null && attendees > attendeesTarget) {
    return NextResponse.json(
      { error: `عدد الحضور المُدخل (${attendees}) أكبر من العدد المستهدف (${attendeesTarget}).` },
      { status: 400 }
    );
  }

  // خزِّن التقييم (payload موحّد)
  const id = uid();
  db.prepare(`
    INSERT INTO event_evaluations (id, eventId, entityId, submittedBy, payload, createdAt)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(id, ev.id, ev.entityId || null, s.id, JSON.stringify(normalized));

  // (اختياري) حدّث حالة الحدث
  try { db.prepare(`UPDATE events SET status='evaluated' WHERE id=?`).run(eventId); } catch {}

  return NextResponse.json({ ok: true, id });
}

/* -------------------------------- GET ------------------------------ */
/** اختياري: تمكين الاستعلام عن التقييمات (للاختبارات/الأدوات) مع تطبيع الإخراج */
export async function GET(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const url      = new URL(req.url);
  const eventId  = url.searchParams.get("eventId");
  const entityId = url.searchParams.get("entityId");

  // القيود لمدير الكيان: لا يرى إلا فعاليات كيانه أو العامة
  const where: string[] = [];
  const params: any[] = [];

  if (eventId) { where.push(`ee.eventId = ?`); params.push(eventId); }
  if (entityId) { where.push(`ee.entityId = ?`); params.push(entityId); }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // المشرف يرى الكل. مدير الكيان مقيّد بكيانه.
  if (s.role === "entityManager") {
    if (entityId) {
      // طلب تصفية مختلف عن كيان المدير: اسمح فقط لو نفس الكيان أو عام
      if (String(entityId) !== String(s.entityId || "")) {
        // نجبر الفلترة على كيانه فقط
        where.push(`(ee.entityId IS NULL OR ee.entityId = ?)`);
        params.push(String(s.entityId || ""));
      }
    } else {
      where.push(`(ee.entityId IS NULL OR ee.entityId = ?)`);
      params.push(String(s.entityId || ""));
    }
  }

  const rows = db.prepare(`
    SELECT
      ee.id, ee.eventId, ee.entityId, ee.submittedBy, ee.payload, ee.createdAt,
      COALESCE(u.name,'')  AS submittedByName,
      COALESCE(u.email,'') AS submittedByEmail
    FROM event_evaluations ee
    LEFT JOIN users u ON u.id = ee.submittedBy
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY datetime(ee.createdAt) DESC, ee.id DESC
  `).all(...params) as any[];

  // أعد payload كما هو (مُطبّع أصلاً عند الحفظ)
  const out = (rows || []).map(r => ({
    id: r.id,
    eventId: r.eventId,
    entityId: r.entityId,
    createdAt: r.createdAt,
    submittedBy: r.submittedBy,
    submittedByName: r.submittedByName || null,
    submittedByEmail: r.submittedByEmail || null,
    payload: (() => {
      try { return typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload; }
      catch { return r.payload; }
    })(),
  }));

  return NextResponse.json(out);
}
