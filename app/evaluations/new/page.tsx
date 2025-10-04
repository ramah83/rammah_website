"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, X } from "lucide-react";
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

export default function NewEvaluationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [session, setSession] = useState<Session | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});

  const [form, setForm] = useState({
    eventId: "",
    attendees: "",
    goalsScore: "3",
    notes: "",
    photoUrls: [] as string[],
    attendanceUrl: "",
    surveyUrl: "",
  });

  
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
        
        const r1 = await fetch(`/api/events/requests?eventId=${encodeURIComponent(form.eventId)}`, {
          cache: "no-store",
          headers: buildSessionHeaders(false),
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
        
        const r2 = await fetch(`/api/events/${encodeURIComponent(form.eventId)}`, {
          cache: "no-store",
          headers: buildSessionHeaders(false),
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
      } catch {
        setReqDetails(null);
      }
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

  async function onUpload(kind: "photo" | "attendance" | "survey", f?: File | null) {
    if (!f) return;
    setSaving(true); setMsg({});
    try {
      const url = await uploadOne(f);
      if (kind === "photo") setForm(p => ({ ...p, photoUrls: [...p.photoUrls, url] }));
      if (kind === "attendance") setForm(p => ({ ...p, attendanceUrl: url }));
      if (kind === "survey") setForm(p => ({ ...p, surveyUrl: url }));
    } catch (e:any) {
      setMsg({ err: e?.message || "فشل الرفع" });
    } finally { setSaving(false); }
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

    setSaving(true);
    try {
      const payload = {
        eventId: form.eventId,
        attendees: n,
        goalsScore: Number(form.goalsScore || 0),
        notes: form.notes || "",
        files: {
          photos: form.photoUrls,
          attendance: form.attendanceUrl || null,
          survey: form.surveyUrl || null,
        },
      };
      const r = await fetch("/api/new-evaluations", {
        method: "POST",
        headers: buildSessionHeaders(true),
        body: JSON.stringify(payload),
      });
      const raw = await r.text();
      const data = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
      if (!r.ok) throw new Error(data?.error || raw || "تعذر إرسال التقييم");

      setMsg({ ok: "تم إرسال تقييمك بنجاح." });
      setForm({ eventId:"", attendees:"", goalsScore:"3", notes:"", photoUrls:[], attendanceUrl:"", surveyUrl:"" });
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

            {}
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

            {}
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

            {}
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <Label>عدد الحضور</Label>
                <Input
                  type="number"
                  min={0}
                  max={reqDetails?.attendeesTarget ?? undefined}
                  value={form.attendees}
                  onChange={(e)=>setForm(p=>({...p, attendees:e.target.value}))}
                />
                {reqDetails?.attendeesTarget != null && (
                  <p className="text-xs text-[#6B6B6B]">الحد الأقصى: {reqDetails.attendeesTarget}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>نسبة تحقيق الأهداف (1–5)</Label>
                <Select value={form.goalsScore} onValueChange={(v)=>setForm(p=>({...p, goalsScore:v}))}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ background:"#F6F6F6", borderColor:"#E3E3E3" }}>
                    <SelectValue placeholder="اختر الدرجة" />
                  </SelectTrigger>
                  <SelectContent>{["1","2","3","4","5"].map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>ملاحظاتك</Label>
                <textarea
                  className="w-full min-h-[110px] rounded-xl p-3 border"
                  style={{ background:"#F6F6F6", borderColor:"#E3E3E3" }}
                  value={form.notes}
                  onChange={(e)=>setForm(p=>({...p, notes:e.target.value}))}
                />
              </div>

              <div className="space-y-2">
                <Label>رفع صورة (يمكن عدة صور)</Label>
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

              <div className="space-y-2">
                <Label>قائمة الحضور (PDF/صورة)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={(e)=>onUpload("attendance", e.target.files?.[0] || null)} />
                {form.attendanceUrl && <TinyPreview url={form.attendanceUrl} />}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>تقرير استطلاع الرأي (PDF/صورة)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={(e)=>onUpload("survey", e.target.files?.[0] || null)} />
                {form.surveyUrl && <TinyPreview url={form.surveyUrl} />}
              </div>

              <div className="md:col-span-2">
                <Button disabled={saving || !form.eventId} className="h-11 rounded-full font-semibold" style={{ background:PALETTE.red, color:"#fff" }}>
                  {saving ? "جارٍ الإرسال..." : "إرسال التقييم"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
      <FooterBar />

      {}
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
                <div className="mt-2 text-xs inline-flex items-center px-3 h-7 rounded-full" style={{ background:"#E8F7EE", color:"#0F5132", border:"1px solid #CBE9D6" }}>
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


function Modal({ title, children, onClose }:{
  title: string; children: React.ReactNode; onClose: ()=>void;
}) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify_between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">{title}</div>
            <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg_black/5">
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
