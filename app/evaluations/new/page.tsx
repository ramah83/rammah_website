"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, X, Plus, Trash2 } from "lucide-react";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets:["arabic","latin"], weight:["400","600","700","800"], display:"swap" });

type Role = "unionSupervisor" | "entityManager" | "user";
type Session = { id:string; email:string; name:string; role:Role; entityId?:string|null };
type EventLite = { id:string; title:string; date?:string|null; entityId?:string|null };

const PALETTE = { black:"#1D1D1D", red:"#EC1A24", white:"#F6F6F6", beige:"#EFE6DE", gray:"#6B6B6B", border:"#E7E2DC" };

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string,string> = {};
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

function isPdf(u?: string|null) { return !!u && /\.pdf($|\?)/i.test(u); }
function isImage(u?: string|null) { return !!u && /\.(png|jpe?g|gif|webp|avif|bmp|svg)($|\?)/i.test(u); }

/* ------------------------------------------------------------------ */

export default function NewEvaluationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  // ===== النموذج (تم توسيعه) =====
  const [form, setForm] = useState({
    eventId: "",
    // أرقام أساسية
    attendees: "",
    male: "",
    female: "",
    volunteers: "",
    durationHours: "",
    // تقييمات 1–5
    orgScore: "3",
    contentScore: "3",
    speakersScore: "3",
    logisticsScore: "3",
    mediaScore: "3",
    overallScore: "3",
    // الأهداف
    goalsAchieved: "yes", // yes | no
    goalsScore: "3",      // احتفاظ للحقل القديم (توافق)
    goalsPercent: "",
    // نصوص
    notes: "",
    positives: "",
    challenges: "",
    improvements: "",
    // مرفقات وروابط
    photoUrls: [] as string[],
    attendanceUrl: "",
    surveyUrl: "",
    finalReportUrl: "",
    budgetReportUrl: "",
    links: [""], // روابط تغطية/ألبوم… ديناميكية
  });

  // ===== تفاصيل الطلب/الفعالية للعرض =====
  const [reqDetails, setReqDetails] = useState<null | {
    attendeesTarget?: number|null;
    date?: string|null;
    venue?: string;
    goals?: string;
    audience?: string;
    speakers?: string;
    supportType?: string;
    files?: { budgetPdf?: string|null; miniPlanPdf?: string|null; programPdf?: string|null };
  }>(null);
  const [showDetails, setShowDetails] = useState(false);

  function hasAnyDetails(d: typeof reqDetails): boolean {
    if (!d) return false;
    const hasFiles = !!(d.files?.budgetPdf || d.files?.miniPlanPdf || d.files?.programPdf);
    return !!(d.venue || d.supportType || d.goals || d.audience || d.speakers || hasFiles || d.attendeesTarget != null || d.date);
  }

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      const raw = localStorage.getItem("session");
      if (!raw) { router.replace("/"); return; }
      const s = JSON.parse(raw) as Session;
      if (s.role !== "user") { router.replace("/dashboard"); return; }
      setSession(s);
    } catch { router.replace("/"); }
  }, [hydrated, router]);

  useEffect(() => {
    if (!hydrated) return;
    const q = searchParams.get("eventId");
    if (q) setForm(p => ({ ...p, eventId: String(q) }));
  }, [hydrated, searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    setLoadingEvents(true);
    fetch("/api/events?scope=mine", { cache:"no-store", headers: buildSessionHeaders(false) })
      .then(async r => (r.ok ? r.json() : []))
      .then((rows:any[]) => setEvents(Array.isArray(rows) ? rows : []))
      .finally(() => setLoadingEvents(false));
  }, [hydrated]);

  const selectedEvent = useMemo(
    () => events.find(e => String(e.id) === String(form.eventId)),
    [events, form.eventId]
  );

  useEffect(() => {
    if (!form.eventId) { setReqDetails(null); return; }
    (async () => {
      try {
        // نحاول قراءة آخر طلب (لو API عندك بتدعم)
        const r1 = await fetch(`/api/events/requests?eventId=${encodeURIComponent(form.eventId)}`, {
          cache: "no-store", headers: buildSessionHeaders(false),
        });
        const d1 = await r1.json().catch(() => null);
        const p1 = d1?.payload || null;
        if (p1) {
          setReqDetails({
            attendeesTarget: Number.isFinite(Number(p1.attendeesTarget)) ? Number(p1.attendeesTarget) : null,
            date: p1.date || null,
            venue: p1.venue || "",
            goals: p1.goals || "",
            audience: p1.audience || "",
            speakers: p1.speakers || "",
            supportType: p1.supportType || "",
            files: {
              budgetPdf: p1.files?.budgetPdf || null,
              miniPlanPdf: p1.files?.miniPlanPdf || null,
              programPdf: p1.files?.programPdf || null,
            }
          });
          return;
        }
        // بديل: تفاصيل الحدث
        const r2 = await fetch(`/api/events/${encodeURIComponent(form.eventId)}`, {
          cache: "no-store", headers: buildSessionHeaders(false),
        });
        if (!r2.ok) { setReqDetails(null); return; }
        const d2 = await r2.json().catch(() => null);
        const details = d2?.details || {};
        setReqDetails({
          attendeesTarget: Number.isFinite(Number(details?.attendeesTarget)) ? Number(details.attendeesTarget) : null,
          date: details?.date || d2?.date || null,
          venue: details?.venue || "",
          goals: details?.goals || "",
          audience: details?.audience || "",
          speakers: details?.speakers || "",
          supportType: details?.supportType || "",
          files: {
            budgetPdf: details?.files?.budgetPdf || null,
            miniPlanPdf: details?.files?.miniPlanPdf || null,
            programPdf: details?.files?.programPdf || null,
          }
        });
      } catch { setReqDetails(null); }
    })();
  }, [form.eventId]);

  async function uploadOne(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method:"POST", headers: buildSessionHeaders(false), body: fd });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || "فشل رفع الملف");
    return String(data?.url || "");
  }

  async function onUpload(kind:
    | "photo"
    | "attendance"
    | "survey"
    | "finalReport"
    | "budgetReport",
    f?: File | null
  ) {
    if (!f) return;
    setSaving(true); setMsg({});
    try {
      const url = await uploadOne(f);
      if (kind === "photo") setForm(p => ({ ...p, photoUrls: [...p.photoUrls, url] }));
      if (kind === "attendance") setForm(p => ({ ...p, attendanceUrl: url }));
      if (kind === "survey") setForm(p => ({ ...p, surveyUrl: url }));
      if (kind === "finalReport") setForm(p => ({ ...p, finalReportUrl: url }));
      if (kind === "budgetReport") setForm(p => ({ ...p, budgetReportUrl: url }));
    } catch (e:any) {
      setMsg({ err: e?.message || "فشل الرفع" });
    } finally { setSaving(false); }
  }

  function setLink(i: number, v: string) {
    setForm(p => {
      const next = [...p.links];
      next[i] = v;
      return { ...p, links: next };
    });
  }
  function addLink() { setForm(p => ({ ...p, links: [...p.links, ""] })); }
  function removeLink(i: number) {
    setForm(p => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg({});
    if (!form.eventId) return setMsg({ err: "اختر اسم الفعالية" });

    const target = reqDetails?.attendeesTarget ?? null;
    const n = Number(form.attendees || 0);
    if (target !== null && n > target) {
      return setMsg({ err: `عدد الحضور المُدخل (${n}) أكبر من العدد المستهدف (${target}).` });
    }

    // بناء الـ payload الشامل (يحافظ على الحقول القديمة للتوافق)
    const payload = {
      eventId: form.eventId,

      metrics: {
        attendees: n,
        male: Number(form.male || 0) || null,
        female: Number(form.female || 0) || null,
        volunteers: Number(form.volunteers || 0) || null,
        durationHours: Number(form.durationHours || 0) || null,
      },

      ratings: {
        organization: Number(form.orgScore || 0),
        content: Number(form.contentScore || 0),
        speakers: Number(form.speakersScore || 0),
        logistics: Number(form.logisticsScore || 0),
        media: Number(form.mediaScore || 0),
        overall: Number(form.overallScore || 0),
        // توافق للخلف (لو السيرفر بيقرأ goalsScore فقط)
        goalsScore: Number(form.goalsScore || 0),
      },

      goals: {
        achieved: form.goalsAchieved === "yes",
        percent: form.goalsPercent ? Number(form.goalsPercent) : null,
      },

      notes: {
        general: form.notes || "",
        positives: form.positives || "",
        challenges: form.challenges || "",
        improvements: form.improvements || "",
      },

      links: (form.links || []).filter(Boolean),

      files: {
        // القديم — للتوافق
        photos: form.photoUrls,
        attendance: form.attendanceUrl || null,
        survey: form.surveyUrl || null,
        // الجديد
        finalReport: form.finalReportUrl || null,
        budgetReport: form.budgetReportUrl || null,
      },
    };

    setSaving(true);
    try {
      const r = await fetch("/api/new-evaluations", {
        method: "POST",
        headers: buildSessionHeaders(true),
        body: JSON.stringify(payload),
      });
      const raw = await r.text();
      const data = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
      if (!r.ok) throw new Error(data?.error || raw || "تعذر إرسال التقييم");

      setMsg({ ok: "تم إرسال تقييمك بنجاح." });
      setForm({
        eventId:"", attendees:"", male:"", female:"", volunteers:"", durationHours:"",
        orgScore:"3", contentScore:"3", speakersScore:"3", logisticsScore:"3", mediaScore:"3", overallScore:"3",
        goalsAchieved:"yes", goalsScore:"3", goalsPercent:"",
        notes:"", positives:"", challenges:"", improvements:"",
        photoUrls:[], attendanceUrl:"", surveyUrl:"", finalReportUrl:"", budgetReportUrl:"",
        links:[""],
      });
      setReqDetails(null);
      setShowDetails(false);
    } catch (e:any) {
      setMsg({ err: e?.message || "تعذر إرسال التقييم" });
    } finally { setSaving(false); }
  }

  if (!session || session.role !== "user") return null;

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ backgroundColor: PALETTE.beige }}>
      <HeaderBar />
      <main className="mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        <Card className="rounded-[22px] bg-white" style={{ borderColor: PALETTE.border, boxShadow:"0 8px 18px rgba(0,0,0,0.05)" }}>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg" style={{ color: PALETTE.black }}>تقييم فعالية — نموذج جديد</CardTitle>
            <CardDescription className="text-sm" style={{ color: PALETTE.gray }}>اختر فعالية من كياناتك وقدّم تقييمك.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {msg.err && <div className="mb-4 p-3 rounded-lg text-sm" style={{ color:"#EC1A24", background:"#FDEBEC", border:"1px solid #EC1A2433" }}>{msg.err}</div>}
            {msg.ok &&  <div className="mb-4 p-3 rounded-lg text-sm" style={{ color:"#0F5132", background:"#E8F7EE", border:"1px solid #CBE9D6" }}>{msg.ok}</div>}

            {/* اختيار الفعالية */}
            <div className="space-y-2 mb-2">
              <Label>اسم الفعالية *</Label>
              <Select
                value={form.eventId}
                onValueChange={(v)=>{ setForm(p=>({...p, eventId:v })); }}
                disabled={saving || loadingEvents}
              >
                <SelectTrigger className="h-11 rounded-xl" style={{ background:"#F6F6F6", borderColor:"#E3E3E3" }}>
                  <SelectValue placeholder={loadingEvents ? "جارِ التحميل..." : "اختر فعالية"} />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev.id} value={String(ev.id)}>
                      {ev.title} {ev.date ? `— ${new Date(ev.date).toLocaleDateString("ar-EG")}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* كارد مختصرة + زر عرض التفاصيل */}
            {selectedEvent && (
              <div className="mb-4 rounded-2xl border p-4 bg-[#FAFAFA]" style={{ borderColor:"#EDE8E1" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold">
                    {selectedEvent.title}
                    {(reqDetails?.date || selectedEvent.date) && (
                      <span className="text-xs ms-2 text-[#666]">
                        ({new Date(reqDetails?.date || selectedEvent.date || "").toLocaleDateString("ar-EG")})
                      </span>
                    )}
                    {reqDetails?.attendeesTarget != null && (
                      <span className="ms-2 align-middle text-xs inline-flex items-center px-3 h-7 rounded-full"
                        style={{ background:"#E8F7EE", color:"#0F5132", border:"1px solid #CBE9D6" }}>
                        الحد الأقصى للحضور: {reqDetails.attendeesTarget}
                      </span>
                    )}
                  </div>

                  {hasAnyDetails(reqDetails) && (
                    <Button
                      type="button"
                      onClick={()=> setShowDetails(true)}
                      className="h-9 rounded-full"
                      style={{ background: PALETTE.red, color:"#fff" }}
                      title="عرض تفاصيل الفعالية"
                    >
                      عرض التفاصيل
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ====== النموذج الموسّع ====== */}
            <form onSubmit={submit} className="grid grid-cols-1 gap-6 mt-2">
              {/* أرقام أساسية */}
              <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <NumberField label="عدد الحضور الفعلي" value={form.attendees} onChange={(v)=>setForm(p=>({...p, attendees:v}))}
                             hint={reqDetails?.attendeesTarget != null ? `الحد الأقصى: ${reqDetails.attendeesTarget}` : undefined} />
                <NumberField label="ذكور (اختياري)" value={form.male} onChange={(v)=>setForm(p=>({...p, male:v}))} />
                <NumberField label="إناث (اختياري)" value={form.female} onChange={(v)=>setForm(p=>({...p, female:v}))} />
                <NumberField label="عدد المتطوعين (اختياري)" value={form.volunteers} onChange={(v)=>setForm(p=>({...p, volunteers:v}))} />
                <NumberField label="مدة الفعالية (ساعات)" value={form.durationHours} onChange={(v)=>setForm(p=>({...p, durationHours:v}))} />
              </section>

              {/* تقييمات 1–5 */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RatingField label="التنظيم" value={form.orgScore} onChange={(v)=>setForm(p=>({...p, orgScore:v}))} />
                <RatingField label="المحتوى" value={form.contentScore} onChange={(v)=>setForm(p=>({...p, contentScore:v}))} />
                <RatingField label="المتحدثون" value={form.speakersScore} onChange={(v)=>setForm(p=>({...p, speakersScore:v}))} />
                <RatingField label="اللوجستيات" value={form.logisticsScore} onChange={(v)=>setForm(p=>({...p, logisticsScore:v}))} />
                <RatingField label="التغطية الإعلامية" value={form.mediaScore} onChange={(v)=>setForm(p=>({...p, mediaScore:v}))} />
                <RatingField label="التقييم العام" value={form.overallScore} onChange={(v)=>setForm(p=>({...p, overallScore:v}))} />
              </section>

              {/* الأهداف */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>هل تحققت الأهداف؟</Label>
                  <Select value={form.goalsAchieved} onValueChange={(v)=>setForm(p=>({...p, goalsAchieved:v as "yes"|"no"}))}>
                    <SelectTrigger className="h-11 rounded-xl" style={{ background:"#F6F6F6", borderColor:"#E3E3E3" }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <RatingField label="نسبة تحقيق الأهداف (1–5)" value={form.goalsScore} onChange={(v)=>setForm(p=>({...p, goalsScore:v}))} />
                <NumberField label="النسبة التقديرية (%) — اختياري" value={form.goalsPercent} onChange={(v)=>setForm(p=>({...p, goalsPercent:v}))} />
              </section>

              {/* نصوص تفصيلية */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextAreaField label="نقاط القوة" value={form.positives} onChange={(v)=>setForm(p=>({...p, positives:v}))} />
                <TextAreaField label="التحديات" value={form.challenges} onChange={(v)=>setForm(p=>({...p, challenges:v}))} />
                <TextAreaField label="مقترحات التحسين" value={form.improvements} onChange={(v)=>setForm(p=>({...p, improvements:v}))} wide />
                <TextAreaField label="ملاحظات عامة" value={form.notes} onChange={(v)=>setForm(p=>({...p, notes:v}))} wide />
              </section>

              {/* مرفقات */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* صور متعددة */}
                <div className="space-y-2">
                  <Label>رفع صور (يمكن عدة صور)</Label>
                  <Input type="file" accept="image/*" onChange={(e)=>onUpload("photo", e.target.files?.[0] || null)} />
                  {!!form.photoUrls.length && (
                    <>
                      <p className="text-xs text-green-700">تم رفع {form.photoUrls.length} صورة ✓</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {form.photoUrls.map((u, i) => (
                          <a key={u+i} href={u} target="_blank" rel="noreferrer" className="block rounded overflow-hidden border" title="فتح الصورة">
                            {isImage(u) ? <img src={u} alt="" className="w-full h-24 object-cover" /> : <div className="p-2 text-xs break-all">{u}</div>}
                          </a>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* قائمة الحضور */}
                <div className="space-y-2">
                  <Label>قائمة الحضور (PDF/صورة)</Label>
                  <Input type="file" accept="application/pdf,image/*" onChange={(e)=>onUpload("attendance", e.target.files?.[0] || null)} />
                  {form.attendanceUrl && <TinyPreview url={form.attendanceUrl} />}
                </div>

                {/* استطلاع الرأي */}
                <div className="space-y-2">
                  <Label>تقرير استطلاع الرأي (PDF/صورة)</Label>
                  <Input type="file" accept="application/pdf,image/*" onChange={(e)=>onUpload("survey", e.target.files?.[0] || null)} />
                  {form.surveyUrl && <TinyPreview url={form.surveyUrl} />}
                </div>

                {/* تقرير نهائي + ميزانية */}
                <div className="space-y-2">
                  <Label>التقرير النهائي (PDF)</Label>
                  <Input type="file" accept="application/pdf" onChange={(e)=>onUpload("finalReport", e.target.files?.[0] || null)} />
                  {form.finalReportUrl && <TinyPreview url={form.finalReportUrl} />}
                </div>

                <div className="space-y-2">
                  <Label>تقرير الميزانية/المصروفات (PDF)</Label>
                  <Input type="file" accept="application/pdf" onChange={(e)=>onUpload("budgetReport", e.target.files?.[0] || null)} />
                  {form.budgetReportUrl && <TinyPreview url={form.budgetReportUrl} />}
                </div>
              </section>

              {/* روابط التغطية/الألبومات */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>روابط التغطية/الألبومات</Label>
                  <Button type="button" onClick={addLink} className="h-8 rounded-full px-3" variant="secondary"
                          style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, color:PALETTE.black }}>
                    <Plus className="h-4 w-4 me-1" /> إضافة رابط
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {form.links.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input placeholder="https://…" value={v} onChange={(e)=>setLink(i, e.target.value)} />
                      <Button type="button" onClick={()=>removeLink(i)} className="h-10 w-10" variant="secondary"
                              style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, color:"#B00020" }}
                              title="حذف الرابط">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <div>
                <Button disabled={saving || !form.eventId} className="h-11 rounded-full font-semibold" style={{ background:PALETTE.red, color:"#fff" }}>
                  {saving ? "جارٍ الإرسال..." : "إرسال التقييم"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <FooterBar />

      {/* Modal تفاصيل الفعالية */}
      {showDetails && selectedEvent && (
        <Modal onClose={()=>setShowDetails(false)} title="تفاصيل الفعالية">
          <div className="space-y-3">
            <div className="rounded-xl border p-4" style={{ borderColor:"#EDE8E1", background:"#FAFAFA" }}>
              <div className="font-semibold">
                {selectedEvent.title}
                {(reqDetails?.date || selectedEvent.date) && (
                  <span className="text-xs ms-2 text-[#666]">
                    ({new Date(reqDetails?.date || selectedEvent.date || "").toLocaleDateString("ar-EG")})
                  </span>
                )}
              </div>
              {reqDetails?.attendeesTarget != null && (
                <div className="mt-2 text-xs inline-flex items-center px-3 h-7 rounded-full"
                     style={{ background:"#E8F7EE", color:"#0F5132", border:"1px solid #CBE9D6" }}>
                  الحد الأقصى للحضور: {reqDetails.attendeesTarget}
                </div>
              )}
            </div>

            {hasAnyDetails(reqDetails) ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {reqDetails?.venue && <Field label="عنوان/مقر الفعالية" value={reqDetails.venue} />}
                  {reqDetails?.supportType && <Field label="نوع الدعم" value={reqDetails.supportType} />}
                  {reqDetails?.goals && <Field label="الأهداف الرئيسية" value={reqDetails.goals} wide />}
                  {reqDetails?.audience && <Field label="الجمهور المستهدف" value={reqDetails.audience} wide />}
                  {reqDetails?.speakers && <Field label="المتحدثون" value={reqDetails.speakers} wide />}
                </div>

                {(reqDetails?.files?.budgetPdf || reqDetails?.files?.miniPlanPdf || reqDetails?.files?.programPdf) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FilePreview title="ميزانية تقديرية (PDF)" url={reqDetails?.files?.budgetPdf || null} />
                    <FilePreview title="خطة توضيح مختصرة (PDF)" url={reqDetails?.files?.miniPlanPdf || null} />
                    <FilePreview title="برنامج الفعالية (PDF)" url={reqDetails?.files?.programPdf || null} />
                  </div>
                )}
              </>
            ) : (
              <div className="text-xs text-[#777]">لا توجد تفاصيل إضافية محفوظة لهذه الفعالية.</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ----------------------- صغار UI ----------------------- */

function NumberField({ label, value, onChange, hint }:{
  label:string; value:string; onChange:(v:string)=>void; hint?:string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e)=>onChange(e.target.value)} />
      {hint && <p className="text-xs text-[#6B6B6B]">{hint}</p>}
    </div>
  );
}

function RatingField({ label, value, onChange }:{
  label:string; value:string; onChange:(v:string)=>void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl" style={{ background:"#F6F6F6", borderColor:"#E3E3E3" }}>
          <SelectValue placeholder="اختر الدرجة" />
        </SelectTrigger>
        <SelectContent>{["1","2","3","4","5"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function TextAreaField({ label, value, onChange, wide=false }:{
  label:string; value:string; onChange:(v:string)=>void; wide?:boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <Label>{label}</Label>
      <textarea
        className="w-full min-h-[110px] rounded-xl p-3 border"
        style={{ background:"#F6F6F6", borderColor:"#E3E3E3" }}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
      />
    </div>
  );
}

function Modal({ title, children, onClose }:{
  title: string; children: React.ReactNode; onClose: ()=>void;
}) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">{title}</div>
            <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-black/5">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, wide=false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-[12px] text-[#888] mb-1">{label}</div>
      <div className="rounded-lg border px-3 py-2 bg-white" style={{ borderColor:"#EDE8E1" }}>{value}</div>
    </div>
  );
}

function FilePreview({ title, url }: { title: string; url: string | null }) {
  if (!url) return <div className="rounded-lg border p-3 bg-white text-[#999]" style={{ borderColor:"#EDE8E1" }}>{title}: لا يوجد</div>;
  return (
    <div className="rounded-lg border p-3 bg-white" style={{ borderColor:"#EDE8E1" }}>
      <div className="text-sm mb-2">{title}</div>
      {isPdf(url) ? (
        <iframe src={url} className="w-full h-48 rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : isImage(url) ? (
        <img src={url} alt={title} className="w-full h-48 object-cover rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : (
        <div className="text-xs break-all text-[#666]">{url}</div>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs underline">فتح في تبويب جديد</a>
    </div>
  );
}

function TinyPreview({ url }: { url: string }) {
  return (
    <div className="rounded-lg border p-2 bg-white" style={{ borderColor:"#EDE8E1" }}>
      {isPdf(url) ? (
        <iframe src={url} className="w-full h-40 rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : isImage(url) ? (
        <img src={url} alt="" className="w-full h-40 object-cover rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : (
        <div className="text-xs break-all text-[#666]">{url}</div>
      )}
      <div className="mt-1 text-[11px]">
        <a href={url} target="_blank" rel="noreferrer" className="underline">فتح</a>
      </div>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href:string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border shadow-[0_6px_12px_rgba(0,0,0,0.04)]" style={{ borderColor:"#E7E2DC" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background:"#F6F6F6", border:"1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color:"#1D1D1D" }}>منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href:"/profile", label:"الملف الشخصي" },
              { href:"/dashboard", label:"لوحة التحكم" },
              { href:"/support", label:"الدعم" },
              { href:"/about", label:"عن المنصة" },
            ].map(l=>(
              <Link key={l.href} href={l.href} className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs" style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)", color:"#595959" }}>
          <p>© {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline" style={{ color:"#1D1D1D" }}>الخصوصية</Link>
            <span style={{ color:"#B9B9B9" }}>•</span>
            <Link href="/terms" className="hover:underline" style={{ color:"#1D1D1D" }}>الشروط</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
