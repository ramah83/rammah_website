export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

type Role = "unionSupervisor" | "entityManager" | "user";

/** يطبّع الـpayload ويدعم أرقام عربية/فارسية ومفاتيح متفاوتة */
function normalizeEvalPayload(raw: any) {
  let p: any = raw;
  try { if (typeof p === "string") p = JSON.parse(p); } catch {}
  p = p || {};

  const toAsciiDigits = (s: string) =>
    s
      .replace(/[٠-٩]/g, d => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)])
      .replace(/[۰-۹]/g, d => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);

  const num = (v: any) => {
    if (v == null || v === "") return null;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const s1 = toAsciiDigits(String(v).trim()).replace(/٬|،/g, ",");
    const m = s1.match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return null;
    const x = Number(m[0].replace(",", "."));
    return Number.isFinite(x) ? x : null;
  };

  const toKey = (s: string) =>
    toAsciiDigits(String(s).toLowerCase()).replace(/[^\w\u0600-\u06FF]+/g, "");

  const getByPath = (obj: any, path: string) =>
    path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);

  const flatten = (obj: any, prefix = "", out: Record<string, any> = {}) => {
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        const nk = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, nk, out);
        else out[nk] = v;
      }
    }
    return out;
  };

  const find = (obj: any, aliases: string[]) => {
    for (const a of aliases) {
      const v = getByPath(obj, a);
      if (v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "")) return v;
    }
    const flat = flatten(obj);
    const A = aliases.map(toKey);
    for (const [k, v] of Object.entries(flat)) {
      const nk = toKey(k);
      if (A.some(a => nk.includes(a))) return v;
    }
    return undefined;
  };

  const yesish = (v: any) => {
    if (v === true) return true;
    if (v === false) return false;
    const s = toAsciiDigits(String(v ?? "").trim().toLowerCase());
    if (["1","true","yes","y","تم","نعم","تحقق","تحققت","achieved"].includes(s)) return true;
    if (["0","false","no","n","لا","لم"].includes(s)) return false;
    return false;
  };

  const metrics = {
    attendees    : num(find(p, ["metrics.attendees","attendees","attendance","attendanceCount","numAttendees","الحضور","عدد_الحضور"])),
    male         : num(find(p, ["metrics.male","male","males","ذكور"])),
    female       : num(find(p, ["metrics.female","female","females","إناث"])),
    volunteers   : num(find(p, ["metrics.volunteers","volunteers","volunteersCount","المتطوعون","متطوعون","عدد_المتطوعين"])),
    durationHours: num(find(p, ["metrics.durationHours","durationHours","duration","hours","مدة","المدة"])),
  };

  const ratings = {
    organization: num(find(p, ["ratings.organization","organization","org","rateOrganization","organizationRating","تنظيم","التنظيم"])),
    content     : num(find(p, ["ratings.content","content","rateContent","contentRating","المحتوى"])),
    speakers    : num(find(p, ["ratings.speakers","speakers","rateSpeakers","speakersRating","المتحدثون","المتحدثين"])),
    logistics   : num(find(p, ["ratings.logistics","logistics","rateLogistics","logisticsRating","اللوجستيات","الخدمات"])),
    media       : num(find(p, ["ratings.media","media","rateMedia","mediaRating","التغطية","التغطيةالإعلامية","الاعلام","mediaCoverage"])),
    overall     : num(find(p, ["ratings.overall","overall","overallRating","rateOverall","التقييم","التقييمالعام","عام"])),
    goalsScore  : num(find(p, ["ratings.goalsScore","goalsScore","rateGoals","goalsRating","تحقيقالأهداف","تحقيق_الأهداف"])),
  };

  const achievedRaw = find(p, ["goals.achieved","goalsAchieved","achieved","الأهداف.تحققت","الأهداف.تحقيق","تحققت_الأهداف"]);
  const percentRaw  = find(p, ["goals.percent","goalsPercent","achievedPercent","percentage","نسبة_تحقيق_الأهداف","النسبة"]);
  const goals = { achieved: yesish(achievedRaw), percent: num(percentRaw) };

  const notes = {
    general     : String(find(p, ["notes.general","notes","comment","comments","ملاحظات","ملاحظات_عامة"]) || ""),
    positives   : String(find(p, ["notes.positives","positives","الإيجابيات","نقاط_القوة"]) || ""),
    challenges  : String(find(p, ["notes.challenges","challenges","التحديات"]) || ""),
    improvements: String(find(p, ["notes.improvements","improvements","تحسينات","مقترحات_التحسين"]) || ""),
  };

  const linksRaw = find(p, ["links","linksText","روابط","البومات","mediaLinks"]);
  const links: string[] = Array.isArray(linksRaw)
    ? linksRaw.map(String).filter(Boolean)
    : typeof linksRaw === "string"
      ? linksRaw.split(/\s+|\n|,/).map(s=>s.trim()).filter(Boolean)
      : [];

  const files = (p.files && typeof p.files === "object" && !Array.isArray(p.files))
    ? p.files
    : {
        photos      : Array.isArray(p.photoUrls) ? p.photoUrls : [],
        attendance  : p.attendanceUrl  ?? null,
        survey      : p.surveyUrl      ?? null,
        finalReport : p.finalReportUrl ?? null,
        budgetReport: p.budgetReportUrl?? null,
      };

  return { metrics, ratings, goals, notes, links, files };
}

/* ======================== GET: جلب التقييمات ======================== */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s || !["unionSupervisor", "entityManager"].includes(s.role as Role)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const db = getDB();

  // لو مدير كيان: اسمح فقط لو الفعالية ضمن كيانه أو عامة
  if (s.role === "entityManager") {
    const ev = db.prepare(`SELECT entityId FROM events WHERE id = ?`)
                 .get(params.id) as { entityId: string | null } | undefined;
    if (!ev) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    const isPublic = ev.entityId == null;
    const sameEntity = String(ev.entityId || "") === String(s.entityId || "");
    if (!isPublic && !sameEntity) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
  }

  try {
    const rows = db.prepare(`
      SELECT
        ee.id,
        ee.eventId,
        ee.createdAt,
        ee.submittedBy,
        COALESCE(u.name, '')  AS submittedByName,
        COALESCE(u.email, '') AS submittedByEmail,
        ee.payload
      FROM event_evaluations ee
      LEFT JOIN users u ON u.id = ee.submittedBy
      WHERE ee.eventId = ?
      ORDER BY datetime(ee.createdAt) DESC, ee.id DESC
    `).all(params.id) as any[];

    const normalized = (rows || []).map(r => ({
      ...r,
      payload: normalizeEvalPayload(r.payload),
    }));

    return NextResponse.json(normalized);
  } catch (e: any) {
    console.error("evaluations query failed:", e?.message || e);
    return NextResponse.json({ error: "خطأ في الاستعلام عن التقييمات" }, { status: 500 });
  }
}
