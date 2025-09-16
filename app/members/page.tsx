"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Users, UserPlus, Building2, Search, Trash2, Pencil, Mail, Phone, MapPin, IdCard, Shield
} from "lucide-react";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null };

type Member = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  entityId?: string | null;
  nationalId: string | null;
  joinedAt: string;
  city?: string | null;
  avatar?: string | null;
};

type Manager = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  entityId?: string | null;
  role: "entityManager" | "unionSupervisor";
  joinedAt: string;
  city?: string | null;
  avatar?: string | null;
};

type EntityLite = { id: string; name: string };

const PALETTE = { bg: "#EFE6DE", card: "#FFFFFF", border: "#E7E2DC", txt: "#1D1D1D", muted: "#6B6B6B", red: "#EC1A24" };

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = {};
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

type ViewTab = "members" | "managers" | "unionSupervisors";

export default function MembersPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [supers, setSupers] = useState<Manager[]>([]);

  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Member> | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [showMemberDetails, setShowMemberDetails] = useState<Member | null>(null);
  const [showManagerDetails, setShowManagerDetails] = useState<Manager | null>(null);

  const canManage = (r?: UserRole | null) => !!r && (r === "unionSupervisor" || r === "entityManager");
  const isSupervisor = (r?: UserRole | null) => r === "unionSupervisor";
  const isEntityManager = (r?: UserRole | null) => r === "entityManager";

  const [view, setView] = useState<ViewTab>("members");

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" });
      if (!res.ok) throw new Error("GET /api/entities failed");
      return (await res.json()) as any[];
    },
    getMembers: async (entityScope?: string) => {
      const q = entityScope ? `?entityId=${encodeURIComponent(entityScope)}` : "";
      const res = await fetch(`/api/members${q}`, {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      if (!res.ok) throw new Error("GET /api/members failed");
      return (await res.json()) as Member[];
    },
    getEntityManagers: async (entityScope?: string) => {
      const q = entityScope ? `?entityId=${encodeURIComponent(entityScope)}` : "";
      const res = await fetch(`/api/entity-managers${q}`, {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      if (!res.ok) throw new Error("GET /api/entity-managers failed");
      return (await res.json()) as Manager[];
    },
    getUnionSupervisors: async () => {
      const res = await fetch(`/api/union-supervisors`, {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      if (!res.ok) throw new Error("GET /api/union-supervisors failed");
      return (await res.json()) as Manager[];
    },
    createMember: async (payload: any) => {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      return JSON.parse(text);
    },
    updateMember: async (id: string, payload: any) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      return JSON.parse(text);
    },
    deleteMember: async (id: string) => {
      const res = await fetch(`/api/members/${id}`, {
        method: "DELETE",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      return JSON.parse(text);
    },
  };

  // load session
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) {
        router.push("/");
        return;
      }
      const parsed: Session = JSON.parse(s);
      setSession(parsed);
    } catch {
      router.push("/");
    }
  }, [router]);

  // load entities + initial data based on role/view
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!session) return;
      setLoading(true);
      setErrMsg("");
      setOkMsg("");
      try {
        const ents = await api.getEntities().catch(() => []);
        const entsLite = (ents || []).map((e: any) => ({ id: String(e.id), name: String(e.name) })) as EntityLite[];
        if (!mounted) return;
        setEntities(entsLite);

        // Default filter label (للسوبر فقط مؤثر)
        if (session.role !== "unionSupervisor") {
          setFilterEntity(session.entityId ? String(session.entityId) : "all");
        }

        await reloadForView(view, session, entsLite);
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message || "تعذر تحميل البيانات");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.role, session?.entityId]);

  // reload when switching tab or changing filter (for supervisors)
  useEffect(() => {
    if (!session) return;
    setLoading(true);
    reloadForView(view, session, entities)
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filterEntity]);

  const reloadForView = async (v: ViewTab, s: Session, _ents: EntityLite[]) => {
    if (v === "members") {
      const scope =
        s.role === "unionSupervisor"
          ? filterEntity !== "all"
            ? String(filterEntity)
            : undefined
          : s.entityId
          ? String(s.entityId)
          : undefined; // للمستخدم/مدير: API هتستنتج لو مش موجود
      const data = await api.getMembers(scope);
      setMembers(Array.isArray(data) ? data : []);
    } else if (v === "managers") {
      const scope =
        s.role === "unionSupervisor"
          ? filterEntity !== "all"
            ? String(filterEntity)
            : undefined
          : s.entityId
          ? String(s.entityId)
          : undefined;
      const data = await api.getEntityManagers(scope);
      setManagers(Array.isArray(data) ? data : []);
    } else if (v === "unionSupervisors") {
      const data = await api.getUnionSupervisors();
      setSupers(Array.isArray(data) ? data : []);
    }
  };

  // force members tab label to "أعضاء كياني" for non-supervisors
  const tabs = useMemo(() => {
    if (!session) return [] as { key: ViewTab; label: string }[];
    if (isSupervisor(session.role)) {
      return [
        { key: "members" as ViewTab, label: "الأعضاء" },
        { key: "managers" as ViewTab, label: "مديرو الكيانات" },
        { key: "unionSupervisors" as ViewTab, label: "مسؤولو الاتحاد" },
      ];
    }
    if (isEntityManager(session.role)) {
      return [
        { key: "members" as ViewTab, label: "أعضاء كياني" },
        { key: "managers" as ViewTab, label: "مديرو كياني" },
      ];
    }
    return [{ key: "members" as ViewTab, label: "أعضاء كياني" }];
  }, [session]);

  // auto-correct default tab for non-supervisors
  useEffect(() => {
    if (!session) return;
    if (!isSupervisor(session.role) && view === "unionSupervisors") {
      setView("members");
    }
  }, [session, view]);

  /* ===================== المهم: فلترة العرض =====================
     - لمسؤول الاتحاد: يقدر يفلتر بالكيان واسم/بريد/هاتف.
     - لمدير الكيان/المستخدم: لا نفلتر بالكيان (الـ API رجّعت النتائج مسكوّبة أصلاً).
  ================================================================ */

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members || [])
      .filter((m) => {
        if (!session) return false;
        if (isSupervisor(session.role)) {
          return filterEntity === "all" ? true : String(m.entityId || "") === String(filterEntity);
        }
        // مستخدم/مدير → لا تفلتر بالكيان هنا
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        const hay = [m.name, m.email, m.phone, m.city].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [members, filterEntity, search, session?.role]);

  const filteredManagers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (managers || [])
      .filter((m) => {
        if (!session) return false;
        if (isSupervisor(session.role)) {
          return filterEntity === "all" ? true : String(m.entityId || "") === String(filterEntity);
        }
        // مستخدم/مدير → النتائج أصلاً سكوب
        return true;
      })
      .filter((m) => {
        if (!q) return true;
        const hay = [m.name, m.email, m.phone, m.city].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(q);
      });
  }, [managers, filterEntity, search, session?.role]);

  const filteredSupers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (supers || []).filter((m) => {
      if (!q) return true;
      const hay = [m.name, m.email, m.phone, m.city].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [supers, search]);

  if (!session) return null;

  const refreshCurrent = async () => {
    await reloadForView(view, session, entities);
  };

  const startEdit = (m: Member) => {
    if (!canManage(session?.role)) return;
    // only can edit within same entity unless supervisor
    if (!isSupervisor(session.role) && String(session.entityId || "") !== String(m.entityId || "")) return;
    setEditingId(m.id);
    setEditDraft({
      name: m.name || "",
      email: m.email || "",
      phone: m.phone || "",
      nationalId: m.nationalId || "",
      entityId: m.entityId ? String(m.entityId) : "",
      city: m.city || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
    setErrMsg("");
    setOkMsg("");
  };

  const confirmEdit = async () => {
    if (!canManage(session?.role)) return;
    if (!editingId || !editDraft) return;
    if (!editDraft.entityId) {
      setErrMsg("اختر الكيان");
      return;
    }
    if (editDraft.nationalId && !/^\d{14}$/.test(String(editDraft.nationalId))) {
      setErrMsg("الرقم القومي يجب أن يكون 14 رقمًا");
      return;
    }
    if (session.role === "entityManager" && String(editDraft.entityId) !== String(session.entityId || "")) {
      setErrMsg("غير مصرح: لا يمكنك التعديل خارج كيانك");
      return;
    }
    try {
      await api.updateMember(editingId, {
        name: (editDraft.name || "").toString(),
        email: (editDraft.email || "") || null,
        phone: (editDraft.phone || "") || null,
        nationalId: (editDraft.nationalId || "") || null,
        entityId: String(editDraft.entityId),
        city: (editDraft.city || "") || null,
      });
      await refreshCurrent();
      cancelEdit();
      setOkMsg("تم حفظ التعديلات.");
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e?.message || "{}");
        setErrMsg(parsed?.error || "لم يتم التعديل");
      } catch {
        setErrMsg("لم يتم التعديل");
      }
    }
  };

  const removeMember = async (id: string, entityId?: string | null) => {
    if (!canManage(session?.role)) return;
    if (!isSupervisor(session.role) && String(session.entityId || "") !== String(entityId || "")) return;
    if (!confirm("تأكيد حذف هذا العضو؟")) return;
    try {
      await api.deleteMember(id);
      await refreshCurrent();
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e?.message || "{}");
        setErrMsg(parsed?.error || "لم يتم الحذف");
      } catch {
        setErrMsg("لم يتم الحذف");
      }
    }
  };

  const isViewerOnly = session.role === "user";

  // UI
  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: PALETTE.bg }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
          style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color={PALETTE.txt} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: PALETTE.txt }}>
                {view === "members" && (isSupervisor(session.role) ? "الأعضاء" : "أعضاء كياني")}
                {view === "managers" && (isSupervisor(session.role) ? "مديرو الكيانات" : "مديرو كياني")}
                {view === "unionSupervisors" && "مسؤولو الاتحاد"}
              </h1>
              <p className="text-sm" style={{ color: PALETTE.muted }}>
                {view === "members"
                  ? canManage(session.role)
                    ? "تسجيل وإدارة الأعضاء"
                    : "قائمة أعضاء كيانك (عرض فقط)"
                  : view === "managers"
                  ? isSupervisor(session.role)
                    ? "عرض مديرو الكيانات"
                    : "عرض مديرو كياني"
                  : "عرض مسؤولي الاتحاد"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className="h-9 px-3 rounded-full flex items-center"
              style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: PALETTE.txt }}
            >
              {view === "members" ? filteredMembers.length : view === "managers" ? filteredManagers.length : filteredSupers.length} عنصر
            </div>
            {view === "members" && canManage(session?.role) && (
              <Button
                onClick={() => setShowCreate(true)}
                className="h-9 rounded-full gap-2"
                style={{ backgroundColor: PALETTE.red, color: "#fff" }}
              >
                <UserPlus className="h-4 w-4" /> تسجيل عضو
              </Button>
            )}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: PALETTE.txt }}>
        {(errMsg || okMsg) && (
          <div className="mx-3 sm:mx-[1cm]">
            {errMsg && (
              <div className="rounded-2xl p-3 mb-2" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: PALETTE.muted }}>
                {errMsg}
              </div>
            )}
            {okMsg && (
              <div className="rounded-2xl p-3" style={{ backgroundColor: "#E8FFF1", border: "1px solid #C6F2D9", color: "#2D6A4F" }}>
                {okMsg}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>
              {view === "members" && "قائمة الأعضاء"}
              {view === "managers" && (isSupervisor(session.role) ? "مديرو الكيانات" : "مديرو كياني")}
              {view === "unionSupervisors" && "مسؤولو الاتحاد"}
            </CardTitle>
            <CardDescription style={{ color: PALETTE.muted }}>
              {view === "members" && (
                <>
                  فلترة حسب الكيان أو البحث بالاسم/البريد/الهاتف
                  {isViewerOnly && " (الرقم القومي غير ظاهر لأغراض الخصوصية)"}
                </>
              )}
              {view === "managers" && <>ابحث بالاسم/البريد/الهاتف</>}
              {view === "unionSupervisors" && <>ابحث بالاسم/البريد/الهاتف</>}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            {/* Tabs header buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {tabs.map((t) => (
                <Button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className="rounded-full px-4 h-9"
                  style={{
                    backgroundColor: view === t.key ? PALETTE.red : "#FFFFFF",
                    color: view === t.key ? "#FFFFFF" : PALETTE.txt,
                    border: view === t.key ? "none" : "1px solid #E3E3E3",
                  }}
                >
                  {t.label}
                </Button>
              ))}
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label={isSupervisor(session.role) ? "فلتر الكيان" : "الكيان"}>
                <Select
                  value={
                    isSupervisor(session.role) ? filterEntity : session?.entityId ? String(session.entityId) : "all"
                  }
                  onValueChange={setFilterEntity}
                  disabled={!isSupervisor(session.role)}
                >
                  <SelectTrigger
                    className="h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}
                  >
                    <SelectValue placeholder="جميع الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSupervisor(session.role) ? (
                      <>
                        <SelectItem value="all">جميع الكيانات</SelectItem>
                        {entities.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      session?.entityId && (
                        <SelectItem value={String(session.entityId)}>
                          {entities.find((e) => String(e.id) === String(session.entityId))?.name || "كياني"}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <label className="text-sm" style={{ color: PALETTE.txt }}>
                  بحث
                </label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                  <Input
                    placeholder="ابحث بالاسم/البريد/الهاتف..."
                    className="pr-9 h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Lists */}
            {loading ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>
                جارٍ التحميل...
              </div>
            ) : view === "members" ? (
              filteredMembers.length === 0 ? (
                <div className="text-center py-10" style={{ color: "#7A7A7A" }}>
                  لا يوجد أعضاء لعرضهم
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredMembers.map((m) => {
                    const ent = entities.find((e) => String(e.id) === String(m.entityId));
                    const canEditRow =
                      canManage(session?.role) &&
                      (isSupervisor(session.role) || String(session?.entityId || "") === String(m.entityId || ""));
                    const maskedNID =
                      isSupervisor(session.role) || isEntityManager(session.role) ? m.nationalId || "—" : "—";
                    return (
                      <li
                        key={m.id}
                        className="rounded-2xl p-4"
                        style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="h-10 w-10 rounded-xl grid place-items-center shrink-0"
                            style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}
                          >
                            <Users className="h-5 w-5" color={PALETTE.txt} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <button className="font-semibold text-right hover:underline" style={{ color: PALETTE.txt }} onClick={() => setShowMemberDetails(m)}>
                              {m.name}
                            </button>
                            <div className="text-xs" style={{ color: PALETTE.muted }}>
                              {m.email || "—"} • {m.phone || "—"}
                            </div>
                            <div className="text-xs flex items-center gap-1" style={{ color: PALETTE.muted }}>
                              <Building2 className="h-3 w-3" color={PALETTE.muted} />
                              <span>{ent?.name || "بدون كيان"}</span>
                            </div>
                            <div className="text-xs" style={{ color: PALETTE.txt }}>
                              الرقم القومي: {maskedNID}
                            </div>
                          </div>

                          {canEditRow && (
                            <div className="flex gap-2 items-start">
                              <Button
                                onClick={() => removeMember(m.id, m.entityId)}
                                className="h-9 w-9 p-0 rounded-full"
                                style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => startEdit(m)}
                                variant="secondary"
                                className="h-9 w-9 p-0 rounded-full"
                                style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : view === "managers" ? (
              filteredManagers.length === 0 ? (
                <div className="text-center py-10" style={{ color: "#7A7A7A" }}>
                  لا يوجد مديرون لعرضهم
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredManagers.map((m) => {
                    const ent = entities.find((e) => String(e.id) === String(m.entityId));
                    return (
                      <li
                        key={m.id}
                        className="rounded-2xl p-4"
                        style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
                            <Shield className="h-5 w-5" color={PALETTE.txt} />
                          </div>
                          <div className="flex-1 space-y-1">
                            <button className="font-semibold text-right hover:underline" style={{ color: PALETTE.txt }} onClick={() => setShowManagerDetails(m)}>
                              {m.name}
                            </button>
                            <div className="text-xs" style={{ color: PALETTE.muted }}>
                              {m.email || "—"} • {m.phone || "—"}
                            </div>
                            <div className="text-xs flex items-center gap-1" style={{ color: PALETTE.muted }}>
                              <Building2 className="h-3 w-3" color={PALETTE.muted} />
                              <span>{ent?.name || "بدون كيان"}</span>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : filteredSupers.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>
                لا يوجد مسؤولو اتحاد لعرضهم
              </div>
            ) : (
              <ul className="space-y-3">
                {filteredSupers.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
                        <Shield className="h-5 w-5" color={PALETTE.txt} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <button className="font-semibold text-right hover:underline" style={{ color: PALETTE.txt }} onClick={() => setShowManagerDetails(m)}>
                          {m.name}
                        </button>
                        <div className="text-xs" style={{ color: PALETTE.muted }}>
                          {m.email || "—"} • {m.phone || "—"}
                        </div>
                        <div className="text-xs" style={{ color: PALETTE.muted }}>
                          دور المستخدم: مسؤول اتحاد
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </SurfaceCard>
      </main>

      {/* Modals */}
      {showCreate && session && (
        <RegisterMemberModal
          onClose={() => setShowCreate(false)}
          onSuccess={async () => {
            setShowCreate(false);
            await refreshCurrent();
            setOkMsg("تم تسجيل العضو بنجاح.");
          }}
          session={session}
          entities={entities}
          apiCreate={(payload) => api.createMember(payload)}
        />
      )}

      {editingId && editDraft && canManage(session?.role) && (
        <EditMemberModal
          draft={editDraft}
          entities={entities}
          onChange={setEditDraft}
          onClose={cancelEdit}
          onSave={confirmEdit}
          disableEntity={session.role === "entityManager"}
        />
      )}

      {showMemberDetails && (
        <MemberDetailsModal
          item={showMemberDetails}
          entityName={entities.find((e) => String(e.id) === String(showMemberDetails.entityId))?.name || "—"}
          onClose={() => setShowMemberDetails(null)}
          canSeeNID={isSupervisor(session.role) || isEntityManager(session.role)}
        />
      )}

      {showManagerDetails && (
        <ManagerDetailsModal
          item={showManagerDetails}
          entityName={
            showManagerDetails.role === "unionSupervisor"
              ? "—"
              : entities.find((e) => String(e.id) === String(showManagerDetails.entityId))?.name || "—"
          }
          onClose={() => setShowManagerDetails(null)}
        />
      )}
    </div>
  );
}

/* ---------------------------- Shared UI pieces ---------------------------- */

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color={PALETTE.txt} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: PALETTE.txt }}>
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
                style={{ color: active(l.href) ? "#FFFFFF" : PALETTE.txt, backgroundColor: active(l.href) ? PALETTE.red : "transparent" }}
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
      <span className="text-sm" style={{ color: PALETTE.txt }}>{label}</span>
      {children}
    </label>
  );
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
    >
      {children}
    </div>
  );
}



function RegisterMemberModal({
  onClose,
  onSuccess,
  session,
  entities,
  apiCreate,
}: {
  onClose: () => void;
  onSuccess: () => void;
  session: Session;
  entities: EntityLite[];
  apiCreate: (payload: any) => Promise<any>;
}) {
  const [form, setForm] = useState({
    entityId: "",
    name: "",
    email: "",
    phone: "",
    nationalId: "",
    password: "",
    city: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const def =
      session.role === "entityManager" ? String(session.entityId || "") : entities[0]?.id ? String(entities[0].id) : "";
    setForm((p) => ({ ...p, entityId: def }));
  }, [session.role, session.entityId, entities]);

  const nationalIdValid = /^\d{14}$/.test(form.nationalId);
  const passwordProvided = !!form.password;
  const passwordValid = !passwordProvided || /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.entityId) return setErr("اختر الكيان");
    if (!form.name.trim()) return setErr("اسم العضو مطلوب");
    if (!nationalIdValid) return setErr("الرقم القومي يجب أن يكون 14 رقمًا");
    if (!passwordValid) return setErr("كلمة المرور (إن وُجدت) يجب أن لا تقل عن 8 أحرف وتحتوي على أرقام وحروف");
    if (session.role === "entityManager" && String(form.entityId) !== String(session.entityId || "")) {
      return setErr("غير مصرح: لا يمكنك الإضافة خارج كيانك");
    }
    setSaving(true);
    try {
      await apiCreate({
        entityId: String(form.entityId),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        nationalId: form.nationalId,
        ...(passwordProvided ? { password: form.password } : {}),
      });
      onSuccess();
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e?.message || "{}");
        setErr(parsed?.error || "فشل الإضافة");
      } catch {
        setErr("فشل الإضافة");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[560px] rounded-2xl bg-white border shadow-xl overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold">تسجيل عضو جديد</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          <form onSubmit={onSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="الاسم الكامل">
              <Input className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="البريد الإلكتروني">
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </Field>
            <Field label="الهاتف">
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </Field>
            <Field label="المدينة">
              <div className="relative">
                <MapPin className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
            </Field>
            <Field label="الرقم القومي (14 رقم)">
              <div className="relative">
                <IdCard className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input inputMode="numeric" maxLength={14} pattern="\d{14}" className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.nationalId} onChange={(e) => setForm((p) => ({ ...p, nationalId: e.target.value.replace(/\D+/g, "").slice(0, 14) }))} />
              </div>
            </Field>
            <Field label="كلمة المرور (اختياري)">
              <Input type="password" className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              <p className="text-[11px]" style={{ color: "#777" }}>يمكنك تركها فارغة — سيتم إنشاء كلمة مرور مؤقتة.</p>
            </Field>
            <Field label="الكيان">
              <Select value={form.entityId} onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))} disabled={session.role === "entityManager"}>
                <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                  <SelectValue placeholder={session.role === "entityManager" ? "كيانك" : "اختر الكيان"} />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {err && <div className="md:col-span-2 rounded-xl p-2 text-sm" style={{ background: "#FFF1F1", border: "1px solid #F2CACA", color: "#B00020" }}>{err}</div>}
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <Button type="submit" disabled={saving} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>{saving ? "جارٍ الحفظ..." : "تسجيل العضو"}</Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>إلغاء</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function EditMemberModal({
  draft,
  entities,
  onChange,
  onClose,
  onSave,
  disableEntity,
}: {
  draft: Partial<Member>;
  entities: EntityLite[];
  onChange: (d: Partial<Member>) => void;
  onClose: () => void;
  onSave: () => void;
  disableEntity?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[560px] rounded-2xl bg-white border shadow-xl overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold">تعديل بيانات العضو</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="الاسم الكامل">
              <Input className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={draft.name || ""} onChange={(e) => onChange({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="البريد الإلكتروني">
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={draft.email || ""} onChange={(e) => onChange({ ...draft, email: e.target.value })} />
              </div>
            </Field>
            <Field label="الهاتف">
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={draft.phone || ""} onChange={(e) => onChange({ ...draft, phone: e.target.value })} />
              </div>
            </Field>
            <Field label="المدينة">
              <div className="relative">
                <MapPin className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={draft.city || ""} onChange={(e) => onChange({ ...draft, city: e.target.value })} />
              </div>
            </Field>
            <Field label="الرقم القومي">
              <div className="relative">
                <IdCard className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                <Input inputMode="numeric" maxLength={14} pattern="\d{14}" className="pr-8 h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={draft.nationalId || ""} onChange={(e) => onChange({ ...draft, nationalId: e.target.value.replace(/\D+/g, "").slice(0, 14) })} />
              </div>
            </Field>
            <Field label="الكيان">
              <Select value={String(draft.entityId || "")} onValueChange={(v) => onChange({ ...draft, entityId: v })} disabled={!!disableEntity}>
                <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                  <SelectValue placeholder="اختر الكيان" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <Button onClick={onSave} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>حفظ</Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>إلغاء</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberDetailsModal({
  item, entityName, onClose, canSeeNID,
}: { item: Member; entityName: string; onClose: () => void; canSeeNID: boolean }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[620px] rounded-2xl bg-white border shadow-xl overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold">بيانات العضو</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-[#F6F6F6] border" style={{ borderColor: "#EEE" }}>
                {item.avatar ? <img src={item.avatar} alt="avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center"><Users className="h-6 w-6" /></div>}
              </div>
              <div>
                <div className="font-semibold text-lg">{item.name}</div>
                <div className="text-xs" style={{ color: "#666" }}>الكيان: {entityName}</div>
                <div className="text-xs" style={{ color: "#666" }}>تاريخ الانضمام: {new Date(item.joinedAt).toLocaleString("ar-EG")}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {item.email || "—"}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {item.phone || "—"}</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.city || "—"}</div>
              <div className="flex items-center gap-2"><IdCard className="h-4 w-4" /> الرقم القومي: {canSeeNID ? item.nationalId || "—" : "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Manager Details Modal --------------------------- */

function ManagerDetailsModal({
  item, entityName, onClose,
}: { item: Manager; entityName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[620px] rounded-2xl bg-white border shadow-xl overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b bg-white" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold">{item.role === "unionSupervisor" ? "بيانات مسؤول الاتحاد" : "بيانات مدير الكيان"}</div>
            <button onClick={onClose} className="h-8 px-3 rounded-full border text-sm">إغلاق</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-xl overflow-hidden bg-[#F6F6F6] border" style={{ borderColor: "#EEE" }}>
                {item.avatar ? <img src={item.avatar} alt="avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center"><Shield className="h-6 w-6" /></div>}
              </div>
              <div>
                <div className="font-semibold text-lg">{item.name}</div>
                <div className="text-xs" style={{ color: "#666" }}>
                  {item.role === "unionSupervisor" ? "دور: مسؤول اتحاد" : <>الكيان: {entityName}</>}
                </div>
                <div className="text-xs" style={{ color: "#666" }}>تاريخ الانضمام: {new Date(item.joinedAt).toLocaleString("ar-EG")}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {item.email || "—"}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {item.phone || "—"}</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {item.city || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
