"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Users, UserPlus, Building2, Search, Trash2, Pencil, Check, X } from "lucide-react";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

type Member = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  roleInEntity?: string | null;
  entityId?: string | null;
  joinedAt: string;
};

export default function MembersPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [entities, setEntities] = useState<any[]>([]);
  const [list, setList] = useState<Member[]>([]);

  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [form, setForm] = useState({
    entityId: "",
    name: "",
    email: "",
    phone: "",
    roleInEntity: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Member> | null>(null);

  const canManage = (r?: UserRole | null) => !!r && ["systemAdmin", "entityManager"].includes(r!);

  const sessionHeader = () => localStorage.getItem("session") || "";

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/entities failed");
      return await res.json();
    },
    getMembers: async () => {
      const res = await fetch("/api/members", { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/members failed");
      return await res.json();
    },
    createMember: async (payload: any) => {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session": sessionHeader() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    updateMember: async (id: string, payload: any) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-session": sessionHeader() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    deleteMember: async (id: string) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
        headers: { "x-session": sessionHeader() },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  };

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      const parsed: Session = JSON.parse(s);
      if (!canManage(parsed.role)) { router.push("/dashboard"); return; }
      setSession(parsed);
    } catch { router.push("/"); }
  }, [router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErrMsg("");
      try {
        const ents = await api.getEntities();
        const members = await api.getMembers();
        if (!mounted) return;
        setEntities(Array.isArray(ents) ? ents : []);
        setList(Array.isArray(members) ? members : []);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message || "تعذر تحميل البيانات");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!session || !entities.length) return;
    const def = String(entities.find((e: any) => String(e.id) === String(session.entityId))?.id
              ?? entities[0]?.id ?? "");
    setForm(p => ({ ...p, entityId: p.entityId || def }));
    if (session.role === "entityManager") {
      setFilterEntity(session.entityId ? String(session.entityId) : "all");
    }
  }, [session, entities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list || [])
      .filter(m => (filterEntity === "all" ? true : String(m.entityId || "") === String(filterEntity)))
      .filter(m => {
        if (!q) return true;
        const hay = [m.name, m.email, m.phone, m.roleInEntity].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [list, filterEntity, search]);

  if (!session) return null;

  const resetForm = () =>
    setForm({
      entityId: session?.entityId ? String(session.entityId) : (entities[0]?.id ? String(entities[0].id) : ""),
      name: "",
      email: "",
      phone: "",
      roleInEntity: "",
    });

  const refreshMembers = async () => {
    try { setList(await api.getMembers()); } catch { setList([]); }
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.entityId) return alert("اختر الكيان");
    if (!form.name.trim()) return alert("اسم العضو مطلوب");

    setSaving(true);
    try {
      await api.createMember({
        entityId: String(form.entityId),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        roleInEntity: form.roleInEntity.trim() || undefined,
      });
      await refreshMembers();
      resetForm();
    } catch (err: any) {
      try {
        const parsed = JSON.parse(err.message || "{}");
        alert(parsed?.error || "فشل الإضافة");
      } catch {
        alert("فشل الإضافة");
      }
    } finally { setSaving(false); }
  };

  const startEdit = (m: Member) => {
    setEditingId(m.id);
    setEditDraft({
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      roleInEntity: m.roleInEntity || "",
      entityId: m.entityId ? String(m.entityId) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const confirmEdit = async () => {
    if (!editingId || !editDraft) return;
    if (!editDraft.entityId) return alert("اختر الكيان");
    try {
      await api.updateMember(editingId, {
        name: (editDraft.name || "").toString(),
        email: (editDraft.email || "") || null,
        phone: (editDraft.phone || "") || null,
        roleInEntity: (editDraft.roleInEntity || "") || null,
        entityId: String(editDraft.entityId),
      });
      await refreshMembers();
      cancelEdit();
    } catch {
      alert("لم يتم التعديل");
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("تأكيد حذف هذا العضو؟")) return;
    try { await api.deleteMember(id); await refreshMembers(); }
    catch { alert("لم يتم الحذف"); }
  };

  const isEntityManager = session.role === "entityManager";

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>إدارة الأعضاء</h1>
              <p className="text-sm" style={{ color: "#6B6B6B" }}>تسجيل الأعضاء وربطهم بالكيانات</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full flex items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: "#1D1D1D" }}>
            {list.length} عضو
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: "#1D1D1D" }}>
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: "#6B6B6B" }}>
            {errMsg}
          </div>
        )}

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" color="#1D1D1D" />
              {editingId ? "تعديل عضو" : "إضافة عضو جديد"}
            </CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>
              {editingId ? "عدّل بيانات العضو ثم اضغط حفظ" : "أدخل بيانات العضو واختر الكيان التابع له"}
            </CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

          <CardContent className="px-5 pb-5">
            <form onSubmit={editingId ? (e)=>{e.preventDefault();confirmEdit();} : onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="الكيان">
                <Select
                  value={editingId ? String(editDraft?.entityId ?? "") : String(form.entityId ?? "")}
                  onValueChange={(v) => {
                    if (editingId) setEditDraft(p => ({ ...(p as any), entityId: v }));
                    else setForm(p => ({ ...p, entityId: v }));
                  }}
                  disabled={isEntityManager}
                >
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                    <SelectValue placeholder="اختر الكيان" />
                  </SelectTrigger>
                  <SelectContent>
                    {(isEntityManager
                      ? entities.filter(e => String(e.id) === String(session.entityId))
                      : entities
                    ).map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="اسم العضو">
                <Input
                  value={editingId ? (editDraft?.name as string) || "" : form.name}
                  onChange={(e) => editingId
                    ? setEditDraft(p => ({ ...(p as any), name: e.target.value }))
                    : setForm(p => ({ ...p, name: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>

              <Field label="البريد الإلكتروني">
                <Input
                  type="email"
                  value={editingId ? (editDraft?.email as string) || "" : form.email}
                  onChange={(e) => editingId
                    ? setEditDraft(p => ({ ...(p as any), email: e.target.value }))
                    : setForm(p => ({ ...p, email: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>

              <Field label="رقم الهاتف">
                <Input
                  value={editingId ? (editDraft?.phone as string) || "" : form.phone}
                  onChange={(e) => editingId
                    ? setEditDraft(p => ({ ...(p as any), phone: e.target.value }))
                    : setForm(p => ({ ...p, phone: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>

              <Field label="دور العضو داخل الكيان" className="md:col-span-2">
                <Input
                  value={editingId ? (editDraft?.roleInEntity as string) || "" : form.roleInEntity}
                  onChange={(e) => editingId
                    ? setEditDraft(p => ({ ...(p as any), roleInEntity: e.target.value }))
                    : setForm(p => ({ ...p, roleInEntity: e.target.value }))
                  }
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                {editingId ? (
                  <>
                    <Button type="button" onClick={confirmEdit} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                      <Check className="h-4 w-4" /> حفظ
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit} className="h-11 rounded-full" style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0", color: "#1D1D1D" }}>
                      <X className="h-4 w-4" /> إلغاء
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="submit" disabled={saving} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                      {saving ? "جارٍ الحفظ..." : "إضافة"}
                    </Button>
                    <button type="button" onClick={resetForm} className="h-11 px-5 rounded-full transition" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                      مسح الحقول
                    </button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </SurfaceCard>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>قائمة الأعضاء</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>فلترة حسب الكيان أو البحث بالاسم/البريد/الهاتف</CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label="فلتر الكيان">
                <Select
                  value={isEntityManager ? (session.entityId ? String(session.entityId) : "all") : filterEntity}
                  onValueChange={setFilterEntity}
                  disabled={isEntityManager}
                >
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                    <SelectValue placeholder="جميع الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    {isEntityManager ? (
                      session.entityId ? (
                        <SelectItem value={String(session.entityId)}>
                          {entities.find(e => String(e.id) === String(session.entityId))?.name || "كياني"}
                        </SelectItem>
                      ) : (
                        <SelectItem value="all">جميع الكيانات</SelectItem>
                      )
                    ) : (
                      <>
                        <SelectItem value="all">جميع الكيانات</SelectItem>
                        {entities.map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Label className="text-sm" style={{ color: "#1D1D1D" }}>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                  <Input
                    placeholder="ابحث بالاسم/البريد/الهاتف..."
                    className="pr-9 h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>لا يوجد أعضاء لعرضهم</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((m) => {
                  const ent = entities.find((e) => String(e.id) === String(m.entityId));
                  const isEditing = editingId === m.id;
                  const canEditRow =
                    session.role === "systemAdmin" ||
                    (session.role === "entityManager" && String(session.entityId || "") === String(m.entityId || ""));

                  return (
                    <li key={m.id} className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
                          <Users className="h-5 w-5" color="#1D1D1D" />
                        </div>

                        <div className="flex-1 space-y-2">
                          {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Input value={editDraft?.name as string || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), name: e.target.value }))} className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                              <Input value={editDraft?.email as string || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), email: e.target.value }))} className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                              <Input value={editDraft?.phone as string || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), phone: e.target.value }))} className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} />
                              <Input value={editDraft?.roleInEntity as string || ""} onChange={(e) => setEditDraft(p => ({ ...(p as any), roleInEntity: e.target.value }))} className="h-10 rounded-xl md:col-span-2" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }} placeholder="الدور داخل الكيان" />
                              <Select
                                value={String(editDraft?.entityId ?? m.entityId ?? "")}
                                onValueChange={(v) => setEditDraft(p => ({ ...(p as any), entityId: v }))}
                                disabled={session.role === "entityManager"}
                              >
                                <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                  <SelectValue placeholder="الكيان" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(session.role === "entityManager"
                                    ? entities.filter((e) => String(e.id) === String(session.entityId))
                                    : entities
                                  ).map((e) => (
                                    <SelectItem key={e.id} value={String(e.id)}>
                                      {e.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold" style={{ color: "#1D1D1D" }}>{m.name}</div>
                              <div className="text-xs" style={{ color: "#6B6B6B" }}>{m.email || "—"} • {m.phone || "—"}</div>
                              <div className="text-xs flex items-center gap-1" style={{ color: "#6B6B6B" }}>
                                <Building2 className="h-3 w-3" color="#6B6B6B" />
                                <span>{ent?.name || "بدون كيان"}</span>
                              </div>
                              {m.roleInEntity && <div className="text-xs" style={{ color: "#1D1D1D" }}>الدور: {m.roleInEntity}</div>}
                            </>
                          )}
                        </div>

                        {canEditRow && (
                          <div className="flex flex-col gap-2 items-end">
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button onClick={confirmEdit} className="h-9 w-9 p-0 rounded-full" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button onClick={cancelEdit} variant="secondary" className="h-9 w-9 p-0 rounded-full" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <Button onClick={() => removeMember(m.id)} className="h-9 w-9 p-0 rounded-full" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => startEdit(m)} variant="secondary" className="h-9 w-9 p-0 rounded-full" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
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
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/members", label: "الأعضاء" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{
                  color: active(l.href) ? "#FFFFFF" : "#1D1D1D",
                  backgroundColor: active(l.href) ? "#EC1A24" : "transparent",
                }}
              >
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
