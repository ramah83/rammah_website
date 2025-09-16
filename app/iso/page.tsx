// app/iso/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Cairo } from "next/font/google";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, ShieldCheck, FilePlus2, Search, Building2,
  GitBranch, CheckCircle2, XCircle, UploadCloud, Pencil, Trash2, Check, X,
  FileText, LinkIcon, Tag, FileDown
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400","600","700","800"], display: "swap" });

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };
type ISOStatus = "draft" | "submitted" | "review" | "approved" | "rejected";

type FormState = {
  code: string;
  title: string;
  ownerEntityId: string;
  status: ISOStatus;
  version: string;
  tags: string;
  description: string;
  fileUrl: string;
};

const statusLabel: Record<ISOStatus, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

const pillClass: Record<ISOStatus, string> = {
  draft: "bg-[#F6F6F6] text-[#1D1D1D] border border-[#E5E5E5]",
  submitted: "bg-[#FFF2F2] text-[#1D1D1D] border border-[#F2D6D6]",
  review: "bg-[#FFF8E8] text-[#1D1D1D] border border-[#F2E7C6]",
  approved: "bg-[#EAF8F0] text-[#1D1D1D] border border-[#CBEBDD]",
  rejected: "bg-[#FEEDEF] text-[#1D1D1D] border border-[#F5C9CF]",
};

function isPdf(u?: string|null) { return !!u && /\.pdf($|\?)/i.test(u); }
function isImage(u?: string|null) { return !!u && /\.(png|jpe?g|gif|webp|avif|bmp|svg)($|\?)/i.test(u); }

export default function ISOPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [entities, setEntities] = useState<any[]>([]);
  const [list, setList] = useState<any[]>([]);

  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<ISOStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<FormState> | null>(null);

  const [showDetails, setShowDetails] = useState<null | any>(null);

  const canManage = (role?: UserRole | null) => role === "unionSupervisor";
  const canCreate = (role?: UserRole | null) => role === "unionSupervisor" || role === "entityManager";

  const [form, setForm] = useState<FormState>({
    code: "", title: "", ownerEntityId: "", status: "draft",
    version: "", tags: "", description: "", fileUrl: ""
  });

  function sessionHeaderB64() {
    try {
      const raw = localStorage.getItem("session") || "";
      return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
    } catch { return ""; }
  }

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" });
      if (!res.ok) return []; // ما نوقفش الصفحة لو رجعت فاضية
      const data = await res.json();
      return Array.isArray(data) ? data : Array.isArray(data?.entities) ? data.entities : [];
    },
    getISO: async () => {
      const q = new URLSearchParams();
      if (filterEntity) q.set("entityId", filterEntity);
      if (filterStatus) q.set("status", String(filterStatus));
      if (search.trim()) q.set("q", search.trim());
      const res = await fetch(`/api/iso?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/iso failed");
      return await res.json();
    },
    createISO: async (payload: FormState) => {
      const b64 = sessionHeaderB64();
      const res = await fetch("/api/iso", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(b64 ? { "x-session-b64": b64 } : {}) },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "POST /api/iso failed");
      return JSON.parse(txt);
    },
    updateISO: async (id: string, payload: Partial<FormState>) => {
      const b64 = sessionHeaderB64();
      const res = await fetch(`/api/iso/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(b64 ? { "x-session-b64": b64 } : {}) },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "PATCH /api/iso/:id failed");
      return JSON.parse(txt);
    },
    deleteISO: async (id: string) => {
      const b64 = sessionHeaderB64();
      const res = await fetch(`/api/iso/${id}`, {
        method: "DELETE",
        headers: { ...(b64 ? { "x-session-b64": b64 } : {}) },
        credentials: "include",
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(txt || "DELETE /api/iso/:id failed");
      return JSON.parse(txt);
    },
  };

  // حمّل الـ session
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      const parsed = JSON.parse(s) as Session;
      setSession(parsed);

      // ✅ اضبط مالك النموذج فورًا لمدير الكيان بدون انتظار الكيانات
      if (parsed.role === "entityManager" && parsed.entityId) {
        setForm(p => ({ ...p, ownerEntityId: String(parsed.entityId) }));
      }
    } catch { router.push("/"); }
  }, [router]);

  // حمّل الكيانات + قائمة ISO حسب الفلاتر
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErrMsg("");
      try {
        const [ents, isoItems] = await Promise.all([
          api.getEntities().catch(() => []),
          api.getISO(),
        ]);
        if (!mounted) return;
        setEntities(Array.isArray(ents) ? ents : []);
        setList(Array.isArray(isoItems) ? isoItems : []);
        // لو المدير لسه ما اتحددش ownerEntityId لأي سبب وsession فيها entityId
        if (session?.role === "entityManager" && session.entityId && !form.ownerEntityId) {
          setForm(p => ({ ...p, ownerEntityId: String(session.entityId) }));
        }
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message || "تعذّر تحميل البيانات");
        setList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [filterEntity, filterStatus, search, session?.role, session?.entityId]); // refetch on filters / session

  const filtered = useMemo(() => list, [list]);

  if (!session) return null;

  const resetForm = () =>
    setForm({
      code: "",
      title: "",
      ownerEntityId: String(session?.entityId || ""),
      status: "draft",
      version: "",
      tags: "",
      description: "",
      fileUrl: ""
    });

  const refreshISO = async () => {
    try { setList(await api.getISO()); } catch { setList([]); }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate(session.role)) return;
    if (!form.code.trim()) return alert("كود النموذج مطلوب");
    if (!form.title.trim()) return alert("عنوان النموذج مطلوب");
    if (!form.ownerEntityId) return alert("اختر الكيان");
    setSaving(true);
    try {
      // لو مدير كيان، تأكد أن الـ ownerEntityId يساوي كيان المدير حتى لو الواجهة فيها قيمة أخرى
      const payload = session.role === "entityManager"
        ? { ...form, ownerEntityId: String(session.entityId || "") }
        : form;
      await api.createISO(payload as FormState);
      await refreshISO(); resetForm();
    } catch (err: any) {
      const msg = typeof err?.message === "string" && err.message ? err.message : "حدث خطأ";
      alert(msg);
    } finally { setSaving(false); }
  };

  const changeStatus = async (id: string, next: ISOStatus) => {
    try {
      await api.updateISO(id, { status: next });
      await refreshISO();
    } catch (e: any) {
      const serverMsg = e?.message ? e.message : "لم يتم تغيير الحالة";
      alert(serverMsg);
    }
  };

  const startEdit = (it: any) => {
    setEditingId(it.id);
    setEditDraft({
      title: it.title ?? "",
      code: it.code ?? "",
      ownerEntityId: String(it.ownerEntityId ?? ""),
      status: it.status as ISOStatus,
      version: it.version ?? "",
      tags: Array.isArray(it.tags) ? it.tags.join(",") : (it.tags || ""),
      description: it.description ?? "",
      fileUrl: it.fileUrl ?? "",
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const confirmEdit = async () => {
    if (!editingId || !editDraft) return;
    try {
      // مدير الكيان: لا يسمح بتغيير المالك؛ سيرفرًا كمان محمي
      const payload: Partial<FormState> = {
        title: (editDraft.title || "").trim(),
        code: (editDraft.code || "").trim(),
        status: (editDraft.status || "draft") as ISOStatus,
        version: (editDraft.version || "").trim(),
        tags: (editDraft.tags || "").trim(),
        description: (editDraft.description || "").trim(),
        fileUrl: (editDraft.fileUrl || "").trim(),
      };
      // فقط المشرف نرسل معه ownerEntityId
      if (session.role === "unionSupervisor" && editDraft.ownerEntityId) {
        payload.ownerEntityId = String(editDraft.ownerEntityId);
      }
      await api.updateISO(editingId, payload);
      await refreshISO(); cancelEdit();
    } catch (e: any) { alert(e?.message || "فشل التعديل"); }
  };
  const onDelete = async (id: string) => {
    if (!confirm("حذف النموذج؟")) return;
    try { await api.deleteISO(id); await refreshISO(); }
    catch (e: any) { alert(e?.message || "فشل الحذف"); }
  };

  const nextActions = (st: ISOStatus, role: UserRole) => {
    if (role === "unionSupervisor") {
      switch (st) {
        case "draft":     return ["submitted", "review", "approved", "rejected"] as ISOStatus[];
        case "submitted": return ["review", "approved", "rejected"] as ISOStatus[];
        case "review":    return ["approved", "rejected"] as ISOStatus[];
        default:          return ["draft", "submitted", "review", "approved", "rejected"] as ISOStatus[];
      }
    }
    switch (st) {
      case "draft":     return ["submitted"] as ISOStatus[];
      case "submitted": return ["review"] as ISOStatus[];
      default:          return [] as ISOStatus[];
    }
  };

  return (
    <div dir="rtl" className={`${cairo.className} relative min-h-screen overflow-hidden flex flex-col`} style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>نماذج ISO (إجراءات وسياسات)</h1>
              <p className="text-sm" style={{ color: "#6B6B6B" }}>مكتبة النماذج، سير الاعتماد، وسجل التدقيق</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full flex items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: "#1D1D1D" }}>
            {list.length} نموذج
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: "#1D1D1D" }}>
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: "#6B6B6B" }}>
            {errMsg}
          </div>
        )}

        {canCreate(session.role) && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5">
              <CardTitle className="flex items-center gap-2">
                <FilePlus2 className="h-5 w-5" color="#1D1D1D" />
                إنشاء نموذج ISO
              </CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>أدخل بيانات النموذج واضغط حفظ</CardDescription>
            </CardHeader>

            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

            <CardContent className="px-5 pb-5">
              <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="كود النموذج">
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                    className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                  />
                </Field>

                <Field label="عنوان النموذج" className="md:col-span-2">
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                  />
                </Field>

                <Field label="النسخة">
                  <Input
                    value={form.version}
                    onChange={(e) => setForm(p => ({ ...p, version: e.target.value }))}
                    className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                  />
                </Field>

                <Field label="وسوم (مفصولة بفواصل)">
                  <div className="relative">
                    <Tag className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                    <Input
                      value={form.tags}
                      onChange={(e) => setForm(p => ({ ...p, tags: e.target.value }))}
                      className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                    />
                  </div>
                </Field>

                <Field label="رابط الملف (PDF/صورة/مستند)">
                  <div className="relative">
                    <LinkIcon className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                    <Input
                      value={form.fileUrl}
                      onChange={(e) => setForm(p => ({ ...p, fileUrl: e.target.value }))}
                      className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                      placeholder="https://…"
                    />
                  </div>
                </Field>

                <Field label="الكيان المالك">
                  <Select
                    value={String(form.ownerEntityId)}
                    onValueChange={(v) => setForm((p) => ({ ...p, ownerEntityId: v }))}
                    disabled={session.role === "entityManager"} // مدير الكيان لا يغيرها
                  >
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                      <SelectValue placeholder={session.role === "entityManager" ? "كيانك" : "اختر الكيان"} />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="الوصف" className="md:col-span-3">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full min-h-[90px] rounded-xl p-3 border"
                    style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                  />
                </Field>

                <Field label="الحالة">
                  <Select
                    value={form.status}
                    onValueChange={(v: ISOStatus) => setForm((p) => ({ ...p, status: v }))}
                  >
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="submitted">مُقدَّم</SelectItem>
                      <SelectItem value="review">قيد المراجعة</SelectItem>
                      {session.role === "unionSupervisor" && (
                        <>
                          <SelectItem value="approved">معتمد</SelectItem>
                          <SelectItem value="rejected">مرفوض</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="md:col-span-3 flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={saving || loading || !form.ownerEntityId}
                    className="gap-2 h-11 rounded-full font-semibold"
                    style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
                  >
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </SurfaceCard>
        )}

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>قائمة النماذج</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>فلترة حسب الكيان/الحالة أو البحث بالكود/العنوان/الوسوم</CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <Field label="فلتر الكيان">
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                    <SelectValue placeholder="جميع الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {entities.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="فلتر الحالة">
                <Select value={filterStatus} onValueChange={(v: ISOStatus | "all") => setFilterStatus(v)}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="submitted">مُقدَّم</SelectItem>
                    <SelectItem value="review">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Label className="text-sm" style={{ color: "#1D1D1D" }}>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                  <Input
                    placeholder="ابحث بالكود/العنوان/الوسوم..."
                    className="pr-9 h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>
                {loading ? "جارٍ التحميل..." : "لا توجد نماذج بعد"}
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((f: any) => {
                  const ent = entities.find((e) => String(e.id) === String(f.ownerEntityId));
                  const acts = nextActions(f.status as ISOStatus, session.role as UserRole);
                  const isEdit = editingId === f.id;
                  const tags = Array.isArray(f.tags) ? f.tags : (f.tags || []);
                  return (
                    <li key={f.id} className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full space-y-2">
                          {isEdit ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={editDraft?.title || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), title: e.target.value }))}
                                className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                              />
                              <Input
                                value={editDraft?.code || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), code: e.target.value }))}
                                className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                                placeholder="الكود"
                              />
                              <Input
                                value={editDraft?.version || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), version: e.target.value }))}
                                className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                                placeholder="النسخة"
                              />
                              <Input
                                value={editDraft?.tags || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), tags: e.target.value }))}
                                className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                                placeholder="وسوم مفصولة بفواصل"
                              />
                              <Input
                                value={editDraft?.fileUrl || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), fileUrl: e.target.value }))}
                                className="h-10 rounded-xl md:col-span-2" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                                placeholder="رابط الملف"
                              />
                              <div className="md:col-span-2">
                                <textarea
                                  value={editDraft?.description || ""}
                                  onChange={(e) => setEditDraft(p => ({ ...(p as any), description: e.target.value }))}
                                  className="w-full min-h-[80px] rounded-xl p-3 border"
                                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                                  placeholder="وصف مختصر"
                                />
                              </div>
                              <div>
                                <Select
                                  value={String(editDraft?.ownerEntityId || f.ownerEntityId)}
                                  onValueChange={(v) => setEditDraft(p => ({ ...(p as any), ownerEntityId: v }))}
                                  disabled={session.role !== "unionSupervisor"}
                                >
                                  <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {entities.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Select
                                  value={String(editDraft?.status || f.status)}
                                  onValueChange={(v: ISOStatus) => setEditDraft(p => ({ ...(p as any), status: v }))}
                                >
                                  <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">مسودة</SelectItem>
                                    <SelectItem value="submitted">مُقدَّم</SelectItem>
                                    <SelectItem value="review">قيد المراجعة</SelectItem>
                                    <SelectItem value="approved">معتمد</SelectItem>
                                    <SelectItem value="rejected">مرفوض</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold flex items-center gap-2" style={{ color: "#1D1D1D" }}>
                                <FileText className="h-4 w-4" /> {f.title}
                                {f.version && <span className="text-xs px-2 h-6 inline-flex items-center rounded-full" style={{ background:"#F6F6F6", border:"1px solid #E5E5E5" }}>v{f.version}</span>}
                              </div>
                              <div className="text-xs" style={{ color: "#6B6B6B" }}>الكود: {f.code || "—"}</div>
                              <div className="text-xs flex items-center gap-1" style={{ color: "#6B6B6B" }}>
                                <Building2 className="h-3 w-3" color="#6B6B6B" />
                                <span>{ent?.name || "بدون كيان"}</span>
                              </div>
                              {Array.isArray(tags) && tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {tags.map((t: string, i: number) => (
                                    <span key={t+i} className="text-[11px] px-2 h-6 inline-flex items-center rounded-full" style={{ background:"#FAFAFA", border:"1px solid #EDEDED", color:"#555" }}>
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {f.description && <div className="text-sm pt-1" style={{ color:"#1D1D1D" }}>{f.description}</div>}
                              {f.fileUrl && (
                                <div className="pt-2">
                                  <a href={f.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                                    <FileDown className="h-4 w-4" /> فتح/تنزيل الملف
                                  </a>
                                  <div className="mt-2 rounded-lg border overflow-hidden" style={{ borderColor:"#EDE8E1" }}>
                                    {isPdf(f.fileUrl) ? (
                                      <iframe src={f.fileUrl} className="w-full h-56" />
                                    ) : isImage(f.fileUrl) ? (
                                      <img src={f.fileUrl} alt="ملف" className="w-full h-56 object-cover" />
                                    ) : (
                                      <div className="p-2 text-xs break-all">{f.fileUrl}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs ${pillClass[f.status as ISOStatus]}`}>
                            {statusLabel[f.status as ISOStatus]}
                          </span>

                          {(canManage(session.role) || session.role === "entityManager") && (
                            <div className="flex items-center gap-2 mt-1">
                              {isEdit ? (
                                <>
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={confirmEdit}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {nextActions(f.status as ISOStatus, session.role as UserRole).map(a => (
                                    <button
                                      key={a}
                                      onClick={() => changeStatus(f.id, a as ISOStatus)}
                                      className="h-8 px-3 rounded-full text-xs"
                                      style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: "#1D1D1D" }}
                                      title={`تغيير إلى ${statusLabel[a as ISOStatus]}`}
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {a === "submitted" && <UploadCloud className="h-4 w-4" />}
                                        {a === "review" && <GitBranch className="h-4 w-4" />}
                                        {a === "approved" && <CheckCircle2 className="h-4 w-4" />}
                                        {a === "rejected" && <XCircle className="h-4 w-4" />}
                                        {statusLabel[a as ISOStatus]}
                                      </span>
                                    </button>
                                  ))}
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={() => startEdit(f)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button className="h-8 px-2 rounded-full" style={{ backgroundColor: "#EC1A24" }} onClick={() => onDelete(f.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}

                          <button
                            className="text-xs underline mt-1"
                            onClick={() => setShowDetails(f)}
                          >
                            التفاصيل
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </SurfaceCard>
      </main>

      {showDetails && (
        <DetailsModal onClose={()=>setShowDetails(null)} item={showDetails} />
      )}
    </div>
  );
}

function DetailsModal({ item, onClose }:{ item:any; onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white border shadow-xl" style={{ borderColor:"#E7E2DC" }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor:"#F1EEE8" }}>
            <div className="font-semibold">تفاصيل النموذج</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="font-semibold text-lg">{item.title}</div>
            <div className="text-sm text-[#666]">الكود: {item.code}</div>
            {item.version && <div className="text-sm text-[#666]">الإصدار: v{item.version}</div>}
            {Array.isArray(item.tags) && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.map((t:string, i:number) => (
                  <span key={t+i} className="text-[11px] px-2 h-6 inline-flex items-center rounded-full" style={{ background:"#FAFAFA", border:"1px solid #EDEDED", color:"#555" }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {item.description && (
              <div className="rounded-xl border p-3 bg-white" style={{ borderColor:"#EDE8E1" }}>
                <div className="text-sm">{item.description}</div>
              </div>
            )}
            {item.fileUrl && (
              <div className="rounded-xl border p-3 bg-white" style={{ borderColor:"#EDE8E1" }}>
                <div className="text-sm mb-2">رابط الملف</div>
                <a href={item.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm underline">
                  <FileDown className="h-4 w-4" /> فتح/تنزيل
                </a>
                <div className="mt-2 rounded-lg border overflow-hidden" style={{ borderColor:"#F1EEE8" }}>
                  {isPdf(item.fileUrl) ? (
                    <iframe src={item.fileUrl} className="w-full h-60" />
                  ) : isImage(item.fileUrl) ? (
                    <img src={item.fileUrl} alt="ملف" className="w-full h-60 object-cover" />
                  ) : (
                    <div className="p-2 text-xs break-all">{item.fileUrl}</div>
                  )}
                </div>
              </div>
            )}
            <div className="text-xs text-[#777]">الحالة الحالية: {statusLabel[item.status as ISOStatus] || item.status}</div>
            <div className="text-xs text-[#777]">تاريخ الإنشاء: {new Date(item.createdAt).toLocaleString("ar-EG")}</div>
            <div className="text-xs text-[#777]">آخر تحديث: {new Date(item.updatedAt).toLocaleString("ar-EG")}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className={`${cairo.className} relative z-10`}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/iso", label: "نماذج ISO" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="px-3 py-1 rounded-lg transition"
                    style={{ color: active(l.href) ? "#FFFFFF" : "#1D1D1D", backgroundColor: active(l.href) ? "#EC1A24" : "transparent" }}>
                {l.label}
              </Link>
            ))}
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
