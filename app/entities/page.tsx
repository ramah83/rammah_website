"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2, Save, Edit2, Search, Users, Trash2, Plus,
  PauseCircle, PlayCircle, X, Image as ImgIcon, UploadCloud, Trash,
  Mail, Phone, MapPin, Calendar, ShieldCheck
} from "lucide-react";
import { Cairo } from "next/font/google";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

type Entity = {
  id: string;
  name: string;
  type?: string;
  contactEmail?: string;
  phone?: string;
  location?: string;
  documents?: string[];
  createdAt: string;
  createdBy?: string | null;
  managerUserId?: string | null;
  status?: "approved" | "pending" | "rejected" | "suspended" | string;
  imageUrl?: string | null;
};

type FormState = {
  name: string;
  type: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  address: string;
  imageUrl: string;
};

const PALETTE = {
  border: "#E7E2DC",
  bg: "#EFE6DE",
  text: "#1D1D1D",
  hint: "#6B6B6B",
  red: "#EC1A24",
  orange: "#D97706",
  green: "#16A34A",
  blue: "#2563EB",
};

export default function EntitiesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [list, setList] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "", imageUrl: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<FormState>({
    name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "", imageUrl: "",
  });
  const [uploadingCreate, setUploadingCreate] = useState(false);

  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Entity | null>(null);

  
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Entity | null>(null);

  const isUnion = session?.role === "unionSupervisor";
  const isManager = session?.role === "entityManager";
  const isUser = session?.role === "user";

  const headerSessionB64 = () => {
    const raw = localStorage.getItem("session") || "";
    try { return btoa(unescape(encodeURIComponent(raw))); } catch { return ""; }
  };

  const api = {
    getEntities: async () => {
      const url = isUnion ? "/api/entities?all=1" : "/api/entities";
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) throw new Error("تعذّر جلب الكيانات");
      return (await r.json()) as Entity[];
    },
    patchEntity: async (id: string, payload: any) => {
      const r = await fetch(`/api/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-session-b64": headerSessionB64() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "فشل الحفظ");
      return data;
    },
    deleteEntity: async (id: string) => {
      const r = await fetch(`/api/entities/${id}`, {
        method: "DELETE",
        headers: { "x-session-b64": headerSessionB64() },
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "فشل الحذف");
      return data;
    },
    createEntity: async (payload: any) => {
      const r = await fetch(`/api/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-b64": headerSessionB64() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "فشل إنشاء الكيان");
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

  const load = async () => {
    setLoading(true);
    setErrMsg("");
    try {
      const ents = await api.getEntities();
      setList(Array.isArray(ents) ? ents : []);
    } catch (e: any) {
      setErrMsg(e?.message || "تعذّر تحميل البيانات");
      setList([]);
    } finally { setLoading(false); }
  };
useEffect(() => {
  load();            
}, [isUnion]); 

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) =>
      [e.name, e.type, e.location, e.phone, e.contactEmail].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [list, search]);

  
  async function uploadFile(file: File, setBusy: (v: boolean) => void, onUrl: (url: string) => void) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "entityLogo");
    setBusy(true);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "فشل رفع الملف");
      onUrl(String(data.url));
    } catch (err: any) {
      alert(err?.message || "فشل رفع الملف");
    } finally { setBusy(false); }
  }

  const editFileRef = useRef<HTMLInputElement>(null);
  const createFileRef = useRef<HTMLInputElement>(null);

  const handleEditFilePick = async (file: File) => {
    await uploadFile(file, setUploadingEdit, (url) => setForm((p) => ({ ...p, imageUrl: url })));
  };
  const handleCreateFilePick = async (file: File) => {
    await uploadFile(file, setUploadingCreate, (url) => setCreateForm((p) => ({ ...p, imageUrl: url })));
  };

  
  function openEditModal(e: Entity) {
    setEditTarget(e);
    setEditingId(e.id);
    const [city = "", address = ""] = (e.location || "").split(" - ").map((x) => x?.trim() || "");
    setForm({
      name: e.name || "",
      type: e.type || "",
      contactPhone: e.phone || "",
      contactEmail: e.contactEmail || "",
      city, address,
      imageUrl: e.imageUrl || "",
    });
    setEditModalOpen(true);
  }
  function closeEditModal() {
    setEditModalOpen(false);
    setEditTarget(null);
    setEditingId(null);
    setForm({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "", imageUrl: "" });
  }

  async function onDelete(id: string) {
    if (!confirm("تأكيد حذف الكيان؟")) return;
    try {
      const res = await api.deleteEntity(id);
      if (res.applied !== "direct") alert("تم إرسال طلب حذف بانتظار موافقة مسؤول الاتحاد.");
      await load();
    } catch (e: any) { alert(e?.message || "فشل الحذف"); }
  }

  async function onSaveFromModal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim() || undefined,
        type: form.type.trim() || undefined,
        phone: form.contactPhone.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        location: [form.city.trim(), form.address.trim()].filter(Boolean).join(" - ") || undefined,
        imageUrl: form.imageUrl.trim() ? form.imageUrl.trim() : null,
      };
      const res = await api.patchEntity(editingId, payload);
      if (res.applied !== "direct") alert("تم إرسال التعديل بانتظار موافقة مسؤول الاتحاد.");
      closeEditModal();
      await load();
    } catch (err: any) {
      alert(err?.message || "فشل الحفظ");
    } finally { setSaving(false); }
  }

  async function toggleSuspend(e: Entity) {
    try {
      const next = e.status === "suspended" ? "approved" : "suspended";
      const msg = e.status === "suspended" ? "سيتم استئناف الكيان؟" : "سيتم إيقاف الكيان مؤقتًا؟";
      if (!confirm(msg)) return;
      const res = await api.patchEntity(e.id, { status: next });
      if (res.applied !== "direct") alert("تم إرسال طلب تغيير الحالة بانتظار الموافقة.");
      await load();
    } catch (err: any) { alert(err?.message || "تعذر تغيير الحالة"); }
  }

  
  function joinEntityFromDetails() {
    if (!detailTarget) return;
    setDetailOpen(false);
    router.push(`/dashboard/requests?entityId=${encodeURIComponent(detailTarget.id)}`);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) return alert("اسم الكيان مطلوب");
    try {
      const payload = {
        name: createForm.name.trim(),
        type: createForm.type.trim() || null,
        phone: createForm.contactPhone.trim() || null,
        contactEmail: createForm.contactEmail.trim() || null,
        location: [createForm.city.trim(), createForm.address.trim()].filter(Boolean).join(" - ") || null,
        imageUrl: createForm.imageUrl.trim() || null,
      };
      const res = await api.createEntity(payload);
      if (res.status === "approved") alert("تم إنشاء الكيان بنجاح.");
      else alert("تم إرسال طلب إنشاء إلى مسؤول الاتحاد. بانتظار الموافقة.");
      setCreateForm({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "", imageUrl: "" });
      setCreateModalOpen(false);
      await load();
    } catch (e: any) { alert(e?.message || "فشل إنشاء الكيان"); }
  }

  return (
    <div dir="rtl" className={`${cairo.className} relative min-h-screen overflow-hidden flex flex-col`} style={{ backgroundColor: PALETTE.bg, color: PALETTE.text }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Building2 className="h-5 w-5" color={PALETTE.text} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">الكيانات الشبابية</h1>
              <p className="text-sm" style={{ color: PALETTE.hint }}>
                {isUnion ? "تحرير/حذف مباشر، وإنشاء كيانات مباشرة."
                  : isManager ? "يمكنك اقتراح كيان جديد وسيعتمد بواسطة مسؤول الاتحاد."
                  : "اضغط على أي كيان لعرض التفاصيل والانضمام."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-9 px-3 rounded-full flex items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              {`${list.length} كيان`}
            </div>
            {(isUnion || isManager) && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="h-10 px-4 rounded-full font-semibold"
                style={{ backgroundColor: PALETTE.red, color: "#fff", border: "1px solid #d01821" }}
                title="إضافة كيان"
              >
                إضافة كيان
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
        {}
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-[32rem]">
            <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
            <Input placeholder="ابحث بالاسم/المدينة/البريد..." className="pr-9 h-11 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setSearch("")} className="h-11 rounded-full">مسح</Button>
        </div>

        {}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: "#F6F6F6", border: `1px solid ${PALETTE.border}` }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10" style={{ color: "#7A7A7A" }}>لا توجد كيانات</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filtered.map((e) => (
              <EntityTile
                key={e.id}
                entity={e}
                canManage={!!isUnion}
                onEdit={() => openEditModal(e)}
                onDelete={() => onDelete(e.id)}
                onToggle={() => toggleSuspend(e)}
                onOpenDetails={() => { setDetailTarget(e); setDetailOpen(true); }}
              />
            ))}

            {(isUnion || isManager) && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-white border transition hover:-translate-y-0.5"
                style={{ borderColor: PALETTE.border, boxShadow: "0 10px 18px rgba(0,0,0,0.07)" }}
                title="إضافة كيان"
              >
                <span className="h-28 w-28 rounded-2xl grid place-items-center" style={{ background: "#F6F6F6", border: "1px solid #E5E5E5" }}>
                  <Plus className="h-9 w-9" />
                </span>
                <div className="text-sm font-semibold">إضافة كيان</div>
                <div className="text-[11px]" style={{ color: PALETTE.hint }}>
                  {isUnion ? "إنشاء مباشر" : "إرسال طلب موافقة"}
                </div>
              </button>
            )}
          </div>
        )}

        {errMsg && <div className="text-sm text-red-600">{errMsg}</div>}

        {}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent dir="rtl" className={`${cairo.className} max-w-2xl`}>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                تفاصيل الكيان
                <DialogClose asChild>
                  <button className="rounded-full p-1" title="إغلاق"><X className="h-5 w-5" /></button>
                </DialogClose>
              </DialogTitle>
            </DialogHeader>

            {detailTarget && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <div className="rounded-2xl overflow-hidden border bg-white" style={{ borderColor: PALETTE.border }}>
                    <div className="h-44 grid place-items-center">
                      {detailTarget.imageUrl ? (
                        <img src={detailTarget.imageUrl} alt={detailTarget.name} className="max-h-44 object-contain" />
                      ) : (
                        <ImgIcon className="h-8 w-8" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <h3 className="text-lg font-bold">{detailTarget.name}</h3>
                  {detailTarget.type && <div className="text-sm text-neutral-600">{detailTarget.type}</div>}
                  <div className="text-sm flex items-center gap-2 text-neutral-700"><MapPin className="h-4 w-4" /> {detailTarget.location || "—"}</div>
                  <div className="text-sm flex items-center gap-2 text-neutral-700"><Phone className="h-4 w-4" /> {detailTarget.phone || "—"}</div>
                  <div className="text-sm flex items-center gap-2 text-neutral-700"><Mail className="h-4 w-4" /> {detailTarget.contactEmail || "—"}</div>
                  <div className="text-sm flex items-center gap-2 text-neutral-700"><Calendar className="h-4 w-4" /> تاريخ الإضافة: {detailTarget.createdAt?.slice(0, 10) || "—"}</div>
                  <div className="text-sm flex items-center gap-2 text-neutral-700"><ShieldCheck className="h-4 w-4" /> الحالة: {detailTarget.status || "—"}</div>

                  {Array.isArray(detailTarget.documents) && detailTarget.documents.length > 0 && (
                    <div className="text-sm">
                      <div className="font-semibold mb-1">مستندات/روابط:</div>
                      <ul className="list-disc pr-5 space-y-0.5">
                        {detailTarget.documents.map((d, i) => (
                          <li key={i} className="truncate">{String(d)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-2">
                    {isUser && (
                      <Button onClick={joinEntityFromDetails} className="h-10 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff" }}>
                        الانضمام للكيان
                      </Button>
                    )}
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="h-10 rounded-full">إغلاق</Button>
                    </DialogClose>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter />
          </DialogContent>
        </Dialog>

        {}
        <EditModal
          open={editModalOpen}
          setOpen={setEditModalOpen}
          form={form}
          setForm={setForm}
          onSubmit={onSaveFromModal}
          uploading={uploadingEdit}
          setUploading={setUploadingEdit}
          editFileRef={editFileRef}
          onPickFile={handleEditFilePick}
          onClearImage={() => setForm((p) => ({ ...p, imageUrl: "" }))}
          saving={saving}
          onClose={closeEditModal}
        />

        {}
        <CreateModal
          open={createModalOpen}
          setOpen={setCreateModalOpen}
          form={createForm}
          setForm={setCreateForm}
          onSubmit={submitCreate}
          uploading={uploadingCreate}
          setUploading={setUploadingCreate}
          createFileRef={createFileRef}
          onPickFile={handleCreateFilePick}
          onClearImage={() => setCreateForm((p) => ({ ...p, imageUrl: "" }))}
        />
      </main>
    </div>
  );
}

function EntityTile({
  entity, canManage, onEdit, onDelete, onToggle, onOpenDetails,
}: {
  entity: Entity;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onOpenDetails: () => void;
}) {
  const suspended = entity.status === "suspended";
  return (
    <div
      className="rounded-2xl p-6 bg-white border flex flex-col items-stretch transition hover:-translate-y-0.5"
      style={{ borderColor: "#E7E2DC", boxShadow: "0 10px 18px rgba(0,0,0,0.07)" }}
    >
      {}
      <button
        onClick={onOpenDetails}
        className="h-40 grid place-items-center rounded-2xl overflow-hidden w-full"
        style={{ background: "#FAFAFA", border: "1px solid #EDEDED" }}
        title="عرض التفاصيل"
      >
        {entity.imageUrl ? (
          <img src={entity.imageUrl} alt={entity.name} className="max-h-40 object-contain" />
        ) : (
          <ImgIcon className="h-8 w-8" />
        )}
      </button>

      <div className="mt-3 text-center text-[15px] font-semibold line-clamp-2">{entity.name}</div>
      {entity.type && <div className="mt-0.5 text-center text-xs text-neutral-600 line-clamp-1">{entity.type}</div>}

      {}
      {canManage && (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full text-[12px] px-4"
              onClick={onEdit}
              title="تعديل"
              style={{ borderColor: "#4B5563", color: "#4B5563", background: "#F3F4F6" }}
            >
              <Edit2 className="h-4 w-4 mr-1" /> تعديل
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full text-[12px] px-3"
              onClick={onToggle}
              title={suspended ? "استئناف" : "تعليق"}
              style={{ borderColor: PALETTE.orange, color: PALETTE.orange, background: "#FFF7ED" }}
            >
              {suspended ? <PlayCircle className="h-4 w-4 mr-1" /> : <PauseCircle className="h-4 w-4 mr-1" />}
              {suspended ? "استئناف" : "تعليق"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full text-[12px] px-3"
              onClick={onDelete}
              title="حذف"
              style={{ borderColor: PALETTE.red, color: PALETTE.red, background: "#FEE2E2" }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> حذف
            </Button>
          </div>

          {entity.status && (
            <div className="mt-3 text-center text-[11px]" style={{ color: "#6B6B6B" }}>
              الحالة: {entity.status}
            </div>
          )}
        </>
      )}
    </div>
  );
}



type EditModalProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  
  editFileRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: (file: File) => Promise<void>;
  onClearImage: () => void;
  saving: boolean;
  onClose: () => void;
};
function EditModal({
  open, setOpen, form, setForm, onSubmit,
  uploading, setUploading, 
  editFileRef, onPickFile, onClearImage, saving,
}: EditModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            تعديل بيانات الكيان
            <DialogClose asChild>
              <button className="rounded-full p-1" title="إغلاق"><X className="h-5 w-5" /></button>
            </DialogClose>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Field label="اسم الكيان"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="نوع الكيان"><Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="هاتف التواصل"><Input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="البريد الإلكتروني"><Input type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="المدينة"><Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="العنوان"><Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="h-11 rounded-xl" /></Field>

          {}
          <div className="md:col-span-2">
            <span className="text-sm">شعار الكيان (اختياري)</span>
            <div className="mt-2 flex items-start gap-4 flex-wrap">
              <div className="h-28 w-28 rounded-xl grid place-items-center border bg-white overflow-hidden" style={{ borderColor: PALETTE.border }}>
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="شعار" className="max-h-28 object-contain" />
                ) : (
                  <ImgIcon className="h-7 w-7" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
               <input
  ref={editFileRef}
  type="file"
  accept="image/png,image/jpeg,image/webp"
  className="hidden"
  onChange={(e) => {
    const inputEl = e.currentTarget;               
    const f = inputEl.files?.[0];
    if (!f) return;

    onPickFile(f)                                  
      .finally(() => {
        try { inputEl.value = ""; } catch {}
      });
  }}
/>
                <Button
                  type="button"
                  onClick={() => editFileRef.current?.click()}
                  className="h-10 rounded-full gap-2"
                  variant="outline"
                  title="رفع شعار"
                >
                  <UploadCloud className="h-4 w-4" /> {uploading ? "جارِ الرفع..." : "رفع/استبدال الشعار"}
                </Button>

                {form.imageUrl && (
                  <Button
                    type="button"
                    onClick={onClearImage}
                    className="h-10 rounded-full gap-2"
                    variant="outline"
                    style={{ borderColor: PALETTE.red, color: PALETTE.red, background: "#FEE2E2" }}
                    title="حذف الشعار"
                  >
                    <Trash className="h-4 w-4" /> إزالة الشعار
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <Button type="submit" disabled={uploading || saving} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff" }}>
              <Save className="h-4 w-4" /> {saving ? "يحفظ..." : "حفظ"}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-11 rounded-full">إلغاء</Button>
            </DialogClose>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type CreateModalProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: (e: React.FormEvent) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  
  createFileRef: React.RefObject<HTMLInputElement | null>;
  onPickFile: (file: File) => Promise<void>;
  onClearImage: () => void;
};
function CreateModal({
  open, setOpen, form, setForm, onSubmit,
  uploading, setUploading, 
  createFileRef, onPickFile, onClearImage,
}: CreateModalProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            إضافة/اقتراح كيان جديد
            <DialogClose asChild><button className="rounded-full p-1" title="إغلاق"><X className="h-5 w-5" /></button></DialogClose>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Field label="اسم الكيان"><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="نوع الكيان"><Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="هاتف التواصل"><Input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="البريد الإلكتروني"><Input type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="المدينة"><Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="h-11 rounded-xl" /></Field>
          <Field label="العنوان"><Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="h-11 rounded-xl" /></Field>

          {}
          <div className="md:col-span-2">
            <span className="text-sm">شعار الكيان (اختياري)</span>
            <div className="mt-2 flex items-start gap-4 flex-wrap">
              <div className="h-28 w-28 rounded-xl grid place-items-center border bg-white overflow-hidden" style={{ borderColor: PALETTE.border }}>
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="شعار" className="max-h-28 object-contain" />
                ) : (
                  <ImgIcon className="h-7 w-7" />
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
              <input
  ref={createFileRef}
  type="file"
  accept="image/png,image/jpeg,image/webp"
  className="hidden"
  onChange={(e) => {
    const inputEl = e.currentTarget;               
    const f = inputEl.files?.[0];
    if (!f) return;

    onPickFile(f)
      .finally(() => {
        try { inputEl.value = ""; } catch {}
      });
  }}
/>
                <Button
                  type="button"
                  onClick={() => createFileRef.current?.click()}
                  className="h-10 rounded-full gap-2"
                  variant="outline"
                  title="رفع شعار"
                >
                  <UploadCloud className="h-4 w-4" /> {uploading ? "جارِ الرفع..." : "رفع الشعار"}
                </Button>

                {form.imageUrl && (
                  <Button
                    type="button"
                    onClick={onClearImage}
                    className="h-10 rounded-full gap-2"
                    variant="outline"
                    style={{ borderColor: PALETTE.red, color: PALETTE.red, background: "#FEE2E2" }}
                    title="حذف الشعار"
                  >
                    <Trash className="h-4 w-4" /> إزالة الشعار
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff" }}>
              <Save className="h-4 w-4" /> حفظ
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>منصة الكيانات الشبابية</Link>
          </div>

          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/profile", label: "الملف الشخصي" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
              { href: "/entities", label: "الكيانات" },
            ].map((l) => (
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

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-sm" style={{ color: "#1D1D1D" }}>{label}</span>
      {children}
    </label>
  );
}
