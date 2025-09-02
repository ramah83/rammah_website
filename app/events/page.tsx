"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Calendar, Search, Plus, Pencil, Trash2, Check, X, Building2 } from "lucide-react";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

type EventItem = {
  id: string;
  title: string;
  date?: string | null;
  status: "draft" | "approved" | "cancelled" | "done";
  entityId?: string | null;
};

type JoinRequest = {
  id: string; userId: string; userName: string; userEmail: string;
  entityId: string; entityName: string; status: "pending" | "approved" | "rejected";
  createdAt: string; decidedAt?: string; decidedBy?: string;
};

const ALL = "all" as const;
const NO_ENTITY = "__no_entity__";

export default function EventsPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [entities, setEntities] = useState<any[]>([]);
  const [list, setList] = useState<EventItem[]>([]);

  const [myEntityIds, setMyEntityIds] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(ALL);
  const [filterEntity, setFilterEntity] = useState<string>(ALL);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<EventItem> | null>(null);

  const [form, setForm] = useState({
    entityId: "",
    title: "",
    date: "",
    status: "draft" as EventItem["status"],
  });

  const sessionHeader = () => localStorage.getItem("session") || "";

  const api = {
    getEntities: async () => {
      const r = await fetch("/api/entities", { cache: "no-store" });
      if (!r.ok) throw new Error("GET /api/entities failed");
      return r.json();
    },
    getEvents: async () => {
      const r = await fetch("/api/events", { cache: "no-store" });
      if (!r.ok) throw new Error("GET /api/events failed");
      return r.json();
    },
    getMyApprovedJoins: async (userId: string) => {
      const r = await fetch(`/api/join-requests?status=approved&userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (!r.ok) return [];
      return (await r.json()) as JoinRequest[];
    },
    createEvent: async (payload: any) => {
      const r = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session": sessionHeader() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    updateEvent: async (id: string, payload: any) => {
      const r = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-session": sessionHeader() },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    deleteEvent: async (id: string) => {
      const r = await fetch(`/api/events/${id}`, {
        method: "DELETE",
        headers: { "x-session": sessionHeader() },
        credentials: "include",
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (!raw) { router.push("/"); return; }
      const s: Session = JSON.parse(raw);
      setSession(s);
    } catch {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setErrMsg("");
      try {
        const [ents, events] = await Promise.all([api.getEntities(), api.getEvents()]);
        if (!mounted) return;
        setEntities(Array.isArray(ents) ? ents : []);
        setList(Array.isArray(events) ? events : []);
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
    if (!session || session.role !== "youth") return;
    (async () => {
      try {
        const approved = await api.getMyApprovedJoins(session.id);
        const ids = Array.from(new Set(approved.map(x => String(x.entityId))));
        setMyEntityIds(ids);
      } catch { setMyEntityIds([]); }
    })();
  }, [session]);

  const isEntityManager = session?.role === "entityManager";
  const isYouth = session?.role === "youth";
  const canManage = session?.role === "systemAdmin" || session?.role === "entityManager";
  const managerHasEntity = isEntityManager && !!session?.entityId;

  const safeEntities = useMemo(
    () => (entities || []).filter(e => e && String(e.id ?? "").trim() !== ""),
    [entities]
  );

  const myEntities = useMemo(
    () => safeEntities.filter(e => myEntityIds.includes(String(e.id))),
    [safeEntities, myEntityIds]
  );

  useEffect(() => {
    if (!session) return;
    const firstEntityId = safeEntities[0]?.id ? String(safeEntities[0].id) : "";
    const sessionEntityId = session.entityId ? String(session.entityId) : "";

    setForm(p => ({
      ...p,
      entityId: p.entityId || sessionEntityId || firstEntityId || NO_ENTITY,
    }));

    if (isEntityManager) {
      if (sessionEntityId) setFilterEntity(sessionEntityId);
      else setFilterEntity(ALL);
    } else if (isYouth) {
      setFilterEntity(ALL);
    }
  }, [session, safeEntities, isEntityManager, isYouth]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let base = list || [];
    if (isEntityManager) {
      base = base.filter(ev => String(ev.entityId || "") === String(session?.entityId || ""));
    } else if (isYouth) {
      if (myEntityIds.length > 0) {
        base = base.filter(ev => myEntityIds.includes(String(ev.entityId)));
      } else {
        base = []; 
      }
    }
    return base
      .filter(ev => (filterEntity === ALL ? true : String(ev.entityId || "") === String(filterEntity)))
      .filter(ev => (filterStatus === ALL ? true : ev.status === filterStatus))
      .filter(ev => {
        if (!q) return true;
        const hay = [ev.title, ev.date, ev.status].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [list, filterEntity, filterStatus, search, isEntityManager, isYouth, session?.entityId, myEntityIds]);

  const refresh = async () => {
    try { setList(await api.getEvents()); } catch { }
  };

  const resetForm = () => {
    const fallbackEnt =
      managerHasEntity ? String(session!.entityId) :
      (safeEntities[0]?.id ? String(safeEntities[0].id) : NO_ENTITY);
    setForm({ entityId: fallbackEnt, title: "", date: "", status: "draft" });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    if (!form.entityId || form.entityId === NO_ENTITY) {
      alert("لا يمكنك الحفظ قبل ربط الحساب بكيان.");
      return;
    }
    if (!form.title.trim()) return alert("العنوان مطلوب");
    setSaving(true);
    try {
      await api.createEvent({
        entityId: String(form.entityId),
        title: form.title.trim(),
        date: form.date || null,
        status: form.status,
      });
      await refresh();
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

  const startEdit = (ev: EventItem) => {
    const fallbackEnt =
      ev.entityId ? String(ev.entityId) :
      (managerHasEntity ? String(session!.entityId) :
        (safeEntities[0]?.id ? String(safeEntities[0].id) : NO_ENTITY));
    setEditingId(ev.id);
    setEditDraft({
      title: ev.title || "",
      date: ev.date || "",
      status: ev.status || "draft",
      entityId: fallbackEnt,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };

  const confirmEdit = async () => {
    if (!canManage) return;
    if (!editingId || !editDraft) return;
    if (!editDraft.entityId || editDraft.entityId === NO_ENTITY) {
      alert("اختر الكيان قبل الحفظ.");
      return;
    }
    if (!editDraft.title?.toString().trim()) return alert("العنوان مطلوب");
    try {
      await api.updateEvent(editingId, {
        entityId: String(editDraft.entityId),
        title: String(editDraft.title).trim(),
        date: (editDraft.date as string) || null,
        status: (editDraft.status as EventItem["status"]) || "draft",
      });
      await refresh();
      cancelEdit();
    } catch {
      alert("فشل التعديل");
    }
  };

  const removeEvent = async (id: string) => {
    if (!canManage) return;
    if (!confirm("تأكيد حذف الفعالية؟")) return;
    try { await api.deleteEvent(id); await refresh(); }
    catch { alert("فشل الحذف"); }
  };

  if (!session) return null;

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: "#EFE6DE", color: "#1D1D1D" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Calendar className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">الفعاليات</h1>
              <p className="text-sm" style={{ color: "#6B6B6B" }}>
                {canManage ? "إنشاء وإدارة الفعاليات وربطها بالكيانات" : "استعراض فعاليات كياناتك"}
              </p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
            {filtered.length} فعالية
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: "#6B6B6B" }}>
            {errMsg}
          </div>
        )}

        {isYouth && myEntityIds.length === 0 && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3 text-sm"
               style={{ background:"#FFF8E8", border:"1px solid #F2E7C6", color:"#6B6B6B" }}>
            لا تظهر فعاليات لأنك غير منضم لأي كيان بعد. يمكنك <Link href="/dashboard/requests" className="underline">تقديم طلب انضمام</Link>.
          </div>
        )}

        {canManage && (
          <SurfaceCard className="mx-3 sm:mx-[1cm]">
            <CardHeader className="pb-0 px-5 pt-5">
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" color="#1D1D1D" />
                {editingId ? "تعديل فعالية" : "إضافة فعالية"}
              </CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>
                {editingId ? "عدّل بيانات الفعالية ثم احفظ" : "أدخل بيانات الفعالية واختر الكيان"}
              </CardDescription>
            </CardHeader>

            <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

            <CardContent className="px-5 pb-5">
              <form onSubmit={editingId ? (e)=>{e.preventDefault();confirmEdit();} : onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="الكيان">
                  <Select
                    value={
                      editingId
                        ? String(editDraft?.entityId ?? (managerHasEntity ? session!.entityId : NO_ENTITY))
                        : (managerHasEntity
                            ? String(session!.entityId)
                            : (form.entityId || (safeEntities[0]?.id ? String(safeEntities[0].id) : NO_ENTITY)))
                    }
                    onValueChange={(v) => {
                      if (editingId) setEditDraft(p => ({ ...(p as any), entityId: v }));
                      else setForm(p => ({ ...p, entityId: v }));
                    }}
                    disabled={isEntityManager && managerHasEntity}
                  >
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}>
                      <SelectValue placeholder="اختر الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      {isEntityManager ? (
                        managerHasEntity ? (
                          <SelectItem value={String(session!.entityId)}>
                            {safeEntities.find(e => String(e.id) === String(session!.entityId))?.name || "كياني"}
                          </SelectItem>
                        ) : (
                          <SelectItem value={NO_ENTITY} disabled>لا يوجد كيان مرتبط بحسابك</SelectItem>
                        )
                      ) : (
                        safeEntities.map(e => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="عنوان الفعالية">
                  <Input
                    value={editingId ? (editDraft?.title as string) || "" : form.title}
                    onChange={(e) => editingId
                      ? setEditDraft(p => ({ ...(p as any), title: e.target.value }))
                      : setForm(p => ({ ...p, title: e.target.value }))
                    }
                    className="h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#E3E3E3" }}
                  />
                </Field>

                <Field label="التاريخ">
                  <Input
                    type="date"
                    value={editingId ? (editDraft?.date as string) || "" : form.date}
                    onChange={(e) => editingId
                      ? setEditDraft(p => ({ ...(p as any), date: e.target.value }))
                      : setForm(p => ({ ...p, date: e.target.value }))
                    }
                    className="h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#E3E3E3" }}
                  />
                </Field>

                <Field label="الحالة">
                  <Select
                    value={editingId ? String(editDraft?.status || "draft") : form.status}
                    onValueChange={(v) => editingId
                      ? setEditDraft(p => ({ ...(p as any), status: v as EventItem["status"] }))
                      : setForm(p => ({ ...p, status: v as EventItem["status"] }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">مسودة</SelectItem>
                      <SelectItem value="approved">معتمدة</SelectItem>
                      <SelectItem value="cancelled">ملغاة</SelectItem>
                      <SelectItem value="done">منتهية</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="md:col-span-2 flex items-center gap-3 pt-1">
                  {editingId ? (
                    <>
                      <Button
                        type="button"
                        onClick={confirmEdit}
                        className="gap-2 h-11 rounded-full font-semibold"
                        style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
                      >
                        <Check className="h-4 w-4" /> حفظ
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={cancelEdit}
                        className="h-11 rounded-full"
                        style={{ backgroundColor: "#FFFFFF", borderColor: "#E0E0E0" }}
                      >
                        <X className="h-4 w-4" /> إلغاء
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="submit"
                        disabled={!canManage || saving || (isEntityManager && !managerHasEntity)}
                        className="gap-2 h-11 rounded-full font-semibold"
                        style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
                      >
                        {saving ? "جارٍ الحفظ..." : "إضافة"}
                      </Button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="h-11 px-5 rounded-full"
                        style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}
                      >
                        مسح الحقول
                      </button>
                    </>
                  )}
                </div>
              </form>
            </CardContent>
          </SurfaceCard>
        )}

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>قائمة الفعاليات</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>
              فلترة حسب الكيان/الحالة أو البحث بالعنوان/التاريخ
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label={isYouth ? "كياناتي" : "فلتر الكيان"}>
                <Select
                  value={filterEntity}
                  onValueChange={setFilterEntity}
                  disabled={isEntityManager && managerHasEntity}
                >
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}>
                    <SelectValue placeholder={isYouth ? "جميع كياناتي" : "جميع الكيانات"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{isYouth ? "جميع كياناتي" : "جميع الكيانات"}</SelectItem>
                    {(isYouth ? myEntities : safeEntities).map(e => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="فلتر الحالة">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}>
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>كل الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="approved">معتمدة</SelectItem>
                    <SelectItem value="cancelled">ملغاة</SelectItem>
                    <SelectItem value="done">منتهية</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-1">
                <Label className="text-sm">بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                  <Input
                    placeholder="ابحث بالعنوان/التاريخ..."
                    className="pr-9 h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", borderColor: "#E3E3E3" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>جارٍ التحميل...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>لا توجد فعاليات</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map(ev => {
                  const ent = safeEntities.find(e => String(e.id) === String(ev.entityId));
                  const canEditRow =
                    canManage &&
                    (session!.role === "systemAdmin" ||
                     (session!.role === "entityManager" && String(session!.entityId || "") === String(ev.entityId || "")));
                  const isEditingRow = editingId === ev.id;

                  return (
                    <li key={ev.id} className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
                          <Calendar className="h-5 w-5" color="#1D1D1D" />
                        </div>

                        <div className="flex-1 space-y-2">
                          {isEditingRow ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                              <Input
                                value={(editDraft?.title as string) || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), title: e.target.value }))}
                                className="h-10 rounded-xl md:col-span-2"
                                style={{ backgroundColor: "#FFFFFF", borderColor: "#E3E3E3" }}
                                placeholder="العنوان"
                              />
                              <Input
                                type="date"
                                value={(editDraft?.date as string) || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), date: e.target.value }))}
                                className="h-10 rounded-xl"
                                style={{ backgroundColor: "#FFFFFF", borderColor: "#E3E3E3" }}
                              />
                              <Select
                                value={String(editDraft?.status || "draft")}
                                onValueChange={(v) => setEditDraft(p => ({ ...(p as any), status: v as EventItem["status"] }))}
                              >
                                <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}>
                                  <SelectValue placeholder="الحالة" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">مسودة</SelectItem>
                                  <SelectItem value="approved">معتمدة</SelectItem>
                                  <SelectItem value="cancelled">ملغاة</SelectItem>
                                  <SelectItem value="done">منتهية</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select
                                value={String(
                                  editDraft?.entityId
                                  ?? ev.entityId
                                  ?? (managerHasEntity ? session!.entityId : (safeEntities[0]?.id ?? NO_ENTITY))
                                )}
                                onValueChange={(v) => setEditDraft(p => ({ ...(p as any), entityId: v }))}
                                disabled={isEntityManager && managerHasEntity}
                              >
                                <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3" }}>
                                  <SelectValue placeholder="الكيان" />
                                </SelectTrigger>
                                <SelectContent>
                                  {isEntityManager ? (
                                    managerHasEntity ? (
                                      <SelectItem value={String(session!.entityId)}>
                                        {safeEntities.find(e => String(e.id) === String(session!.entityId))?.name || "كياني"}
                                      </SelectItem>
                                    ) : (
                                      <SelectItem value={NO_ENTITY} disabled>لا يوجد كيان</SelectItem>
                                    )
                                  ) : (
                                    safeEntities.map(e => (
                                      <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold">{ev.title}</div>
                              <div className="text-xs" style={{ color: "#6B6B6B" }}>{ev.date || "—"} • {renderStatus(ev.status)}</div>
                              <div className="text-xs flex items-center gap-1" style={{ color: "#6B6B6B" }}>
                                <Building2 className="h-3 w-3" color="#6B6B6B" />
                                <span>{ent?.name || "بدون كيان"}</span>
                              </div>
                            </>
                          )}
                        </div>

                        {canEditRow && (
                          <div className="flex flex-col gap-2 items-end">
                            {isEditingRow ? (
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
                                <Button onClick={() => removeEvent(ev.id)} className="h-9 w-9 p-0 rounded-full" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button onClick={() => startEdit(ev)} variant="secondary" className="h-9 w-9 p-0 rounded-full" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
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

function renderStatus(s: EventItem["status"]) {
  switch (s) {
    case "draft": return "مسودة";
    case "approved": return "معتمدة";
    case "cancelled": return "ملغاة";
    case "done": return "منتهية";
    default: return s;
  }
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Calendar className="h-5 w-5" color="#1D1D1D" />
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
              { href: "/events", label: "الفعاليات" },
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
