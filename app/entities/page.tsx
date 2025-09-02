"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Save, Edit2, Search, Users, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

type Entity = {
  id: string; name: string; type?: string; contactEmail?: string; phone?: string;
  location?: string; documents?: string[]; createdAt: string; createdBy?: string | null;
};

type FormState = { name: string; type: string; contactPhone: string; contactEmail: string; city: string; address: string };

const ALLOWED_ENTITY_NAMES: string[] = [
  "كيان سند شباب الصعيد","كيان اتحاد شباب الاقصر","كيان رواد التطوير و التنميه الشبابيه بمحافظه","كيان المصريون الشباب",
  "كيان اراده شباب مصر","كيان شباب بحري","رواد المحافظات الحدوديه","كيان الجبهه الدبلوماسيه المصريه","كيان كوادر شباب مصر",
  "كيان اتحاد طلاب مصر","كيان سند شباب الدلتا","كيان الجيل الشبابي الصاعد","كيان الشباب بناة المستقبل","كيان قيادات شباب مصر",
  "كيان مشروع وطن","كيان اتحاد شباب كفر الشيخ","كيان الاتحاد الشبابي لدعم مصر","كيان إرادة شباب مصر بالغربية","كيان شباب مستدام",
  "كيان رحلة شباب الجمهورية الجديدة","كيان أكاديمية الكوري بسوهاج","كيان أتحاد شباب الوطن بسوهاج","كيان حلم مصر بسوهاج",
  "كيان تيم القمه بسوهاج","كيان تيم الشيمي بسوهاج","كيان جيل قادر بسوهاج","كيان مراكز شباب مصر","كيان فكرة","الاتحاد الوطني للقيادات الشبابية",
  "كيان فن إدارة الحياة","كيان تنمية وطن","كيان حكاية إشارة","كيان رموز شباب مصر","كيان شباب يبني وطن","كيان صناع الفرص","كيان شباب مراكز مصر",
  "كيان مهندسون من أجل مصر المستدامة","كيان شباب قادرون",
];

type EntityPreset = Partial<FormState>;
const ENTITY_PRESETS: Record<string, EntityPreset> = {
  "الاتحاد الوطني للقيادات الشبابية": { type:"اتحاد قيادات", contactPhone:"01288888888", contactEmail:"national@leaders-eg.org", city:"القاهرة", address:"وسط البلد - ميدان التحرير" },
  "رواد المحافظات الحدوديه": { type:"تجمّع شبابي", contactPhone:"01066666666", contactEmail:"pioneers@border-govs.org", city:"مرسى مطروح", address:"شارع الجلاء - مرسى مطروح" },
  "كيان اتحاد شباب الاقصر": { type:"اتحاد شبابي", contactPhone:"01011111111", contactEmail:"contact@luxor-youth.org", city:"الأقصر", address:"الكورنيش - بجوار مجلس المدينة" },
  "كيان اتحاد شباب كفر الشيخ": { type:"اتحاد شبابي", contactPhone:"01155555555", contactEmail:"info@kfs-youth.org", city:"كفر الشيخ", address:"شارع الجيش - كفر الشيخ" },
  "كيان اتحاد طلاب مصر": { type:"اتحاد طلابي", contactPhone:"01099999999", contactEmail:"union@students-eg.org", city:"القاهرة", address:"مدينة نصر - الحي السابع" },
  "كيان أتحاد شباب الوطن بسوهاج": { type:"اتحاد شبابي", contactPhone:"01211111111", contactEmail:"union@watanyouth-sohag.org", city:"سوهاج", address:"شارع النيل - سوهاج" },
  "كيان أكاديمية الكوري بسوهاج": { type:"أكاديمية", contactPhone:"01200000000", contactEmail:"academy@kori-sohag.org", city:"سوهاج", address:"حي الكوثر - سوهاج" },
  "كيان اراده شباب مصر": { type:"مبادرة", contactPhone:"01044444444", contactEmail:"support@irada-masr.org", city:"القاهرة", address:"وسط البلد - شارع التحرير" },
  "كيان إرادة شباب مصر بالغربية": { type:"مبادرة", contactPhone:"01177777777", contactEmail:"irada@gharbia-youth.org", city:"الغربية", address:"طنطا - شارع سعيد" },
  "كيان الاتحاد الشبابي لدعم مصر": { type:"تجمع شبابي", contactPhone:"01166666666", contactEmail:"support@egy-youth-union.org", city:"القاهرة", address:"المعادي - شارع النصر" },
  "كيان الجبهه الدبلوماسيه المصريه": { type:"منتدى شبابي", contactPhone:"01077777777", contactEmail:"desk@egy-diplomatic-front.org", city:"القاهرة", address:"جاردن سيتي - شارع القصر العيني" },
  "كيان الجيل الشبابي الصاعد": { type:"كيان شبابي", contactPhone:"01111111111", contactEmail:"nextgen@egy-youth.org", city:"القاهرة", address:"مدينة نصر - شارع مكرم عبيد" },
  "كيان الشباب بناة المستقبل": { type:"مبادرة", contactPhone:"01122222222", contactEmail:"builders@future-eg.org", city:"القاهرة", address:"الدقي - شارع التحرير" },
  "كيان تيم الشيمي بسوهاج": { type:"فريق", contactPhone:"01244444444", contactEmail:"team@elsheemy-sohag.org", city:"سوهاج", address:"شارع المحافظة - سوهاج" },
  "كيان تيم القمه بسوهاج": { type:"فريق", contactPhone:"01233333333", contactEmail:"team@elqemma-sohag.org", city:"سوهاج", address:"حي الزهراء - سوهاج" },
  "كيان جيل قادر بسوهاج": { type:"كيان شبابي", contactPhone:"01255555555", contactEmail:"generation@sohag.org", city:"سوهاج", address:"شارع الجمهورية - سوهاج" },
  "كيان حكاية إشارة": { type:"مبادرة توعوية", contactPhone:"01511111111", contactEmail:"story@signal-eg.org", city:"القاهرة", address:"مصر الجديدة - شارع الحجاز" },
  "كيان حلم مصر بسوهاج": { type:"مبادرة", contactPhone:"01222222222", contactEmail:"dream@masr-sohag.org", city:"سوهاج", address:"شارع بورسعيد - سوهاج" },
  "كيان رموز شباب مصر": { type:"كيان شبابي", contactPhone:"01522222222", contactEmail:"symbols@egy-youth.org", city:"القاهرة", address:"شبرا - شارع شبرا الرئيسي" },
  "كيان رواد التطوير و التنميه الشبابيه بمحافظه": { type:"منظمة مجتمع مدني", contactPhone:"01022222222", contactEmail:"hello@dev-pioneers.org", city:"القاهرة", address:"المعادي - شارع 9" },
  "كيان سند شباب الصعيد": { type:"مبادرة شبابية", contactPhone:"01000000000", contactEmail:"info@upper-youth.org", city:"أسيوط", address:"مركز أسيوط - شارع الجامعة" },
  "كيان سند شباب الدلتا": { type:"مبادرة شبابية", contactPhone:"01100000000", contactEmail:"delta@support-youth.org", city:"المنصورة", address:"شارع الجيش - المنصورة" },
  "كيان شباب بحري": { type:"فريق تطوعي", contactPhone:"01055555555", contactEmail:"contact@bahari-youth.org", city:"الإسكندرية", address:"سيدي جابر - طريق الحرية" },
  "كيان شباب قادرون": { type:"كيان تمكين", contactPhone:"01577777777", contactEmail:"able@egy-youth.org", city:"القاهرة", address:"الزمالك - شارع 26 يوليو" },
  "كيان شباب مستدام": { type:"مبادرة الاستدامة", contactPhone:"01188888888", contactEmail:"sustain@egy-youth.org", city:"القاهرة", address:"مدينة نصر - شارع يوسف عباس" },
  "كيان شباب مراكز مصر": { type:"شبكة شبابية", contactPhone:"01555555555", contactEmail:"network@centers-egy.org", city:"القاهرة", address:"الدقي - شارع نادي الصيد" },
  "كيان شباب يبني وطن": { type:"مبادرة", contactPhone:"01533333333", contactEmail:"build@watan-youth.org", city:"القاهرة", address:"المهندسين - شارع جامعة الدول" },
  "كيان صناع الفرص": { type:"مبادرة", contactPhone:"01544444444", contactEmail:"opps@makers-eg.org", city:"القاهرة", address:"المعادي - شارع اللاسلكي" },
  "كيان فكرة": { type:"مبادرة", contactPhone:"01277777777", contactEmail:"fikra@egy.org", city:"القاهرة", address:"وسط البلد - شارع قصر النيل" },
  "كيان فن إدارة الحياة": { type:"برنامج تدريبي", contactPhone:"01299999999", contactEmail:"life@management-art.org", city:"القاهرة", address:"الزمالك - شارع حسن صبري" },
  "كيان قيادات شباب مصر": { type:"برنامج قيادة", contactPhone:"01133333333", contactEmail:"leaders@egy-youth.org", city:"القاهرة", address:"الزمالك - شارع محمد مظهر" },
  "كيان مراكز شباب مصر": { type:"شبكة مراكز الشباب", contactPhone:"01266666666", contactEmail:"clubs@egy-youth.org", city:"القاهرة", address:"الجيزة - شارع البحر الأعظم" },
  "كيان مشروع وطن": { type:"مبادرة وطنية", contactPhone:"01144444444", contactEmail:"project@watan.org", city:"القاهرة", address:"الدقي - شارع المساحة" },
  "كيان مهندسون من أجل مصر المستدامة": { type:"مبادرة مهنية", contactPhone:"01566666666", contactEmail:"engineers@esm.org", city:"القاهرة", address:"المهندسين - شارع لبنان" },
  "كيان المصريون الشباب": { type:"كيان شبابي", contactPhone:"01033333333", contactEmail:"team@egy-youth.org", city:"القاهرة", address:"مدينة نصر - الحي السابع" },
  "كيان رحلة شباب الجمهورية الجديدة": { type:"مبادرة", contactPhone:"01199999999", contactEmail:"journey@newrep-youth.org", city:"القاهرة", address:"التجمع الخامس - شارع التسعين" },
  "كيان تنمية وطن": { type:"مؤسسة تنموية", contactPhone:"01500000000", contactEmail:"tanmia@watan.org", city:"القاهرة", address:"المعادي - شارع 151" },
};

export default function EntitiesPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [list, setList] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [myRequests, setMyRequests] = useState<any[]>([]);
  const hasPending = useMemo(() => myRequests.some(r => r.status === "pending"), [myRequests]);
  const hasApproved = useMemo(() => myRequests.some(r => r.status === "approved"), [myRequests]);

  const sessionHeader = () => localStorage.getItem("session") || "";
  const canManage = (r?: UserRole | null) => !!r && ["systemAdmin", "entityManager"].includes(r);

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/entities failed");
      return (await res.json()) as Entity[];
    },
    updateEntity: async (id: string, payload: any) => {
      const res = await fetch(`/api/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-session": sessionHeader() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    deleteEntity: async (id: string) => {
      const res = await fetch(`/api/entities/${id}`, {
        method: "DELETE",
        headers: { "x-session": sessionHeader() },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    getMyJoinRequests: async () => {
      const r = await fetch("/api/join-requests?mine=1", { cache: "no-store" });
      return r.ok ? r.json() : [];
    },
    sendJoinRequest: async (entityId: string) => {
      const r = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "فشل إرسال الطلب");
      return data;
    },
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (!raw) { router.push("/"); return; }
      setSession(JSON.parse(raw));
    } catch { router.push("/"); }
  }, [router]);

  const loadAll = async () => {
    setLoading(true); setErrMsg("");
    try {
      const [ents, mine] = await Promise.all([api.getEntities(), api.getMyJoinRequests()]);
      setList(Array.isArray(ents) ? ents : []);
      setMyRequests(Array.isArray(mine) ? mine : []);
    } catch (e: any) {
      setErrMsg(e?.message || "تعذّر تحميل البيانات");
      setList([]);
    } finally { setLoading(false); }
  };
  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (!session) return;
    if (!session.entityId && hasApproved) {
      const approved = myRequests.find(r => r.status === "approved");
      if (approved?.entityId) {
        const next = { ...session, entityId: approved.entityId };
        localStorage.setItem("session", JSON.stringify(next));
        setSession(next);
      }
    }
  }, [hasApproved, myRequests, session]);

  useEffect(() => {
    if (!list.length || !session || !canManage(session.role)) return;
    const preferred = list.find(e => e.id === session.entityId) ?? list[0];
    if (preferred) selectEntityByName(preferred.name, true);
  }, [list, session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base = list;
    if (!q) return base;
    return base.filter((e) =>
      [e.name, e.type, e.location, e.phone, e.contactEmail].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [list, search]);

  if (!session) {
    return (
      <div dir="rtl" className="mx-auto max-w-6xl w-full px-4 py-8">
        <Card><CardHeader><CardTitle>الكيانات</CardTitle><CardDescription>جاري التحقق من الجلسة…</CardDescription></CardHeader>
        <CardContent><div className="h-24 rounded-2xl bg-black/5 animate-pulse" /></CardContent></Card>
      </div>
    );
  }

  function selectEntityByName(name: string, fromInit = false) {
    const found = list.find(e => e.name === name);
    setEditingId(found?.id ?? null);
    const t = ENTITY_PRESETS[name] || {};
    const [city, address] = (found?.location || `${t.city ?? ""} - ${t.address ?? ""}`).split(" - ").map(s => s?.trim() || "");
    setForm({
      name,
      type: (found?.type || t.type || ""),
      contactPhone: (found?.phone || t.contactPhone || ""),
      contactEmail: (found?.contactEmail || t.contactEmail || ""),
      city: city || "",
      address: address || "",
    });
    if (!fromInit) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage(session.role)) return; 
    if (!form.name.trim() || !ALLOWED_ENTITY_NAMES.includes(form.name.trim())) {
      alert("اختر اسم الكيان من القائمة المحددة فقط");
      return;
    }
    if (!editingId) { alert("هذا الكيان غير موجود في النظام."); return; }

    const payload = {
      name: form.name.trim(),
      type: form.type.trim() || undefined,
      phone: form.contactPhone.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      location: [form.city.trim(), form.address.trim()].filter(Boolean).join(" - ") || undefined,
    };

    setSaving(true);
    try {
      await api.updateEntity(editingId, payload);
      await loadAll();
    } catch {
      alert("حدث خطأ أثناء الحفظ");
    } finally { setSaving(false); }
  };

  const canDelete = (e: Entity) =>
    session.role === "systemAdmin" ||
    (session.role === "entityManager" && (e.createdBy === session.id || e.id === session.entityId));

  const onDelete = async (id: string) => {
    if (!confirm("تأكيد حذف الكيان؟")) return;
    try {
      await api.deleteEntity(id);
      await loadAll();
      if (editingId === id) { setEditingId(null); setForm({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" }); }
    } catch { alert("فشل الحذف"); }
  };

  const requestJoin = async (entityId: string) => {
    try {
      await api.sendJoinRequest(entityId);
      await loadAll();
      alert("تم إرسال الطلب، بانتظار الموافقة");
    } catch (e:any) {
      alert(e?.message || "تعذّر إرسال الطلب");
    }
  };

  const isAdminOrManager = canManage(session.role);
  const alreadyLinked = !!session.entityId;

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Building2 className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">{isAdminOrManager ? "إدارة الكيانات" : "استعراض الكيانات"}</h1>
              <p className="text-sm" style={{ color: "#6B6B6B" }}>
                {isAdminOrManager ? "اختر كيانًا موجودًا وحدّث بياناته" : "اختر كيانًا وقدّم طلب انضمام ليوافق مسؤول الكيان"}
              </p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full flex items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: "#1D1D1D" }}>
            {list.length} كيان
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: "#1D1D1D" }}>
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: "#6B6B6B" }}>
            {errMsg}
          </div>
        )}

        {!isAdminOrManager && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3 text-sm" style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#6B6B6B" }}>
            {alreadyLinked
              ? <>حسابك مربوط بكيان بالفعل — يمكنك إدارة <Link href="/events" className="underline text-[#EC1A24]">فعاليات كيانك</Link>.</>
              : hasPending
                ? "لديك طلب انضمام قيد المراجعة. عند الموافقة سيتم ربط حسابك تلقائياً."
                : "اختر كيان واضغط «قدّم طلب انضمام». سيقوم مسؤول الكيان بالموافقة أو الرفض."}
          </div>
        )}

        {isAdminOrManager && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" color="#1D1D1D" />
                تعديل بيانات كيان مُسبق
              </CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>
                اختر اسم الكيان من القائمة لتظهر بياناته تلقائيًا ثم اضغط حفظ
              </CardDescription>
            </CardHeader>

            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

            <CardContent className="px-5 pb-5">
              <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="اسم الكيان (اختيار من القائمة)">
                  <Select value={form.name} onValueChange={(v) => selectEntityByName(v)}>
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                      <SelectValue placeholder="اختر اسم الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALLOWED_ENTITY_NAMES.map((n) => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="نوع الكيان">
                  <Input value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))} className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                </Field>

                <Field label="هاتف التواصل">
                  <Input value={form.contactPhone} onChange={(e) => setForm(p => ({ ...p, contactPhone: e.target.value }))} className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                </Field>

                <Field label="البريد الإلكتروني">
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm(p => ({ ...p, contactEmail: e.target.value }))} className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                </Field>

                <Field label="المدينة">
                  <Input value={form.city} onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))} className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                </Field>

                <Field label="العنوان">
                  <Input value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                </Field>

                <div className="md:col-span-2 flex items-center gap-3 pt-2">
                  <Button type="submit" disabled={saving || !editingId} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                    <Save className="h-4 w-4" />
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </SurfaceCard>
        )}

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>قائمة الكيانات</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>
              {isAdminOrManager ? "ابحث أو حرّر أي كيان" : "ابحث واختر كيانًا لتقديم طلب انضمام"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input
                  placeholder="ابحث بالاسم/المدينة/البريد..."
                  className="pr-9 h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setSearch("")} className="h-11 rounded-full" style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0", color: "#1D1D1D" }}>
                مسح
              </Button>
            </div>

            {loading ? (
              <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E7E2DC" }} />
            ) : filtered.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>لا توجد كيانات بعد</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((e) => (
                  <li key={e.id} className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                    <div>
                      <div className="font-semibold" style={{ color: "#1D1D1D" }}>{e.name}</div>
                      <div className="text-xs" style={{ color: "#6B6B6B" }}>
                        {e.type ? `${e.type} • ` : ""}{e.location || "-"} • {e.phone || "-"} • {e.contactEmail || "-"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdminOrManager ? (
                        <>
                          <Button variant="outline" size="sm" className="gap-2 rounded-full" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} onClick={() => selectEntityByName(e.name)}>
                            <Edit2 className="h-4 w-4" /> تحرير
                          </Button>
                          {canDelete(e) && (
                            <Button size="sm" className="rounded-full" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }} onClick={() => onDelete(e.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-full"
                          style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
                          disabled={hasPending || alreadyLinked}
                          onClick={() => requestJoin(e.id)}
                          title={alreadyLinked ? "أنت مرتبط بالفعل بكيان" : hasPending ? "لديك طلب قيد المراجعة" : "قدّم طلب انضمام"}
                        >
                          قدّم طلب انضمام
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </SurfaceCard>
      </main>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [hasEntity, setHasEntity] = useState(false);
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (s) { const p = JSON.parse(s); setRole(p.role); setHasEntity(!!p.entityId); }
    } catch {}
  }, []);
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>
              منصة الكيانات الشبابية
            </Link>
          </div>

          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className="px-3 py-1 rounded-lg transition" style={{ color: active("/") ? "#FFFFFF" : "#1D1D1D", backgroundColor: active("/") ? "#EC1A24" : "transparent" }}>الرئيسية</Link>
            <Link href="/about" className="px-3 py-1 rounded-lg transition" style={{ color: active("/about") ? "#FFFFFF" : "#1D1D1D", backgroundColor: active("/about") ? "#EC1A24" : "transparent" }}>عن المنصة</Link>
            <Link href="/support" className="px-3 py-1 rounded-lg transition" style={{ color: active("/support") ? "#FFFFFF" : "#1D1D1D", backgroundColor: active("/support") ? "#EC1A24" : "transparent" }}>الدعم</Link>
            <Link href="/dashboard" className="px-3 py-1 rounded-lg transition" style={{ color: active("/dashboard") ? "#FFFFFF" : "#1D1D1D", backgroundColor: active("/dashboard") ? "#EC1A24" : "transparent" }}>لوحة التحكم</Link>

            <Link href="/entities" className="px-3 py-1 rounded-lg transition" style={{ color: active("/entities") ? "#FFFFFF" : "#1D1D1D", backgroundColor: active("/entities") ? "#EC1A24" : "transparent" }}>الكيانات</Link>

            {(role === "systemAdmin" || role === "entityManager") && (
              <Link href="/dashboard/requests" className="px-3 py-1 rounded-lg transition" style={{ color: active("/dashboard/requests") ? "#FFFFFF" : "#1D1D1D", backgroundColor: active("/dashboard/requests") ? "#EC1A24" : "transparent" }}>طلبات الانضمام</Link>
            )}

          </nav>
        </div>
      </div>
    </header>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-sm" style={{ color: "#1D1D1D" }}>{label}</span>
      {children}
    </label>
  );
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}
