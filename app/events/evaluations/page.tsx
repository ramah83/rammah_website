"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Star, CheckCircle2, CircleX, ExternalLink } from "lucide-react";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets:["arabic","latin"], weight:["400","600","700","800"], display:"swap" });

type Role = "unionSupervisor" | "entityManager" | "user";
type Session = { id:string; email:string; name:string; role:Role; entityId?:string|null };

type EntityLite = { id:string; name:string };
type EventRow = {
  id: string; title: string; date?: string|null; status?: string;
  entityId?: string|null; organizerName?: string|null; evalCount?: number;
};

type EvaluationRow = {
  id: string;
  eventId: string;
  createdAt: string;
  submittedBy?: string | null;
  submittedByName?: string | null;
  submittedByEmail?: string | null;
  payload: any;
};

const PALETTE = { black:"#1D1D1D", red:"#EC1A24", beige:"#EFE6DE", soft:"#F6F6F6", border:"#E7E2DC", muted:"#6B6B6B" };

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = {};
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

const isPdf = (u?: string|null) => !!u && /\.pdf($|\?)/i.test(u);
const isImage = (u?: string|null) => !!u && /\.(png|jpe?g|gif|webp|avif|bmp|svg)($|\?)/i.test(u);

/* =================== الصفحة الرئيسية =================== */

export default function EvaluationsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem("session");
      if (raw) setSession(JSON.parse(raw) as Session);
    } catch {}
  }, [mounted]);

  const isManager = session?.role === "entityManager";
  const isSupervisor = session?.role === "unionSupervisor";

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ backgroundColor: PALETTE.beige }}>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes popIn  { from { opacity: 0; transform: scale(.98) } to { opacity: 1; transform: scale(1) } }
        .anim-fadeUp { animation: fadeUp .35s ease both }
        .anim-popIn { animation: popIn .28s ease both }
        .card-hover  { transition: transform .25s ease, box-shadow .25s ease }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.08) }
      `}</style>

      <HeaderBarEvaluations />
      <div className="mx-auto max-w-6xl w-full p-4 anim-fadeUp">
        <Card className="rounded-[22px] border anim-popIn" style={{ borderColor: PALETTE.border, background: "#fff" }}>
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold" style={{ color: PALETTE.black }}>تقييمات الفعاليات</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>
              {isSupervisor ? "عرض تقييمات جميع الكيانات" : isManager ? "عرض تقييمات فعاليات كيانك" : "هذه الصفحة للمسئولين فقط"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isSupervisor || isManager) ? <EvaluationList isSupervisor={!!isSupervisor} /> : (
              <div className="rounded-xl border p-4" style={{ borderColor: PALETTE.border, color: PALETTE.muted }}>
                تحتاج صلاحية مدير كيان أو مسئول الاتحاد.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <FooterBarEvaluations />
    </div>
  );
}

/* =================== قائمة الفعاليات =================== */

function EvaluationList({ isSupervisor }: { isSupervisor: boolean }) {
  const search = useSearchParams();
  const preselectEventId = search.get("eventId") || "";

  const [events, setEvents] = useState<EventRow[]>([]);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ id: string; title: string; date?: string|null } | null>(null);

  const [rows, setRows] = useState<EvaluationRow[] | null>(null);
  const [entityFilter, setEntityFilter] = useState<string>("__ALL__");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const entsRes = await fetch("/api/entities", { cache: "no-store" });
        const entsJson = await entsRes.json().catch(() => []);
        const ents: EntityLite[] = (Array.isArray(entsJson) ? entsJson : entsJson?.entities || [])
          .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
        if (!alive) return;
        setEntities(ents);

        const r = await fetch("/api/events?scope=mine", { cache: "no-store", headers: buildSessionHeaders(false) });
        const data: EventRow[] = await r.json().catch(() => []);
        if (!alive) return;

        const arr = Array.isArray(data) ? data : [];
        setEvents(arr);

        if (preselectEventId) {
          const ev = arr.find(x => String(x.id) === String(preselectEventId));
          if (ev) openEventEvaluations(ev);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function entName(id?: string | null) {
    return id == null ? "كل الكيانات" : (entities.find(e => String(e.id) === String(id || ""))?.name || "—");
  }

  const filtered = useMemo(() => {
    if (!isSupervisor) return events;
    if (entityFilter === "__ALL__") return events;
    if (entityFilter === "__PUBLIC__") return events.filter(e => !e.entityId);
    return events.filter(e => String(e.entityId || "") === entityFilter);
  }, [events, isSupervisor, entityFilter]);

  async function openEventEvaluations(ev: EventRow) {
    setOpen({ id: ev.id, title: ev.title, date: ev.date });
    setRows(null);
    try {
      const r = await fetch(`/api/events/${encodeURIComponent(ev.id)}/evaluations`, {
        cache: "no-store",
        headers: buildSessionHeaders(false)
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.warn("evaluations fetch failed", r.status, t);
        alert(r.status === 403 ? "ليست لديك صلاحية لعرض تقييمات هذه الفعالية." : "تعذر جلب التقييمات.");
        setRows([]);
        return;
      }

      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert("تعذر الاتصال بالخادم.");
      setRows([]);
    }
  }

  if (loading) {
    return <div className="rounded-xl p-3" style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, color: PALETTE.muted }}>جارٍ التحميل…</div>;
  }

  return (
    <>
      {isSupervisor && (
        <div className="rounded-xl p-3 mb-3 flex items-center gap-2" style={{ background:"#fff", border:`1px solid ${PALETTE.border}` }}>
          <span className="text-sm" style={{ color: PALETTE.muted }}>تصفية حسب الكيان:</span>
          <select className="h-9 rounded-lg border px-3" value={entityFilter} onChange={(e)=> setEntityFilter(e.target.value)}>
            <option value="__ALL__">جميع الكيانات</option>
            <option value="__PUBLIC__">فعاليات عامة (كل الكيانات)</option>
            {entities.map((e)=>(<option key={e.id} value={e.id}>{e.name}</option>))}
          </select>
          <span className="ml-auto text-xs" style={{ color: PALETTE.muted }}>{filtered.length} فعالية</span>
        </div>
      )}

      {!filtered.length ? (
        <div className="rounded-xl p-3" style={{ background:"#F6F6F6", border:`1px solid ${PALETTE.border}`, color: PALETTE.muted }}>
          لا توجد فعاليات متاحة حاليًا.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((ev, i) => (
            <li
              key={ev.id}
              className="rounded-2xl p-4 flex items-center justify-between cursor-pointer card-hover anim-fadeUp"
              style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)", animationDelay: `${i * 40}ms` }}
              onClick={() => openEventEvaluations(ev)}
              title="عرض تقييمات الفعالية"
            >
              <div>
                <div className="font-semibold" style={{ color: PALETTE.black }}>{ev.title}</div>
                <div className="text-sm" style={{ color: PALETTE.muted }}>
                  {ev.date ? new Date(ev.date).toLocaleDateString("ar-EG") : "بدون تاريخ"} •
                  {" "}النطاق: {entName(ev.entityId ?? null)} •
                  {" "}التقييمات: {ev.evalCount ?? "—"}
                </div>
              </div>
              <div>
                <Button className="h-9 rounded-full" style={{ background: PALETTE.red, color:"#fff" }}>
                  عرض التقييمات
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <EvaluationsModal
          title={open.title}
          date={open.date}
          rows={rows}
          onClose={()=>setOpen(null)}
        />
      )}
    </>
  );
}

/* =================== المودال: عمود مُقيّمين + معاينة التفاصيل =================== */

function EvaluationsModal({ title, date, rows, onClose }:{
  title:string; date?:string|null; rows: EvaluationRow[] | null; onClose: ()=>void;
}) {
  const [selId, setSelId] = useState<string | null>(null);

  useEffect(() => {
    if (rows && rows.length) setSelId(rows[0].id);
  }, [rows]);

  const selected = useMemo(() => (rows || []).find(r => r.id === selId) || null, [rows, selId]);

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border shadow-xl anim-popIn" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">
              تقييمات: {title} {date && <span className="text-xs text-[#777]">({new Date(date).toLocaleDateString("ar-EG")})</span>}
            </div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>

          {!rows ? (
            <div className="p-5 text-sm" style={{ color: PALETTE.muted }}>جارٍ التحميل…</div>
          ) : rows.length === 0 ? (
            <div className="p-5 text-sm" style={{ color: PALETTE.muted }}>لا توجد تقييمات.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 h-[calc(90vh-58px)]">
              {/* العمود الجانبي: المُقيّمون */}
              <div className="border-l overflow-auto" style={{ borderColor:"#F1EEE8" }}>
                <div className="p-3 text-sm font-semibold">المُقيّمون ({rows.length})</div>
                <ul className="px-2 pb-3 space-y-2">
                  {rows.map((r) => {
                    const who = r.submittedByName || r.submittedByEmail || r.submittedBy || "—";
                    const active = selId === r.id;
                    return (
                      <li key={r.id}>
                        <button
                          onClick={()=>setSelId(r.id)}
                          className={`w-full text-right rounded-xl border px-3 py-2 text-sm ${active ? "bg-[#FFF4F4]" : "bg-white"} card-hover`}
                          style={{ borderColor: active ? "#F2CACA" : "#EDE8E1", color:"#333" }}
                        >
                          <div className="font-medium truncate">{who}</div>
                          <div className="text-[11px]" style={{ color:"#777" }}>
                            {new Date(r.createdAt).toLocaleString("ar-EG")}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* يمين: تفاصيل التقييم المختار */}
              <div className="md:col-span-2 overflow-auto p-4">
                {selected ? <OneEvaluation row={selected} /> : (
                  <div className="rounded-xl border p-4 text-sm" style={{ borderColor:"#EDE8E1", background:"#FAFAFA", color:"#777" }}>
                    اختر مُقيِّمًا من القائمة على اليسار لعرض تفاصيل تقييمه.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =================== عنصر تقييم واحد =================== */

function OneEvaluation({ row }: { row: EvaluationRow }) {
  // تحويل الأرقام العربية/الفارسية
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

  const yesish = (v: any) => {
    if (v === true) return true;
    if (v === false) return false;
    const s = toAsciiDigits(String(v ?? "").trim().toLowerCase());
    if (["1","true","yes","y","تم","نعم","تحقق","تحققت","achieved"].includes(s)) return true;
    if (["0","false","no","n","لا","لم"].includes(s)) return false;
    return false;
  };

  const pick = (obj: any, keys: (string | string[])[]) => {
    for (const k of keys) {
      const paths = Array.isArray(k) ? k : [k];
      for (const p of paths) {
        const val = p.split(".").reduce((acc, seg) => (acc && acc[seg] !== undefined ? acc[seg] : undefined), obj);
        if (val !== undefined && val !== null && !(typeof val === "string" && val.trim() === "")) return val;
      }
    }
    return undefined;
  };

  // payload قد يكون string أو مُطبّع من الـAPI
  let payload: any = row.payload;
  try { if (typeof payload === "string") payload = JSON.parse(payload); } catch {}

  // ===== metrics =====
  const metrics = {
    attendees:     num(pick(payload, ["metrics.attendees","attendees","attendance","attendanceCount","numAttendees","الحضور","عدد_الحضور"])),
    male:          num(pick(payload, ["metrics.male","male","males","ذكور"])),
    female:        num(pick(payload, ["metrics.female","female","females","إناث"])),
    volunteers:    num(pick(payload, ["metrics.volunteers","volunteers","volunteersCount","المتطوعون","متطوعون","عدد_المتطوعين"])),
    durationHours: num(pick(payload, ["metrics.durationHours","durationHours","duration","hours","مدة","المدة"])),
  };

  // ===== ratings =====
  const ratings = {
    organization: num(pick(payload, ["ratings.organization","organization","rateOrganization","organizationRating","تنظيم","التنظيم"])),
    content:      num(pick(payload, ["ratings.content","content","rateContent","contentRating","المحتوى"])),
    speakers:     num(pick(payload, ["ratings.speakers","speakers","rateSpeakers","speakersRating","المتحدثون","المتحدثين"])),
    logistics:    num(pick(payload, ["ratings.logistics","logistics","rateLogistics","logisticsRating","اللوجستيات","الخدمات"])),
    media:        num(pick(payload, ["ratings.media","media","rateMedia","mediaRating","التغطية الإعلامية","الاعلام"])),
    overall:      num(pick(payload, ["ratings.overall","overall","overallRating","rateOverall","التقييم العام","عام"])),
    goalsScore:   num(pick(payload, ["ratings.goalsScore","goalsScore","rateGoals","goalsRating","تحقيق الأهداف","الأهداف.تقييم"])),
  };

  // ===== goals =====
  const goals = (() => {
    const achievedRaw = pick(payload, ["goals.achieved","goalsAchieved","achieved","الأهداف.تحققت","الأهداف.تحقيق","تحققت_الأهداف"]);
    const percentRaw  = pick(payload, ["goals.percent","goalsPercent","achievedPercent","percentage","نسبة_تحقيق_الأهداف","النسبة"]);
    return { achieved: yesish(achievedRaw), percent: num(percentRaw) };
  })();

  // ===== notes =====
  const notes = {
    general: String(pick(payload, ["notes.general","notes","comment","comments","ملاحظات","ملاحظات_عامة"]) || ""),
    positives: String(pick(payload, ["notes.positives","positives","الإيجابيات","نقاط_القوة"]) || ""),
    challenges: String(pick(payload, ["notes.challenges","challenges","التحديات"]) || ""),
    improvements: String(pick(payload, ["notes.improvements","improvements","تحسينات","مقترحات_التحسين"]) || ""),
  };

  // ===== links =====
  const linksRaw = pick(payload, ["links","linksText","روابط","البومات","mediaLinks"]);
  const links: string[] = Array.isArray(linksRaw)
    ? (linksRaw as any[]).map(String).filter(Boolean)
    : typeof linksRaw === "string"
      ? linksRaw.split(/\s+|\n|,/).map(s=>s.trim()).filter(Boolean)
      : [];

  // ===== files =====
  const files = payload?.files ?? {
    photos: Array.isArray(payload?.photoUrls) ? payload.photoUrls : [],
    attendance: payload?.attendanceUrl || null,
    survey: payload?.surveyUrl || null,
    finalReport: payload?.finalReportUrl || null,
    budgetReport: payload?.budgetReportUrl || null,
  };

  const who = row.submittedByName || row.submittedByEmail || row.submittedBy || "—";

  return (
    <div className="rounded-2xl border p-4 anim-fadeUp"
         style={{ borderColor: PALETTE.border, background:"#fff", boxShadow:"0 6px 12px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: PALETTE.black }}>
          المُقيِّم: <span className="font-semibold">{who}</span>
          <span style={{ color: PALETTE.muted }}> • {new Date(row.createdAt).toLocaleString("ar-EG")}</span>
        </div>
        {typeof goals.achieved === "boolean" && (
          goals.achieved ? <BadgeSuccess text="الأهداف تحققت" /> : <BadgeDanger text="الأهداف لم تتحقق" />
        )}
      </div>

      <Section title="أرقام التنفيذ">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatChip label="الحضور" value={metrics.attendees ?? "—"} />
          <StatChip label="ذكور" value={metrics.male ?? "—"} />
          <StatChip label="إناث" value={metrics.female ?? "—"} />
          <StatChip label="المتطوعون" value={metrics.volunteers ?? "—"} />
          <StatChip label="المدة (س)" value={metrics.durationHours ?? "—"} />
        </div>
      </Section>

      <Section title="التقييمات (1–5)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StarRow label="التنظيم" val={ratings.organization} />
          <StarRow label="المحتوى" val={ratings.content} />
          <StarRow label="المتحدثون" val={ratings.speakers} />
          <StarRow label="اللوجستيات" val={ratings.logistics} />
          <StarRow label="التغطية الإعلامية" val={ratings.media} />
          <StarRow label="التقييم العام" val={ratings.overall} />
          <StarRow label="تحقيق الأهداف" val={ratings.goalsScore} />
        </div>
      </Section>

      {(typeof goals.achieved === "boolean" || goals.percent != null) && (
        <Section title="الأهداف">
          <div className="flex items-center gap-3 flex-wrap">
            {typeof goals.achieved === "boolean" && (
              goals.achieved ? <BadgeSuccess text="تم تحقيق الأهداف" /> : <BadgeDanger text="لم تتحقق الأهداف" />
            )}
            <StatChip label="النسبة التقديرية (%)" value={goals.percent ?? "—"} />
          </div>
        </Section>
      )}

      {(notes.positives || notes.challenges || notes.improvements || notes.general) && (
        <Section title="ملاحظات تفصيلية">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notes.positives && <NoteBox title="نقاط القوة" text={notes.positives} />}
            {notes.challenges && <NoteBox title="التحديات" text={notes.challenges} />}
            {notes.improvements && <NoteBox title="مقترحات التحسين" text={notes.improvements} wide />}
            {notes.general && <NoteBox title="ملاحظات عامة" text={notes.general} wide />}
          </div>
        </Section>
      )}

      {links.length > 0 && (
        <Section title="روابط التغطية/الألبومات">
          <ul className="list-disc pr-5 space-y-1 text-sm">
            {links.map((u, i) => (
              <li key={i} className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                <a href={u} className="underline break-all" target="_blank" rel="noreferrer">{u}</a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(files?.photos?.length || files?.attendance || files?.survey || files?.finalReport || files?.budgetReport) ? (
        <Section title="مرفقات">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!!files?.photos?.length && (
              <div className="space-y-2">
                <div className="text-sm font-semibold">صور</div>
                <div className="grid grid-cols-3 gap-2">
                  {files.photos.map((u: string, i: number) => (
                    <a key={u+i} href={u} target="_blank" rel="noreferrer" className="block rounded overflow-hidden border card-hover"
                       style={{ borderColor: PALETTE.border }}>
                      {isImage(u) ? <img src={u} alt="" className="w-full h-24 object-cover" /> : <div className="p-2 text-[11px] break-all">{u}</div>}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              {files?.attendance && <FileCard title="قائمة الحضور" url={files.attendance} />}
              {files?.survey && <FileCard title="تقرير استطلاع الرأي" url={files.survey} />}
              {files?.finalReport && <FileCard title="التقرير النهائي" url={files.finalReport} />}
              {files?.budgetReport && <FileCard title="تقرير الميزانية/المصروفات" url={files.budgetReport} />}
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

/* =================== مكونات مساعدة =================== */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="mb-2 font-semibold">{title}</div>
      <div className="rounded-xl border p-3 anim-popIn" style={{ borderColor:"#EDE8E1", background:"#FAFAFA" }}>
        {children}
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string|number }) {
  return (
    <div className="rounded-lg border px-3 py-2 text-sm bg-white anim-popIn" style={{ borderColor:"#EDE8E1" }}>
      <div className="text-[12px] text-[#888]">{label}</div>
      <div className="font-semibold">{String(value)}</div>
    </div>
  );
}

function StarRow({ label, val }: { label:string; val?: number|null }) {
  const v = typeof val === "number" ? val : Number(val);
  const isNum = Number.isFinite(v);
  const n = isNum ? Math.max(0, Math.min(5, Math.round(v))) : 0;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 anim-popIn" style={{ borderColor:"#EDE8E1" }}>
      <div className="text-[12px] text-[#888] mb-1">{label}</div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4" fill={i < n ? "#EC1A24" : "transparent"} color="#EC1A24" />
        ))}
        <span className="text-xs text-[#777] ms-2">{isNum ? n : "—"}</span>
      </div>
    </div>
  );
}

function NoteBox({ title, text, wide=false }:{ title:string; text:string; wide?:boolean }) {
  return (
    <div className={`${wide ? "md:col-span-2" : ""} rounded-lg border bg-white p-3 anim-popIn`} style={{ borderColor:"#EDE8E1" }}>
      <div className="text-[12px] text-[#888] mb-1">{title}</div>
      <div className="text-sm leading-relaxed whitespace-pre-wrap">{text}</div>
    </div>
  );
}

function FileCard({ title, url }: { title:string; url:string }) {
  return (
    <div className="rounded-lg border bg-white p-3 anim-popIn" style={{ borderColor:"#EDE8E1" }}>
      <div className="text-sm mb-2 font-medium">{title}</div>
      {isPdf(url) ? (
        <iframe src={url} className="w-full h-44 rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : isImage(url) ? (
        <img src={url} alt={title} className="w-full h-44 object-cover rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : (
        <div className="text-xs break-all text-[#666]">{url}</div>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs underline">فتح</a>
    </div>
  );
}

function BadgeSuccess({ text }: { text:string }) {
  return (
    <span className="text-xs inline-flex items-center gap-1 px-3 h-7 rounded-full"
          style={{ background:"#E8F7EE", color:"#0F5132", border:"1px solid #CBE9D6" }}>
      <CheckCircle2 className="h-3.5 w-3.5" /> {text}
    </span>
  );
}
function BadgeDanger({ text }: { text:string }) {
  return (
    <span className="text-xs inline-flex items-center gap-1 px-3 h-7 rounded-full"
          style={{ background:"#FFF1F1", color:"#B00020", border:"1px solid #F2CACA" }}>
      <CircleX className="h-3.5 w-3.5" /> {text}
    </span>
  );
}

/* =================== هيدر/فوتر =================== */

function HeaderBarEvaluations() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10 anim-fadeUp">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border shadow-[0_6px_12px_rgba(0,0,0,0.04)] card-hover"
             style={{ borderColor: PALETTE.border }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: PALETTE.soft, border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color={PALETTE.black} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: PALETTE.black }}>منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/profile", label: "الملف الشخصي" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/events", label: "الفعاليات" },
              { href: "/events/evaluations", label: "تقييمات الفعاليات" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function FooterBarEvaluations() {
  return (
    <footer className="relative z-10 anim-fadeUp">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs card-hover"
             style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#595959" }}>
          <p>© {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline" style={{ color: PALETTE.black }}>الخصوصية</Link>
            <span style={{ color: "#B9B9B9" }}>•</span>
            <Link href="/terms" className="hover:underline" style={{ color: PALETTE.black }}>الشروط</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
