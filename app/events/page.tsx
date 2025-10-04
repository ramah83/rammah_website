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
      <HeaderBar />
      <div className="mx-auto max-w-5xl w-full p-4">
        <Card className="rounded-[22px] border" style={{ borderColor: PALETTE.border, background: "#fff" }}>
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold" style={{ color: PALETTE.black }}>
              {isManager ? "طلب فعالية" : "الفعاليات"}
            </CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>
              {isManager ? "قدّم طلب فعالية لِكيانك" : "عرض الفعاليات حسب صلاحياتك"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {session?.role === "user" ? (
              <div className="p-3 rounded-lg text-sm mb-4" style={{ color: "#6B6B6B", background: "#F6F6F6", border: `1px solid ${PALETTE.border}` }}>
                إذا كنت مستخدمًا وتريد تقييم فعالية، انتقل إلى صفحة{" "}
                <Link href="/events/evaluate" className="underline">تقييم فعالية</Link>.
              </div>
            ) : session?.role === "entityManager" ? (
              <RequestForm
                entityId={session?.entityId || ""}
                supervisor={false}
                onOk={(t) => setMsg({ ok: t })}
                onErr={(e) => setMsg({ err: e })}
              />
            ) : isSupervisor ? (
              <div className="mb-3">
                <Button onClick={()=>setShowAdd(true)} className="h-10 rounded-full px-4" style={{ background: PALETTE.red, color:"#fff" }}>
                  إضافة فعالية
                </Button>
              </div>
            ) : null}

            {msg.err && (
              <div className="mt-4 p-3 rounded-lg text-sm" style={{ color: "#EC1A24", background: "#FDEBEC", border: "1px solid #EC1A2433" }}>
                {msg.err}
              </div>
            )}
            {msg.ok && (
              <div className="mt-4 p-3 rounded-lg text-sm" style={{ color: "#0F5132", background: "#E8F7EE", border: "1px solid #CBE9D6" }}>
                {msg.ok}
              </div>
            )}

            <div className="mt-6">
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
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowAdd(false)} />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl" style={{ borderColor:"#E7E2DC" }}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
                <div className="font-semibold">إضافة فعالية</div>
                <button onClick={()=>setShowAdd(false)} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
              </div>
              <div className="p-5">
                <RequestForm
                  entityId=""
                  supervisor={true}
                  onOk={(t)=>{ setMsg({ ok:t }); setShowAdd(false); location.reload(); }}
                  onErr={(e)=> setMsg({ err:e })}
                />
              </div>
            </div>
          </div>
        </div>
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const entsRes = await fetch("/api/entities", { cache: "no-store" });
        const entsJson = await entsRes.json().catch(() => []);
        const ents: EntityLite[] = (Array.isArray(entsJson) ? entsJson : entsJson?.entities || [])
          .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
        if (!mounted) return;
        setEntities(ents);

        const r = await fetch(`/api/events?scope=mine`, {
          cache: "no-store",
          headers: buildSessionHeaders(false),
        });
        const data: EventRow[] = await r.json().catch(() => []);
        if (!mounted) return;
        setEvents(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setEvents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
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
      <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.border}` }}>
        <span className="text-sm" style={{ color: PALETTE.muted }}>{scopeText}</span>
        <span className="h-8 w-20 rounded-full animate-pulse" style={{ background: "#0001" }} />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl p-3 mb-3 flex items-center justify-between"
           style={{ background: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)" }}>
        <span className="text-sm" style={{ color: PALETTE.muted }}>{scopeText}</span>
        <span className="h-8 px-3 rounded-full grid place-items-center text-sm"
              style={{ background: PALETTE.soft, border: `1px solid ${PALETTE.border}`, color: PALETTE.black }}>
          {events.length} فعالية
        </span>
      </div>

      {!events.length ? (
        <div className="rounded-xl p-3 text-sm" style={{ background: "#F6F6F6", border: `1px solid ${PALETTE.border}`, color: PALETTE.muted }}>
          لا توجد فعاليات متاحة للعرض.
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map(ev => (
            <li
              key={ev.id}
              className="rounded-2xl p-4 flex items-center justify-between cursor-pointer"
              style={{ background:"#fff", border:`1px solid ${PALETTE.border}`, boxShadow:"0 6px 12px rgba(0,0,0,0.04)" }}
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
                {session?.role !== "unionSupervisor" && ev.canEvaluate ? (
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
      location.reload();
    } catch (e:any) {}
    finally { setSaving(false); }
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
      location.reload();
    } catch (e:any) {}
    finally { setSaving(false); }
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
          else if (/برنامج|program/i.test(label)) acc.programPdf = url;
          return acc;
        }, {} as any)
      : (filesRaw || {});

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">تفاصيل الفعالية</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>

          <div className="p-5 space-y-4">
            {!detail ? (
              <div className="text-sm text-[#666]">جارِ التحميل…</div>
            ) : detail?.error ? (
              <div className="text-sm text-red-600">{detail.error}</div>
            ) : (
              <>
                <div className="rounded-xl border p-4" style={{ borderColor:"#EDE8E1", background:"#FAFAFA" }}>
                  <div className="font-semibold">{detail.title || "—"}</div>
                  <div className="text-sm text-[#666]">
                    {detail.date ? new Date(detail.date).toLocaleDateString("ar-EG") : "بدون تاريخ"} •{" "}
                    الحالة: {detail.status || "—"} •{" "}
                    عدد التقييمات: {detail.evalCount ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border p-3" style={{ borderColor:"#EDE8E1", background:"#FFF" }}>
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

                {(files?.budgetPdf || files?.miniPlanPdf || files?.programPdf) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <FileBox title="ميزانية تقديرية" url={files?.budgetPdf} />
                    <FileBox title="خطة ترويج مختصرة" url={files?.miniPlanPdf} />
                    <FileBox title="برنامج الفعالية" url={files?.programPdf} />
                  </div>
                )}

                {canEdit && (
                  <div className="mt-4 rounded-xl border p-4 space-y-3" style={{ borderColor:"#EDE8E1" }}>
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

function FileBox({ title, url }: { title: string; url?: string|null }) {
  if (!url) {
    return <div className="rounded-lg border p-3 bg-white text-[#999]" style={{ borderColor:"#EDE8E1" }}>{title}: لا يوجد</div>;
  }
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
    if (scope === "entity") {
      const chosenId = supervisor ? targetEntityId : (entityId || "");
      if (!chosenId) return onErr("يرجى اختيار الكيان");
    }

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
      setForm({
        name: "", date: "", attendeesTarget: "", venue: "", goals: "",
        audience: "", speakers: "", supportType: "",
        planPdf: null, timelinePdf: null, budgetPdf: null, briefPlanPdf: null,
      });
      if (supervisor) { setScope("all"); setTargetEntityId(""); }
    } catch (e: any) {
      onErr(e?.message || "فشل إرسال الطلب");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {supervisor && (
        <>
          <div className="space-y-2">
            <Label>نطاق الفعالية *</Label>
            <select
              className="h-11 w-full rounded-xl border px-3"
              value={scope}
              onChange={(e)=> setScope(e.target.value as "all" | "entity")}
            >
              <option value="all">كل الكيانات</option>
              <option value="entity">كيان محدد</option>
            </select>
          </div>

          {scope === "entity" && (
            <div className="space-y-2">
              <Label>اختر الكيان *</Label>
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
            </div>
          )}
        </>
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

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border shadow-[0_6px_12px_rgba(0,0,0,0.04)]" style={{ borderColor: PALETTE.border }}>
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
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#595959" }}>
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
