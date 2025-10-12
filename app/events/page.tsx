"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users } from "lucide-react";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "600", "700", "800"], display: "swap" });

type Role = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: Role; entityId?: string | null };

type EventRow = {
  id: string;
  title: string;
  date?: string | null;
  status?: string;
  entityId?: string | null;
  organizerName?: string | null;
  canEvaluate?: boolean;
};

type EntityLite = { id: string; name: string };

const PALETTE = { black: "#1D1D1D", red: "#EC1A24", beige: "#EFE6DE", border: "#E7E2DC", soft:"#F6F6F6", muted:"#6B6B6B" };

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = {};
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}
function isPdf(u?: string|null) { return !!u && /\.pdf($|\?)/i.test(u); }
function isImage(u?: string|null) { return !!u && /\.(png|jpe?g|gif|webp|avif|bmp|svg)($|\?)/i.test(u); }

export default function EventsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string }>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = localStorage.getItem("session");
      if (!raw) return;
      setSession(JSON.parse(raw) as Session);
    } catch {}
  }, [mounted]);

  const isManager = session?.role === "entityManager";
  const isSupervisor = session?.role === "unionSupervisor";

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ backgroundColor: PALETTE.beige }}>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
        @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
        .anim-fadeUp { animation: fadeUp .4s ease both }
        .anim-popIn { animation: popIn .28s ease both }
        .card-hover { transition: transform .25s ease, box-shadow .25s ease }
        .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,.08) }
        .pulse-line { background: linear-gradient(90deg, transparent, #00000010, transparent); background-size: 200% 100%; animation: shimmer 1.2s linear infinite; }
        .soft-blur { backdrop-filter: blur(8px) }
      `}</style>

      <HeaderBar />
      <div className="mx-auto max-w-5xl w-full p-4 anim-fadeUp">
        <Card className="rounded-[22px] border soft-blur anim-popIn" style={{ borderColor: PALETTE.border, background: "#fff" }}>
          <CardHeader className="anim-fadeUp">
            <CardTitle className="text-2xl font-extrabold" style={{ color: PALETTE.black }}>
              {isManager ? "طلب فعالية" : "الفعاليات"}
            </CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>
              {isManager ? "قدّم طلب فعالية لِكيانك" : "عرض الفعاليات حسب صلاحياتك"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {session?.role === "user" ? (
              <div className="p-3 rounded-lg text-sm anim-fadeUp" style={{ color: "#6B6B6B", background: "#F6F6F6", border: `1px solid ${PALETTE.border}` }}>
                إذا كنت مستخدمًا وتريد تقييم فعالية، انتقل إلى صفحة{" "}
                <Link href="/events/evaluate" className="underline">تقييم فعالية</Link>.
              </div>
            ) : isManager ? (
              <>
                <div className="flex items-center gap-2 anim-fadeUp">
                  <Button onClick={()=>setShowBulk(true)} variant="secondary" className="h-10 rounded-full"
                          style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}>
                    استيراد فعاليات من ملف
                  </Button>
                </div>
                <RequestForm
                  entityId={session?.entityId || ""}
                  supervisor={false}
                  onOk={(t) => { setMsg({ ok: t }); window.dispatchEvent(new CustomEvent("events:refresh")); }}
                  onErr={(e) => setMsg({ err: e })}
                />
              </>
            ) : isSupervisor ? (
              <div className="mb-3 anim-fadeUp flex items-center gap-2">
                <Button onClick={()=>setShowAdd(true)} className="h-10 rounded-full px-4" style={{ background: PALETTE.red, color:"#fff" }}>
                  إضافة فعالية
                </Button>
                <Button onClick={()=>setShowBulk(true)} variant="secondary" className="h-10 rounded-full px-4"
                        style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}>
                  استيراد فعاليات من ملف
                </Button>
              </div>
            ) : null}

            {msg.err && (
              <div className="mt-2 p-3 rounded-lg text-sm anim-fadeUp" style={{ color: "#EC1A24", background: "#FDEBEC", border: "1px solid #EC1A2433" }}>
                {msg.err}
              </div>
            )}
            {msg.ok && (
              <div className="mt-2 p-3 rounded-lg text-sm anim-fadeUp" style={{ color: "#0F5132", background: "#E8F7EE", border: "1px solid #CBE9D6" }}>
                {msg.ok}
              </div>
            )}

            <div className="mt-4 anim-fadeUp">
              <h3 className="font-semibold mb-2 flex items-center justify-between" style={{ color: PALETTE.black }}>
                <span>قائمة الفعاليات</span>
              </h3>
              <EventList session={session} />
            </div>
          </CardContent>
        </Card>
      </div>
      <FooterBar />

      {isSupervisor && showAdd && (
        <ModalShell onClose={()=>setShowAdd(false)} title="إضافة فعالية">
          <div className="p-5">
            <RequestForm
              entityId=""
              supervisor={true}
              onOk={(t)=>{ setMsg({ ok:t }); setShowAdd(false); window.dispatchEvent(new CustomEvent("events:refresh")); }}
              onErr={(e)=> setMsg({ err:e })}
            />
          </div>
        </ModalShell>
      )}

      {(isManager || isSupervisor) && showBulk && (
        <BulkEventsImportModal
          supervisor={isSupervisor}
          entityId={String(session?.entityId || "")}
          onClose={()=>setShowBulk(false)}
          onDone={() => { setShowBulk(false); setMsg({ ok:"تم الاستيراد. راجع التقرير للأخطاء إن وجدت." }); window.dispatchEvent(new CustomEvent("events:refresh")); }}
        />
      )}
    </div>
  );
}

function EventList({ session }: { session: Session | null }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ id: string } | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const isSupervisor = session?.role === "unionSupervisor";
  const isEntityMgr  = session?.role === "entityManager";

  const entName = (id?: string | null) =>
    id == null ? "كل الكيانات" : (entities.find(e => String(e.id) === String(id || ""))?.name || "—");

  const scopeText = useMemo(() => {
    const r = session?.role;
    if (r === "entityManager") return "فعاليات كياني";
    if (r === "user") return "الفعاليات المتاحة لي";
    if (r === "unionSupervisor") return "كل فعاليات الكيانات";
    return "الفعاليات";
  }, [session?.role]);

  async function load(mountedRef?: { current: boolean }) {
    try {
      setLoading(true);
      const entsRes = await fetch("/api/entities", { cache: "no-store" });
      const entsJson = await entsRes.json().catch(() => []);
      const ents: EntityLite[] = (Array.isArray(entsJson) ? entsJson : entsJson?.entities || [])
        .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
      if (mountedRef && !mountedRef.current) return;
      setEntities(ents);

      const r = await fetch(`/api/events?scope=mine`, {
        cache: "no-store",
        headers: buildSessionHeaders(false),
      });
      const data: EventRow[] = await r.json().catch(() => []);
      if (mountedRef && !mountedRef.current) return;
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      if (!mountedRef || mountedRef.current !== false) setLoading(false);
    }
  }

  useEffect(() => {
    const mountedRef = { current: true };
    load(mountedRef);
    const handler = () => load(mountedRef);
    window.addEventListener("events:refresh", handler);
    return () => { mountedRef.current = false; window.removeEventListener("events:refresh", handler); };
  }, []);

  async function openDetails(id: string) {
    setOpen({ id });
    setDetail(null);
    try {
      const r = await fetch(`/api/events/${encodeURIComponent(id)}`, { cache: "no-store", headers: buildSessionHeaders(false) });
      const d = await r.json();
      setDetail(d);
    } catch {
      setDetail({ error: "تعذر جلب التفاصيل" });
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl p-3 flex items-center justify-between anim-fadeUp" style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.border}` }}>
        <span className="text-sm" style={{ color: PALETTE.muted }}>{scopeText}</span>
        <span className="h-8 w-28 rounded-full pulse-line" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl p-3 mb-3 flex items-center justify-between anim-fadeUp"
           style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)" }}>
        <span className="text-sm" style={{ color: PALETTE.muted }}>{scopeText}</span>
        <span className="h-8 px-3 rounded-full grid place-items-center text-sm"
              style={{ background: PALETTE.soft, border: `1px solid ${PALETTE.border}`, color: PALETTE.black }}>
          {events.length} فعالية
        </span>
      </div>

      {!events.length ? (
        <div className="rounded-xl p-3 text-sm anim-fadeUp" style={{ background: "#F6F6F6", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted }}>
          لا توجد فعاليات متاحة للعرض.
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((ev, i) => (
            <li
              key={ev.id}
              className="rounded-2xl p-4 flex items-center justify-between cursor-pointer card-hover anim-fadeUp"
              style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)", animationDelay: `${i * 40}ms` }}
              onClick={() => openDetails(ev.id)}
              title="عرض تفاصيل الفعالية"
            >
              <div>
                <div className="font-semibold" style={{ color: PALETTE.black }}>{ev.title || "فعالية بدون عنوان"}</div>
                <div className="text-sm" style={{ color: PALETTE.muted }}>
                  {ev.date ? new Date(ev.date).toLocaleDateString("ar-EG") : "بدون تاريخ"} •
                  {" "}النطاق: {entName(ev.entityId ?? null)} •
                  {" "}الحالة: {ev.status || "—"} •
                  {" "}المنظِّم: {ev.organizerName || "—"}
                </div>
              </div>
              <div className="flex items-center gap-2" onClick={(e)=>e.stopPropagation()}>
                {isSupervisor || isEntityMgr ? (
                  <Link
                    href={`/events/evaluations?eventId=${encodeURIComponent(ev.id)}`}
                    className="h-9 px-3 rounded-full text-sm"
                    style={{ background: PALETTE.red, color:"#fff" }}
                    title="عرض تقييمات هذه الفعالية"
                  >
                    عرض التقييمات
                  </Link>
                ) : session?.role !== "unionSupervisor" && ev.canEvaluate ? (
                  <Link
                    href={`/events/evaluate?eventId=${encodeURIComponent(ev.id)}`}
                    className="h-9 px-3 rounded-full text-sm"
                    style={{ background: PALETTE.soft, border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}
                  >
                    تقييم
                  </Link>
                ) : session?.role !== "unionSupervisor" ? (
                  <button
                    className="h-9 px-3 rounded-full text-sm opacity-60 cursor-not-allowed"
                    style={{ background: PALETTE.soft, border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}
                    title="التقييم متاح للحضور فقط"
                    disabled
                  >
                    تقييم
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <EventDetailsModal
          id={open.id}
          detail={detail}
          onClose={()=>setOpen(null)}
          canEdit={Boolean(isSupervisor || isEntityMgr)}
          entityName={(() => {
            const eid = detail?.entityId ?? events.find(e => e.id === open.id)?.entityId;
            return entName(eid ?? null);
          })()}
        />
      )}
    </>
  );
}

function EventDetailsModal({
  id, detail, onClose, canEdit, entityName
}: { id: string; detail: any; onClose: ()=>void; canEdit: boolean; entityName?: string }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: detail?.title || "",
    date: detail?.date || "",
    status: detail?.status || "draft",
  });

  useEffect(() => {
    if (!detail) return;
    setForm({
      title: detail?.title || "",
      date: detail?.date || "",
      status: detail?.status || "draft",
    });
  }, [detail]);

  async function patchEvent() {
    setSaving(true);
    try {
      const r = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        body: JSON.stringify(form),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "فشل التعديل");
      }
      onClose();
      window.dispatchEvent(new CustomEvent("events:refresh"));
    } catch {} finally { setSaving(false); }
  }

  async function deleteEvent() {
    if (!confirm("هل أنت متأكد من حذف الفعالية؟ لا يمكن التراجع.")) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/events/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: buildSessionHeaders(false),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "فشل الحذف");
      }
      onClose();
      window.dispatchEvent(new CustomEvent("events:refresh"));
    } catch {} finally { setSaving(false); }
  }

  const req = detail?.details || {};
  const filesRaw = req?.files;
  const files =
    filesRaw && Array.isArray(filesRaw)
      ? filesRaw.reduce((acc: any, it: any) => {
          const label = String(it?.label || "");
          const url = it?.url || null;
          if (!url) return acc;
          if (/ميزانية|budget/i.test(label)) acc.budgetPdf = url;
          else if (/خطة|plan/i.test(label)) acc.miniPlanPdf = url;
          else if (/برنامج|program|timeline/i.test(label)) acc.programPdf = url;
          else if (/ترويج|brief/i.test(label)) acc.briefPlanPdf = url;
          return acc;
        }, {} as any)
      : (filesRaw || {});

  return (
    <ModalShell onClose={onClose} title="تفاصيل الفعالية">
      <div className="p-5 space-y-4">
        {!detail ? (
          <div className="text-sm text-[#666]">جارِ التحميل…</div>
        ) : detail?.error ? (
          <div className="text-sm text-red-600">{detail.error}</div>
        ) : (
          <>
            <div className="rounded-xl border p-4 anim-fadeUp" style={{ borderColor:"#EDE8E1", background:"#FAFAFA" }}>
              <div className="font-semibold">{detail.title || "—"}</div>
              <div className="text-sm text-[#666]">
                {detail.date ? new Date(detail.date).toLocaleDateString("ar-EG") : "بدون تاريخ"} •{" "}
                الحالة: {detail.status || "—"} •{" "}
                عدد التقييمات: {detail.evalCount ?? 0}
              </div>
            </div>

            <div className="rounded-xl border p-3 anim-fadeUp" style={{ borderColor:"#EDE8E1", background:"#FFF" }}>
              <div className="text-sm" style={{ color:"#333" }}>
                المنظِّم: <span className="font-semibold">{detail?.organizerName || detail?.approvedByName || detail?.createdByName || "—"}</span>
              </div>
              <div className="text-xs mt-1" style={{ color:"#666" }}>
                النطاق: <span className="font-medium">{entityName || (detail?.entityId ? "—" : "كل الكيانات")}</span> •{" "}
                مسئول اتحاد الكيانات: <span className="font-medium">{detail?.approvedByName || "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {req?.venue &&   <Field label="عنوان/مقر الفعالية" value={req.venue} />}
              {req?.supportType && <Field label="نوع الدعم" value={req.supportType} />}
              {req?.attendeesTarget != null && <Field label="العدد المستهدف" value={String(req.attendeesTarget)} />}
              {req?.goals &&    <Field label="الأهداف الرئيسية" value={req.goals} wide />}
              {req?.audience && <Field label="الجمهور المستهدف" value={req.audience} wide />}
              {req?.speakers && <Field label="المتحدثون" value={req.speakers} wide />}
            </div>

            {(files?.budgetPdf || files?.miniPlanPdf || files?.programPdf || files?.briefPlanPdf) && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <FileBox title="ميزانية تقديرية" url={files?.budgetPdf} />
                <FileBox title="خطة النشاط" url={files?.miniPlanPdf} />
                <FileBox title="برنامج الفعالية" url={files?.programPdf} />
                <FileBox title="خطة ترويج مختصرة" url={files?.briefPlanPdf} />
              </div>
            )}

            {canEdit && (
              <div className="mt-2 rounded-xl border p-4 space-y-3 anim-fadeUp" style={{ borderColor:"#EDE8E1" }}>
                <div className="font-semibold mb-2">تحرير سريع</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[#777]">العنوان</label>
                    <input
                      className="w-full h-10 rounded-lg border px-3"
                      value={form.title}
                      onChange={e=>setForm(p=>({...p, title:e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#777]">التاريخ</label>
                    <input
                      type="date"
                      className="w-full h-10 rounded-lg border px-3"
                      value={form.date || ""}
                      onChange={e=>setForm(p=>({...p, date:e.target.value}))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#777]">الحالة</label>
                    <select
                      className="w-full h-10 rounded-lg border px-3"
                      value={form.status}
                      onChange={e=>setForm(p=>({...p, status:e.target.value}))}
                    >
                      {["requested","draft","approved","rejected","cancelled","done","evaluated"].map(s=>
                        <option key={s} value={s}>{s}</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={saving}
                    onClick={patchEvent}
                    className="h-10 px-4 rounded-full text-white"
                    style={{ background: PALETTE.red }}
                  >
                    {saving ? "جارِ الحفظ..." : "حفظ التعديلات"}
                  </button>
                  <button
                    disabled={saving}
                    onClick={deleteEvent}
                    className="h-10 px-4 rounded-full border"
                    style={{ borderColor: PALETTE.border }}
                  >
                    حذف الفعالية
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
}

function Field({ label, value, wide=false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`${wide ? "md:col-span-2" : ""} anim-fadeUp`}>
      <div className="text-[12px] text-[#888] mb-1">{label}</div>
      <div className="rounded-lg border px-3 py-2 bg-white" style={{ borderColor:"#EDE8E1" }}>{value}</div>
    </div>
  );
}

function FileBox({ title, url }: { title: string; url?: string|null }) {
  if (!url) {
    return <div className="rounded-lg border p-3 bg-white text-[#999] anim-fadeUp" style={{ borderColor:"#EDE8E1" }}>{title}: لا يوجد</div>;
  }
  return (
    <div className="rounded-lg border p-3 bg-white anim-fadeUp" style={{ borderColor:"#EDE8E1" }}>
      <div className="text-sm mb-2">{title}</div>
      {isPdf(url) ? (
        <iframe src={url} className="w-full h-48 rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : isImage(url) ? (
        <img src={url} alt={title} className="w-full h-48 object-cover rounded border" style={{ borderColor:"#F1EEE8" }} />
      ) : (
        <div className="text-xs break-all text-[#666]">{url}</div>
      )}
      <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs underline">فتح</a>
    </div>
  );
}

function RequestForm({
  entityId,
  supervisor,
  onOk,
  onErr,
}: {
  entityId: string;
  supervisor: boolean;
  onOk: (t: string) => void;
  onErr: (t: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [scope, setScope] = useState<"all" | "entity">(supervisor ? "all" : "entity");
  const [targetEntityId, setTargetEntityId] = useState<string>(supervisor ? "" : (entityId || ""));

  const [form, setForm] = useState({
    name: "",
    date: "",
    attendeesTarget: "",
    venue: "",
    goals: "",
    audience: "",
    speakers: "",
    supportType: "",
    planPdf: null as File | null,
    timelinePdf: null as File | null,
    budgetPdf: null as File | null,
    briefPlanPdf: null as File | null,
  });

  useEffect(() => {
    if (!supervisor) return;
    (async () => {
      try {
        const r = await fetch("/api/entities", { cache: "no-store" });
        const j = await r.json().catch(() => []);
        const ents: EntityLite[] = (Array.isArray(j) ? j : j?.entities || [])
          .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
        setEntities(ents);
      } catch {}
    })();
  }, [supervisor]);

  async function uploadOne(file?: File | null): Promise<string | null> {
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", {
      method: "POST",
      headers: buildSessionHeaders(false),
      body: fd,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || "فشل رفع الملف");
    return data?.url || null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onOk(""); onErr("");
    if (!form.name.trim()) return onErr("اسم الفعالية مطلوب");
    if (supervisor && scope === "entity" && !targetEntityId) return onErr("يرجى اختيار الكيان");

    setSaving(true);
    try {
      const planUrl     = await uploadOne(form.planPdf);
      const timelineUrl = await uploadOne(form.timelinePdf);
      const budgetUrl   = await uploadOne(form.budgetPdf);
      const briefUrl    = await uploadOne(form.briefPlanPdf);

      const payload: any = {
        name: form.name.trim(),
        date: form.date || null,
        attendeesTarget: Number(form.attendeesTarget || 0),
        venue: form.venue || "",
        goals: form.goals || "",
        audience: form.audience || "",
        speakers: form.speakers || "",
        supportType: form.supportType || "",
        files: [
          planUrl && { label: "خطة النشاط", url: planUrl },
          timelineUrl && { label: "برنامج الفعالية", url: timelineUrl },
          budgetUrl && { label: "ميزانية تقديرية", url: budgetUrl },
          briefUrl && { label: "خطة ترويج مختصرة", url: briefUrl },
        ].filter(Boolean),
      };

      if (supervisor) {
        if (scope === "all") {
          payload.public = true;
        } else {
          payload.entityId = targetEntityId;
        }
      } else {
        payload.entityId = entityId;
      }

      const r = await fetch("/api/events/requests", {
        method: "POST",
        headers: buildSessionHeaders(true),
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "تعذر إرسال الطلب");

      onOk("تم إرسال طلب الفعالية بنجاح.");
      window.dispatchEvent(new CustomEvent("events:refresh"));
      setForm({
        name: "", date: "", attendeesTarget: "", venue: "", goals: "",
        audience: "", speakers: "", supportType: "",
        planPdf: null, timelinePdf: null, budgetPdf: null, briefPlanPdf: null,
      });
      setScope(supervisor ? "all" : "entity");
      setTargetEntityId(supervisor ? "" : (entityId || ""));
    } catch (e: any) {
      onErr(e?.message || "فشل إرسال الطلب");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 anim-fadeUp">
      {supervisor && (
        <div className="space-y-2 md:col-span-2">
          <Label>نطاق الفعالية *</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              className="h-11 w-full rounded-xl border px-3"
              value={scope}
              onChange={(e)=> setScope(e.target.value as "all" | "entity")}
            >
              <option value="all">كل الكيانات</option>
              <option value="entity">كيان محدد</option>
            </select>
            {scope === "entity" && (
              <select
                className="h-11 w-full rounded-xl border px-3"
                value={targetEntityId}
                onChange={(e)=> setTargetEntityId(e.target.value)}
              >
                <option value="">— اختر كيان —</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>اسم الفعالية *</Label>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>تاريخ الفعالية</Label>
        <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>عدد الحضور</Label>
        <Input type="number" value={form.attendeesTarget} onChange={(e) => setForm({ ...form, attendeesTarget: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>عنوان/مقر الفعالية</Label>
        <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>الأهداف الرئيسية للفعالية</Label>
        <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>الجمهور المستهدف</Label>
        <Textarea value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>المتحدثون</Label>
        <Textarea value={form.speakers} onChange={(e) => setForm({ ...form, speakers: e.target.value })} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>نوع الدعم المطلوب *</Label>
        <select
          className="h-11 w-full rounded-xl border px-3"
          value={form.supportType}
          onChange={(e) => setForm({ ...form, supportType: e.target.value })}
        >
          <option value="">اختر نوع الدعم</option>
          <option value="لوجيستي">لوجيستي</option>
          <option value="إعلامي">إعلامي</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label>خطة الفعالية (PDF)</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, planPdf: e.target.files?.[0] || null })} />
      </div>
      <div className="space-y-2">
        <Label>ميزانية تقديرية (PDF)</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, budgetPdf: e.target.files?.[0] || null })} />
      </div>
      <div className="space-y-2">
        <Label>برنامج الفعالية (PDF)</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, timelinePdf: e.target.files?.[0] || null })} />
      </div>
      <div className="space-y-2">
        <Label>خطة ترويج مختصرة (PDF)</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, briefPlanPdf: e.target.files?.[0] || null })} />
      </div>
      <div className="md:col-span-2">
        <Button disabled={saving} className="rounded-full" style={{ backgroundColor: "#EC1A24", color: "#fff" }}>
          {saving ? "جارٍ الإرسال..." : "إرسال النموذج"}
        </Button>
      </div>
    </form>
  );
}

function ModalShell({ children, onClose, title }: { children: React.ReactNode; onClose: ()=>void; title: string }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl anim-popIn soft-blur" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">{title}</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function BulkEventsImportModal({
  supervisor = false,
  entityId,
  onClose,
  onDone,
}: {
  supervisor?: boolean;
  entityId: string;
  onClose: ()=>void;
  onDone: ()=>void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [textReport, setTextReport] = useState<string | null>(null);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [scope, setScope] = useState<"all"|"entity">(supervisor ? "all" : "entity");
  const [targetEntityId, setTargetEntityId] = useState<string>(supervisor ? "" : entityId);

  useEffect(() => {
    if (!supervisor) return;
    (async () => {
      try {
        const r = await fetch("/api/entities", { cache: "no-store" });
        const j = await r.json().catch(() => []);
        const ents: EntityLite[] = (Array.isArray(j) ? j : j?.entities || [])
          .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
        setEntities(ents);
      } catch {}
    })();
  }, [supervisor]);

  const downloadTemplate = () => {
    const header = "name,date,attendeesTarget,venue,goals,audience,speakers,supportType,planUrl,timelineUrl,budgetUrl,briefPlanUrl\n";
    const example = "فعالية تعريفية,2025-11-20,120,قاعة الشباب,أهداف عامة,الطلاب,متحدث 1;متحدث 2,لوجيستي,https://x/plan.pdf,https://x/timeline.pdf,https://x/budget.pdf,https://x/brief.pdf\n";
    const csv = header + example;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "events_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = async (file: File) => {
    setErr(""); setRows([]); setTextReport(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErr("الرجاء رفع ملف CSV فقط.");
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { setErr("الملف فارغ."); return; }

    const header = lines[0].split(",").map(h=>h.trim().toLowerCase());
    const needed = ["name","date","attendeestarget","venue","goals","audience","speakers","supporttype"];
    if (!needed.every(c => header.includes(c))) {
      setErr(`الأعمدة المطلوبة: ${needed.join(",")}`);
      return;
    }
    const idx = Object.fromEntries(header.map((h,i)=>[h,i]));
    const optional = { planUrl:"planurl", timelineUrl:"timelineurl", budgetUrl:"budgeturl", briefPlanUrl:"briefplanurl" } as const;

    const data:any[] = [];
    for (let i=1; i<lines.length; i++) {
      const parts = lines[i].split(",");
      if (!parts.length) continue;
      const name = parts[idx["name"]]?.trim() || "";
      if (!name) { setErr(`صف ${i+1}: الاسم مطلوب`); return; }
      const row:any = {
        name,
        date: parts[idx["date"]]?.trim() || "",
        attendeesTarget: Number(parts[idx["attendeestarget"]] || 0),
        venue: parts[idx["venue"]]?.trim() || "",
        goals: parts[idx["goals"]]?.trim() || "",
        audience: parts[idx["audience"]]?.trim() || "",
        speakers: parts[idx["speakers"]]?.trim() || "",
        supportType: parts[idx["supporttype"]]?.trim() || "",
        files: [] as any[],
      };

      const planUrl      = optional.planUrl      in idx ? parts[idx[optional.planUrl]]?.trim() : "";
      const timelineUrl  = optional.timelineUrl  in idx ? parts[idx[optional.timelineUrl]]?.trim() : "";
      const budgetUrl    = optional.budgetUrl    in idx ? parts[idx[optional.budgetUrl]]?.trim() : "";
      const briefPlanUrl = optional.briefPlanUrl in idx ? parts[idx[optional.briefPlanUrl]]?.trim() : "";

      if (planUrl)      row.files.push({ label:"خطة النشاط", url:planUrl });
      if (timelineUrl)  row.files.push({ label:"برنامج الفعالية", url:timelineUrl });
      if (budgetUrl)    row.files.push({ label:"ميزانية تقديرية", url:budgetUrl });
      if (briefPlanUrl) row.files.push({ label:"خطة ترويج مختصرة", url:briefPlanUrl });

      data.push(row);
    }
    setRows(data);
  };

  const send = async () => {
    setErr(""); setTextReport(null);
    if (!rows.length) { setErr("لم يتم تحميل أي صفوف بعد."); return; }
    if (supervisor && scope === "entity" && !targetEntityId) { setErr("يرجى اختيار الكيان قبل الاستيراد."); return; }
    for (let i=0;i<rows.length;i++){
      const r = rows[i];
      if (!r.name?.trim()) return setErr(`صف ${i+2}: الاسم مطلوب`);
      if (r.attendeesTarget != null && Number.isNaN(Number(r.attendeesTarget))) return setErr(`صف ${i+2}: attendeesTarget غير صالح`);
    }
    const prepared = rows.map(r => {
      if (supervisor) {
        if (scope === "all") return { ...r, public: true };
        return { ...r, entityId: targetEntityId };
      }
      return { ...r, entityId };
    });

    setSaving(true);
    try {
      const res = await fetch("/api/events/requests/bulk", {
        method: "POST",
        headers: buildSessionHeaders(true),
        body: JSON.stringify({ rows: prepared }),
      });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) {
        setErr(data?.error || "فشل الاستيراد");
        return;
      }
      const results = data?.results || [];
      const ok = results.filter((r:any)=>r.ok).length;
      const fail = results.length - ok;
      const lines = [`إجمالي الصفوف: ${results.length}`, `نجاح: ${ok}`, `فشل: ${fail}`];
      for (const r of results) if (!r.ok) lines.push(`صف ${r.index + 2}: ${r.error}`);
      setTextReport(lines.join("\n"));
      onDone();
    } catch {
      setErr("تعذر الاتصال بخادم الاستيراد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="استيراد فعاليات من CSV">
      <div className="p-5 space-y-4">
        {supervisor && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <span className="text-sm" style={{ color: PALETTE.black }}>النطاق</span>
              <select
                className="h-11 w-full rounded-xl border px-3"
                value={scope}
                onChange={(e)=> setScope(e.target.value as "all"|"entity")}
              >
                <option value="all">كل الكيانات</option>
                <option value="entity">كيان محدد</option>
              </select>
            </div>
            {scope === "entity" && (
              <div className="space-y-1 md:col-span-2">
                <span className="text-sm" style={{ color: PALETTE.black }}>اختر الكيان</span>
                <select
                  className="h-11 w-full rounded-xl border px-3"
                  value={targetEntityId}
                  onChange={(e)=> setTargetEntityId(e.target.value)}
                >
                  <option value="">— اختر كيان —</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {!supervisor && (
          <div className="rounded-lg border p-3 text-sm" style={{ borderColor: PALETTE.border, color: PALETTE.muted, background:"#fff" }}>
            سيتم إضافة جميع الصفوف إلى كيانك الحالي تلقائيًا.
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={downloadTemplate} variant="secondary" className="h-9 rounded-full"
                  style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, color: PALETTE.black }}>
            تنزيل القالب
          </Button>
        </div>

        <div className="space-y-1">
          <span className="text-sm" style={{ color: PALETTE.black }}>ملف CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && parseCSV(e.target.files[0])} />
          <div className="text-xs" style={{ color: PALETTE.muted }}>
            الأعمدة المطلوبة: <code>name,date,attendeesTarget,venue,goals,audience,speakers,supportType</code> — اختيارية: <code>planUrl,timelineUrl,budgetUrl,briefPlanUrl</code>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="rounded-xl p-3" style={{ background: "#F9F9F9", border: `1px solid ${PALETTE.border}` }}>
            <div className="mb-2 text-sm" style={{ color: PALETTE.black }}>تمت قراءة {rows.length} صفًا.</div>
            <div className="max-h-40 overflow-auto text-xs" dir="ltr" style={{ color: "#333" }}>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left pr-2">name</th>
                    <th className="text-left pr-2">date</th>
                    <th className="text-left pr-2">attendeesTarget</th>
                    <th className="text-left pr-2">venue</th>
                    <th className="text-left pr-2">supportType</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i}>
                      <td className="pr-2">{r.name}</td>
                      <td className="pr-2">{r.date}</td>
                      <td className="pr-2">{r.attendeesTarget}</td>
                      <td className="pr-2">{r.venue}</td>
                      <td className="pr-2">{r.supportType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && <div className="mt-1">…</div>}
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-xl p-2 text-sm" style={{ background: "#FFF1F1", border: "1px solid #F2CACA", color: "#B00020" }}>
            {err}
          </div>
        )}
        {textReport && (
          <div className="rounded-xl p-2 text-xs whitespace-pre-wrap" style={{ background: "#E8FFF1", border: "1px solid #C6F2D9", color: "#2D6A4F" }}>
            {textReport}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={send} disabled={saving || rows.length === 0} className="h-11 rounded-full"
                  style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
            {saving ? "جارٍ الاستيراد…" : "بدء الاستيراد"}
          </Button>
          <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full"
                  style={{ background: "#fff", border: `1px solid ${PALETTE.border}`, color: PALETTE.black }}>
            إلغاء
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function HeaderBar() {
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
            <Link href="/" className="font-semibold" style={{ color: PALETTE.black }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/profile", label: "الملف الشخصي" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
            ].map(l => (
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
