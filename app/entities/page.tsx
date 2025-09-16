// /app/entities/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, Save, Edit2, Search, Users, Trash2, Plus, Clock } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

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
  status?: "approved" | "pending" | "rejected" | string;
};

type FormState = { name: string; type: string; contactPhone: string; contactEmail: string; city: string; address: string };

type EntityRequest = {
  id: string;
  action: "create" | "update" | "delete";
  targetEntityId?: string | null;
  payload?: any;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  createdBy: string;
  createdByRole: "entityManager" | "unionSupervisor";
  approverRole: "unionSupervisor";
  createdByName?: string | null;
  createdByEmail?: string | null;
  decidedAt?: string | null;
  note?: string | null;
};

const PALETTE = { border: "#E7E2DC", bg: "#EFE6DE", text: "#1D1D1D", hint: "#6B6B6B", red: "#EC1A24" };

export default function EntitiesPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [list, setList] = useState<Entity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" });
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState<FormState>({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" });

  const [unionInbox, setUnionInbox] = useState<EntityRequest[]>([]);
  const [inboxLoading, setInboxLoading] = useState(false);

  const isUnion = session?.role === "unionSupervisor";
  const isManager = session?.role === "entityManager";
  const isUser = session?.role === "user";

  const headerSessionB64 = () => {
    const raw = localStorage.getItem("session") || "";
    try {
      return btoa(unescape(encodeURIComponent(raw)));
    } catch {
      return "";
    }
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
    getUnionInbox: async (status: "pending" | "approved" | "rejected" | "all" = "pending") => {
      const r = await fetch(`/api/entities/requests?status=${status}`, { cache: "no-store" });
      if (!r.ok) throw new Error("تعذّر جلب الطلبات");
      return (await r.json()) as EntityRequest[];
    },
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (!raw) {
        router.push("/");
        return;
      }
      setSession(JSON.parse(raw));
    } catch {
      router.push("/");
    }
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
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!isUser) load();
  }, [isUnion, isUser]);

  useEffect(() => {
    if (!isUnion) return;
    setInboxLoading(true);
    api
      .getUnionInbox("pending")
      .then((rows) => setUnionInbox(rows || []))
      .catch(() => setUnionInbox([]))
      .finally(() => setInboxLoading(false));
  }, [isUnion]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => [e.name, e.type, e.location, e.phone, e.contactEmail].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [list, search]);

  function fillEdit(e: Entity) {
    setEditingId(e.id);
    const [city = "", address = ""] = (e.location || "").split(" - ").map((x) => x?.trim() || "");
    setForm({
      name: e.name || "",
      type: e.type || "",
      contactPhone: e.phone || "",
      contactEmail: e.contactEmail || "",
      city,
      address,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSave(e: React.FormEvent) {
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
      };
      const res = await api.patchEntity(editingId, payload);
      if (res.applied === "direct") {
      } else {
        alert("تم إرسال التعديل بانتظار موافقة مسؤول الاتحاد.");
      }
      setEditingId(null);
      setForm({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" });
      await load();
    } catch (err: any) {
      alert(err?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("تأكيد حذف الكيان؟")) return;
    try {
      const res = await api.deleteEntity(id);
      if (res.applied === "direct") {
      } else {
        alert("تم إرسال طلب حذف بانتظار موافقة مسؤول الاتحاد.");
      }
      await load();
    } catch (e: any) {
      alert(e?.message || "فشل الحذف");
    }
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
      };
      const res = await api.createEntity(payload);
      if (res.status === "approved") {
        alert("تم إنشاء الكيان بنجاح.");
      } else {
        alert("تم إرسال طلب إنشاء إلى مسؤول الاتحاد. بانتظار الموافقة.");
      }
      setCreateForm({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" });
      await load();
    } catch (e: any) {
      alert(e?.message || "فشل إنشاء الكيان");
    }
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
              <h1 className="text-2xl md:text-3xl font-extrabold">{isUnion ? "إدارة الكيانات" : isManager ? "اقتراح كيان جديد" : "طلبات الانضمام"}</h1>
              <p className="text-sm" style={{ color: PALETTE.hint }}>
                {isUnion ? "تحرير/حذف مباشر، وإنشاء كيانات مباشرة." : isManager ? "يمكنك اقتراح كيان جديد وسيعتمد بواسطة مسؤول الاتحاد." : "للتقديم على كيان، استخدم صفحة طلبات الانضمام"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-9 px-3 rounded-full flex items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              {isUser ? "—" : `${list.length} كيان`}
            </div>
            {isUnion && (
              <button onClick={() => document.getElementById("admin-create-entity")?.scrollIntoView({ behavior: "smooth" })} className="h-9 px-3 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff", border: "1px solid #d01821" }} title="إضافة كيان">
                إضافة كيان
              </button>
            )}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
        {isUser && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5">
              <CardTitle>التقديم على الانضمام</CardTitle>
              <CardDescription style={{ color: PALETTE.hint }}>التقديم يتم الآن من شاشة واحدة مخصّصة. اضغط الزر التالي للانتقال لصفحة الطلبات.</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <Button className="h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff" }} onClick={() => router.push("/dashboard/requests")}>
                فتح صفحة طلبات الانضمام
              </Button>
            </CardContent>
          </SurfaceCard>
        )}

        {isUnion && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                طلبات إنشاء كيانات مقدَّمة من مسؤولي الكيانات (عرض فقط)
              </CardTitle>
              <CardDescription style={{ color: PALETTE.hint }}>تظهر هنا الطلبات التي قدّمها مسؤولو الكيانات. الاعتماد أو الرفض من صلاحيات مسؤول الاتحاد.</CardDescription>
            </CardHeader>
            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />
            <CardContent className="px-5 pb-5">
              {inboxLoading ? (
                <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: "#F6F6F6", border: `1px solid ${PALETTE.border}` }} />
              ) : unionInbox.length === 0 ? (
                <div className="text-sm" style={{ color: PALETTE.hint }}>لا توجد طلبات حاليًا.</div>
              ) : (
                <ul className="space-y-3">
                  {unionInbox.map((r) => {
                    const p = r.payload ? (typeof r.payload === "string" ? JSON.parse(r.payload) : r.payload) : {};
                    return (
                      <li key={r.id} className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">
                            طلب إنشاء كيان: <span className="underline">{p?.name || "—"}</span>
                          </div>
                          <div className="text-xs" style={{ color: PALETTE.hint }}>
                            الحالة: {r.status === "pending" ? "بانتظار اعتماد مسؤول الاتحاد" : r.status === "approved" ? "مقبول" : "مرفوض"}
                          </div>
                        </div>
                        <div className="text-xs mt-1" style={{ color: PALETTE.hint }}>
                          مقدَّم بواسطة: {r.createdByName || "—"} ({r.createdByEmail || "—"}) • {new Date(r.createdAt).toLocaleString()}
                        </div>
                        <div className="mt-2 text-sm" style={{ color: PALETTE.text }}>
                          <div>نوع الكيان: {p?.type || "—"}</div>
                          <div>هاتف: {p?.phone || "—"} • بريد: {p?.contactEmail || "—"}</div>
                          <div>الموقع: {p?.location || "—"}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </SurfaceCard>
        )}

        {(isManager || isUnion) && (
          <SurfaceCard id="admin-create-entity" className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {isUnion ? "إضافة كيان جديد" : "اقتراح كيان جديد"}
                {isUnion && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F6F6F6", border: "1px solid #E5E5E5" }}>مسؤول الاتحاد</span>}
              </CardTitle>
              <CardDescription style={{ color: PALETTE.hint }}>{isUnion ? "سيتم إنشاء الكيان والاعتماد مباشرة." : "سيتم إرسال الطلب إلى مسؤول الاتحاد للموافقة."}</CardDescription>
            </CardHeader>
            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />
            <CardContent className="px-5 pb-5">
              <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="اسم الكيان">
                  <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="نوع الكيان">
                  <Input value={createForm.type} onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="هاتف التواصل">
                  <Input value={createForm.contactPhone} onChange={(e) => setCreateForm((p) => ({ ...p, contactPhone: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="البريد الإلكتروني">
                  <Input type="email" value={createForm.contactEmail} onChange={(e) => setCreateForm((p) => ({ ...p, contactEmail: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="المدينة">
                  <Input value={createForm.city} onChange={(e) => setCreateForm((p) => ({ ...p, city: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="العنوان">
                  <Input value={createForm.address} onChange={(e) => setCreateForm((p) => ({ ...p, address: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <div className="md:col-span-2">
                  <Button type="submit" className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff" }}>
                    <Save className="h-4 w-4" />
                    {isUnion ? "إنشاء كيان" : "إرسال طلب إنشاء"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </SurfaceCard>
        )}

        {isUnion && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                تعديل بيانات كيان
              </CardTitle>
              <CardDescription style={{ color: PALETTE.hint }}>يُطبّق فورًا لمسؤول الاتحاد. مقترحات مسؤولي الكيانات تُرسل للمراجعة.</CardDescription>
            </CardHeader>
            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />
            <CardContent className="px-5 pb-5">
              <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="اختر كيان للتحرير">
                  <Select value={editingId ?? ""} onValueChange={(v) => fillEdit(list.find((x) => x.id === v)!)} >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="اختـر" />
                    </SelectTrigger>
                    <SelectContent>
                      {list.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} {e.status && e.status !== "approved" ? `— ${e.status}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="اسم الكيان">
                  <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="نوع الكيان">
                  <Input value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="هاتف التواصل">
                  <Input value={form.contactPhone} onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="البريد الإلكتروني">
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="المدينة">
                  <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="h-11 rounded-xl" />
                </Field>
                <Field label="العنوان">
                  <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className="h-11 rounded-xl" />
                </Field>

                <div className="md:col-span-2 flex items-center gap-2">
                  <Button type="submit" disabled={!editingId || saving} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#fff" }}>
                    <Save className="h-4 w-4" />
                    حفظ التعديل
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      onClick={() => onDelete(editingId)}
                      className="gap-2 h-11 rounded-full font-semibold"
                      style={{ background: "#fff", color: PALETTE.red, border: `1px solid ${PALETTE.red}` }}
                    >
                      <Trash2 className="h-4 w-4" />
                      حذف
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </SurfaceCard>
        )}

        {!isUser && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5">
              <CardTitle>قائمة الكيانات</CardTitle>
              <CardDescription style={{ color: PALETTE.hint }}>استعراض الكيانات</CardDescription>
            </CardHeader>

            <CardContent className="px-5 pb-5">
              <div className="mb-4 flex items-center gap-2">
                <div className="relative w-full md:w-80">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                  <Input placeholder="ابحث بالاسم/المدينة/البريد..." className="pr-9 h-11 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Button variant="outline" onClick={() => setSearch("")} className="h-11 rounded-full">
                  مسح
                </Button>
              </div>

              {loading ? (
                <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: "#F6F6F6", border: `1px solid ${PALETTE.border}` }} />
              ) : filtered.length === 0 ? (
                <div className="text-center py-10" style={{ color: "#7A7A7A" }}>لا توجد كيانات</div>
              ) : (
                <ul className="space-y-3">
                  {filtered.map((e) => (
                    <li key={e.id} className="rounded-2xl p-4 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                      <div>
                        <div className="font-semibold">{e.name}</div>
                        <div className="text-xs" style={{ color: "#6B6B6B" }}>
                          {(e.type || "-")} • {(e.location || "-")} • {(e.phone || "-")} • {(e.contactEmail || "-")}
                          {isUnion && e.status && e.status !== "approved" ? ` • حالة: ${e.status}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isUnion && (
                          <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={() => fillEdit(e)}>
                            <Edit2 className="h-4 w-4" /> تحرير
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </SurfaceCard>
        )}
      </main>
    </div>
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
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>
              منصة الكيانات الشبابية
            </Link>
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

function SurfaceCard({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <div id={id} className={`rounded-2xl ${className}`} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}
