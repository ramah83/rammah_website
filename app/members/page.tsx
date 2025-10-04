"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Building2, Search, Trash2, Pencil, Mail, Phone, MapPin, IdCard, Shield, UserCog, Upload } from "lucide-react";

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
  nationalId?: string | null; // ← جديد
};

type EntityLite = { id: string; name: string };

const PALETTE = {
  bg: "var(--brand-bg)",
  card: "var(--brand-card)",
  border: "var(--brand-border)",
  txt: "var(--brand-text)",
  muted: "var(--brand-muted)",
  red: "var(--brand-accent)",
};
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
  const [showCreateManager, setShowCreateManager] = useState(false);
  const [showMemberDetails, setShowMemberDetails] = useState<Member | null>(null);
  const [showManagerDetails, setShowManagerDetails] = useState<Manager | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showBulkManagers, setShowBulkManagers] = useState(false);
  const [bulkReport, setBulkReport] = useState<{ results: any[]; rows: any[] } | null>(null);
  const [showBulkReport, setShowBulkReport] = useState(false);

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
    createEntityManager: async (payload: any) => {
      const res = await fetch("/api/entity-managers", {
        method: "POST",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const t = await res.text();
      if (!res.ok) throw new Error(t);
      return JSON.parse(t);
    },
    bulkCreateEntityManagers: async (rows: any[]) => {
      const res = await fetch("/api/entity-managers/bulk", {
        method: "POST",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify({ rows }),
      });
      const t = await res.text();
      if (!res.ok) throw new Error(t);
      return JSON.parse(t);
    },
  };

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
  }, [session?.role, session?.entityId]);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    reloadForView(view, session, entities)
      .catch(() => {})
      .finally(() => setLoading(false));
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
          : undefined;
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

  useEffect(() => {
    if (!session) return;
    if (!isSupervisor(session.role) && view === "unionSupervisors") {
      setView("members");
    }
  }, [session, view]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (members || [])
      .filter((m) => {
        if (!session) return false;
        if (isSupervisor(session.role)) {
          return filterEntity === "all" ? true : String(m.entityId || "") === String(filterEntity);
        }
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

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col">
      <style jsx global>{`
        :root{
          --brand-bg:#EFE6DE;
          --brand-bg-deep:#E6D8CA;
          --brand-card:rgba(255,255,255,0.72);
          --brand-border:rgba(29,29,29,0.08);
          --brand-text:#1D1D1D;
          --brand-muted:#6F6F6F;
          --brand-accent:#EC1A24;
          --hero-a:rgba(236,26,36,0.45);
          --hero-b:rgba(29,29,29,0.35);
        }
        body{background:var(--brand-bg);}
      `}</style>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(800px 300px at 10% 0%, var(--hero-a) 0%, transparent 60%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-30"
          style={{ background: "radial-gradient(800px 300px at 90% 100%, var(--hero-b) 0%, transparent 60%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, var(--brand-bg) 0%, var(--brand-bg-deep) 100%)" }}
        />
      </div>

      <HeaderBar />

<section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
  <div
    className="rounded-[22px] p-5 md:p-6 flex items-center justify-between backdrop-blur-xl"
    style={{ backgroundColor: PALETTE.card, border: `1px solid ${PALETTE.border}`, boxShadow: "0 20px 60px rgba(2,6,23,0.25)" }}
  >
    <div className="flex items-center gap-3">
      <span
        className="h-12 w-12 rounded-2xl grid place-items-center transition-transform duration-300 hover:scale-105"
        style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Users className="h-6 w-6" color={PALETTE.txt} />
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
              : "قائمة أعضاء كيان كيانك (عرض فقط)"
            : view === "managers"
            ? isSupervisor(session.role)
              ? "عرض وإضافة مديرو الكيانات"
              : "عرض مديرو كياني"
            : "عرض مسؤولي الاتحاد"}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <div
        className="h-9 px-3 rounded-full flex items-center backdrop-blur-sm text-sm"
        style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.06)", color: PALETTE.txt }}
      >
        {view === "members" ? filteredMembers.length : view === "managers" ? filteredManagers.length : filteredSupers.length} عنصر
      </div>
      {view === "members" && canManage(session?.role) && (
        <>
          <Button
            onClick={() => setShowCreate(true)}
            className="h-9 rounded-full gap-2 transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
            style={{ backgroundColor: PALETTE.red, color: "#fff" }}
          >
            <UserPlus className="h-4 w-4" /> تسجيل عضو
          </Button>
          <Button
            onClick={() => setShowBulk(true)}
            variant="secondary"
            className="h-9 rounded-full gap-2 transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.9)", border: "1px solid #E3E3E3", color: PALETTE.txt }}
          >
            استيراد من ملف
          </Button>
        </>
      )}
      {view === "managers" && isSupervisor(session.role) && (
        <>
          <Button
            onClick={() => setShowCreateManager(true)}
            className="h-9 rounded-full gap-2 transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
            style={{ backgroundColor: PALETTE.red, color: "#fff" }}
          >
            <UserCog className="h-4 w-4" /> إضافة مدير
          </Button>
          <Button
            onClick={() => setShowBulkManagers(true)}
            variant="secondary"
            className="h-9 rounded-full gap-2 transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
            style={{ backgroundColor: "rgba(255,255,255,0.9)", border: "1px solid #E3E3E3", color: PALETTE.txt }}
          >
            <Upload className="h-4 w-4" /> استيراد مديرين
          </Button>
        </>
      )}
    </div>
  </div>
</section>

<main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
  {(errMsg || okMsg) && (
    <div className="mx-3 sm:mx-[1cm]">
      {errMsg && (
        <div
          className="rounded-2xl p-3 mb-2 backdrop-blur-xl"
          style={{ backgroundColor: "rgba(255,248,232,0.9)", border: "1px solid #F2E7C6", color: PALETTE.muted }}
        >
          {errMsg}
        </div>
      )}
      {okMsg && (
        <div
          className="rounded-2xl p-3 flex items-center justify-between backdrop-blur-xl"
          style={{ backgroundColor: "rgba(232,255,241,0.9)", border: "1px solid #C6F2D9", color: "#2D6A4F" }}
        >
          <span>{okMsg}</span>
          {bulkReport && (
            <Button
              onClick={() => setShowBulkReport(true)}
              variant="secondary"
              className="h-9 rounded-full transition-all duration-300 hover:translate-y-[-1px]"
              style={{ background: "#fff", border: "1px solid #9AE6B4", color: "#2D6A4F" }}
            >
              عرض تقرير الأخطاء
            </Button>
          )}
        </div>
      )}
    </div>
  )}

  <SurfaceCard className="mx-3 sm:mx-[1cm]">
    <CardHeader className="pb-0 px-5 pt-5">
      <CardTitle style={{ color: PALETTE.txt }}>
        {view === "members" && "قائمة الأعضاء"}
        {view === "managers" && (isSupervisor(session.role) ? "مديرو الكيانات" : "مديرو كياني")}
        {view === "unionSupervisors" && "مسؤولو الاتحاد"}
      </CardTitle>
      <CardDescription style={{ color: PALETTE.muted }}>
        {view === "members" && <>فلترة حسب الكيان أو البحث بالاسم/البريد/الهاتف{isViewerOnly && " (الرقم القومي غير ظاهر لأغراض الخصوصية)"} </>}
        {view === "managers" && <>ابحث بالاسم/البريد/الهاتف</>}
        {view === "unionSupervisors" && <>ابحث بالاسم/البريد/الهاتف</>}
      </CardDescription>
    </CardHeader>

    <CardContent className="px-5 pb-5">
      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <Button
            key={t.key}
            onClick={() => setView(t.key)}
            className="rounded-full px-4 h-9 transition-all duration-300 hover:translate-y-[-1px]"
            style={{
              backgroundColor: view === t.key ? PALETTE.red : "rgba(255,255,255,0.9)",
              color: view === t.key ? "#FFFFFF" : PALETTE.txt,
              border: view === t.key ? "none" : "1px solid #E3E3E3",
            }}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <Field label={isSupervisor(session.role) ? "فلتر الكيان" : "الكيان"}>
          <Select
            value={isSupervisor(session.role) ? filterEntity : session?.entityId ? String(session.entityId) : "all"}
            onValueChange={setFilterEntity}
            disabled={!isSupervisor(session.role)}
          >
            <SelectTrigger
              className="h-11 rounded-xl backdrop-blur-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.9)", border: "1px solid #E3E3E3", color: PALETTE.txt }}
            >
              <SelectValue placeholder="جميع الكيانات" />
            </SelectTrigger>
            <SelectContent className="z-[1200]">
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
              className="pr-9 h-11 rounded-xl backdrop-blur-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.9)", color: PALETTE.txt, borderColor: "#E3E3E3" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

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
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredMembers.map((m) => {
              const ent = entities.find((e) => String(e.id) === String(m.entityId));
              const canEditRow =
                canManage(session?.role) && (isSupervisor(session.role) || String(session?.entityId || "") === String(m.entityId || ""));
              const maskedNID = isSupervisor(session.role) || isEntityManager(session.role) ? m.nationalId || "—" : "—";
              return (
                <li
                  key={`${String(m.id)}::${String(m.entityId || "")}`}
                  className="rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 backdrop-blur-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.9)", border: `1px solid rgba(15,23,42,0.06)` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
                      style={{ backgroundColor: "rgba(246,246,246,0.9)", border: "1px solid #E5E5E5" }}
                    >
                      <Users className="h-5 w-5" color={PALETTE.txt} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <button
                        className="font-semibold text-right hover:underline"
                        style={{ color: PALETTE.txt }}
                        onClick={() => setShowMemberDetails(m)}
                      >
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
                          className="h-9 w-9 p-0 rounded-full transition-all duration-300 hover:scale-105"
                          style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => startEdit(m)}
                          variant="secondary"
                          className="h-9 w-9 p-0 rounded-full transition-all duration-300 hover:scale-105"
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
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredManagers.map((m) => {
              const ent = entities.find((e) => String(e.id) === String(m.entityId));
              const key = `${String(m.id)}::${String(m.entityId || "")}`;
              return (
                <li
                  key={key}
                  className="rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 backdrop-blur-xl"
                  style={{ backgroundColor: "rgba(255,255,255,0.9)", border: `1px solid rgba(15,23,42,0.06)` }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
                      style={{ backgroundColor: "rgba(246,246,246,0.9)", border: "1px solid #E5E5E5" }}
                    >
                      <Shield className="h-5 w-5" color={PALETTE.txt} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <button
                        className="font-semibold text-right hover:underline"
                        style={{ color: PALETTE.txt }}
                        onClick={() => setShowManagerDetails(m)}
                      >
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
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSupers.map((m) => (
            <li
              key={`${String(m.id)}::super`}
              className="rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 backdrop-blur-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.9)", border: `1px solid rgba(15,23,42,0.06)` }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-2xl grid place-items-center shrink-0"
                  style={{ backgroundColor: "rgba(246,246,246,0.9)", border: "1px solid #E5E5E5" }}
                >
                  <Shield className="h-5 w-5" color={PALETTE.txt} />
                </div>
                <div className="flex-1 space-y-1">
                  <button
                    className="font-semibold text-right hover:underline"
                    style={{ color: PALETTE.txt }}
                    onClick={() => setShowManagerDetails(m)}
                  >
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

{showBulk && session && (
  <BulkImportModal
    onClose={() => setShowBulk(false)}
    onDone={(results, rows) => {
      setShowBulk(false);
      setBulkReport({ results, rows });
      setOkMsg("تم الاستيراد. راجع التقرير لمعرفة أي صفوف فشلت.");
      setShowBulkReport(true);
    }}
    session={session}
    entities={entities}
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
    entityName={showManagerDetails.role === "unionSupervisor" ? "—" : entities.find((e) => String(e.id) === String(showManagerDetails.entityId))?.name || "—"}
    onClose={() => setShowManagerDetails(null)}
  />
)}

{bulkReport && showBulkReport && (
  <BulkImportReportModal onClose={() => setShowBulkReport(false)} results={bulkReport.results as any} rows={bulkReport.rows as any} />
)}

{showCreateManager && isSupervisor(session.role) && (
  <CreateManagerModal
    entities={entities}
    onClose={() => setShowCreateManager(false)}
    onSuccess={async () => {
      setShowCreateManager(false);
      await reloadForView("managers", session, entities);
      setOkMsg("تمت إضافة المدير.");
    }}
    apiCreate={(payload) => api.createEntityManager(payload)}
  />
)}

{showBulkManagers && isSupervisor(session.role) && (
  <BulkManagersImportModal
    entities={entities}
    onClose={() => setShowBulkManagers(false)}
    onDone={async () => {
      setShowBulkManagers(false);
      await reloadForView("managers", session, entities);
      setOkMsg("تم الاستيراد. راجع التقرير لمعرفة أي صفوف فشلت.");
      setShowBulkReport(true);
    }}
    apiBulk={(rows) => api.bulkCreateEntityManagers(rows)}
    setBulkReport={(r) => setBulkReport(r)}
  />
)}
    </div>
  );

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-16 w-full rounded-2xl flex items-center justify-between px-4 backdrop-blur-xl" style={{ backgroundColor: "rgba(255,255,255,0.7)", border: `1px solid rgba(15,23,42,0.08)`, boxShadow: "0 20px 60px rgba(2,6,23,0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "rgba(246,246,246,0.9)", border: "1px solid #E5E5E5" }}>
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
              <Link key={l.href} href={l.href} className="px-3 py-1 rounded-lg transition-all duration-300 hover:translate-y-[-1px]" style={{ color: active(l.href) ? "#FFFFFF" : PALETTE.txt, backgroundColor: active(l.href) ? PALETTE.red : "transparent" }}>
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
      <span className="text-sm" style={{ color: PALETTE.txt }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className} backdrop-blur-xl`} style={{ backgroundColor: "rgba(255,255,255,0.72)", border: `1px solid ${PALETTE.border}`, boxShadow: "0 24px 70px rgba(2,6,23,0.25)" }}>
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
    const def = session.role === "entityManager" ? String(session.entityId || "") : entities[0]?.id ? String(entities[0].id) : "";
    setForm((p) => ({ ...p, entityId: def }));
  }, [session.role, session.entityId, entities]);

  const nationalIdValid = /^\d{14}$/.test(form.nationalId);
  const passwordValid = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const effectiveEntityId = session.role === "entityManager" ? String(session.entityId || "") : String(form.entityId || "");
    if (!effectiveEntityId) return setErr("اختر الكيان");
    if (!form.name.trim()) return setErr("اسم العضو مطلوب");
    if (!nationalIdValid) return setErr("الرقم القومي يجب أن يكون 14 رقمًا");
    if (!form.password) return setErr("كلمة المرور مطلوبة");
    if (!passwordValid) return setErr("كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام");
    if (session.role === "entityManager" && String(effectiveEntityId) !== String(session.entityId || "")) {
      return setErr("غير مصرح: لا يمكنك الإضافة خارج كيانك");
    }
    setSaving(true);
    try {
      await apiCreate({
        entityId: effectiveEntityId,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        nationalId: form.nationalId,
        password: form.password,
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[600px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden transition-all duration-300" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>تسجيل عضو جديد</div>
            <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
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
            <Field label="كلمة المرور">
              <Input type="password" required className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: PALETTE.txt, borderColor: "#E3E3E3" }} value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} pattern="(?=.*[A-Za-z])(?=.*\d).{8,}" title="على الأقل 8 أحرف وبها حروف وأرقام" />
            </Field>
            <Field label="الكيان">
              <Select value={session.role === "entityManager" ? String(session.entityId || "") : form.entityId} onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))} disabled={session.role === "entityManager"}>
                <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                  <SelectValue placeholder={session.role === "entityManager" ? "كيانك" : "اختر الكيان"} />
                </SelectTrigger>
                <SelectContent className="z-[1200]">
                  {session.role === "entityManager"
                    ? String(session.entityId || "")
                      ? [
                          <SelectItem key={String(session.entityId)} value={String(session.entityId)}>
                            {entities.find((e) => String(e.id) === String(session.entityId))?.name || "كيانك"}
                          </SelectItem>,
                        ]
                      : null
                    : entities.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>
                          {e.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </Field>
            {err && (
              <div className="md:col-span-2 rounded-xl p-2 text-sm" style={{ background: "#FFF1F1", border: "1px solid #F2CACA", color: "#B00020" }}>
                {err}
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <Button type="submit" disabled={saving} className="gap-2 h-11 rounded-full font-semibold transition-all duration-300 hover:translate-y-[-1px]" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                {saving ? "جارٍ الحفظ..." : "تسجيل العضو"}
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                إلغاء
              </Button>
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[600px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden transition-all duration-300" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>تعديل بيانات العضو</div>
            <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
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
                <SelectContent className="z-[1200]">
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <Button onClick={onSave} className="gap-2 h-11 rounded-full font-semibold transition-all duration-300 hover:translate-y-[-1px]" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                حفظ
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MemberDetailsModal({ item, entityName, onClose, canSeeNID }: { item: Member; entityName: string; onClose: () => void; canSeeNID: boolean }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[660px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden transition-all duration-300" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>بيانات العضو</div>
            <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-[#F6F6F6] border" style={{ borderColor: "#EEE" }}>
                {item.avatar ? <img src={item.avatar} alt="avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center"><Users className="h-6 w-6" /></div>}
              </div>
              <div>
                <div className="font-semibold text-lg" style={{ color: PALETTE.txt }}>{item.name}</div>
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

function ManagerDetailsModal({ item, entityName, onClose }: { item: Manager; entityName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[660px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden transition-all duration-300" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>{item.role === "unionSupervisor" ? "بيانات مسؤول الاتحاد" : "بيانات مدير الكيان"}</div>
            <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 rounded-2xl overflow-hidden bg-[#F6F6F6] border" style={{ borderColor: "#EEE" }}>
                {item.avatar ? <img src={item.avatar} alt="avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center"><Shield className="h-6 w-6" /></div>}
              </div>
              <div>
                <div className="font-semibold text-lg" style={{ color: PALETTE.txt }}>{item.name}</div>
                {item.role === "unionSupervisor" ? (
                  <div className="text-xs" style={{ color: "#666" }}>دور: مسؤول اتحاد</div>
                ) : (
                  <div className="text-xs" style={{ color: "#666" }}>الكيان: {entityName}</div>
                )}
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

function BulkImportModal({
  onClose,
  onDone,
  session,
  entities,
}: {
  onClose: () => void;
  onDone: (results: any[], rows: any[]) => void;
  session: Session;
  entities: EntityLite[];
}) {
  const [textReport, setTextReport] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  useEffect(() => {
    if (session.role === "entityManager") {
      setSelectedEntity(String(session.entityId || ""));
    } else {
      setSelectedEntity(entities[0]?.id ? String(entities[0].id) : "");
    }
  }, [session.role, session.entityId, entities]);

  const downloadTemplate = () => {
    const header = "name,email,phone,city,nationalId,password\n";
    const example = "محمد أحمد,m@test.com,01000000000,القاهرة,29800000000000,Passw0rd\n";
    const csv = header + example;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = async (file: File) => {
    setErr("");
    setRows([]);
    setTextReport(null);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErr("الرجاء رفع ملف CSV فقط.");
      return;
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setErr("الملف فارغ.");
      return;
    }
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const colsNeeded = ["name", "email", "phone", "city", "nationalid", "password"];
    const hasAll = colsNeeded.every((c) => header.includes(c));
    if (!hasAll) {
      setErr("العناوين المطلوبة: name,email,phone,city,nationalId,password");
      return;
    }
    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (!parts.length) continue;
      const obj: any = {
        name: parts[idx["name"]]?.trim() || "",
        email: parts[idx["email"]] ? String(parts[idx["email"]]).trim() : "",
        phone: parts[idx["phone"]] ? String(parts[idx["phone"]]).trim() : "",
        city: parts[idx["city"]] ? String(parts[idx["city"]]).trim() : "",
        nationalId: parts[idx["nationalid"]] ? String(parts[idx["nationalid"]]).replace(/\D+/g, "").slice(0, 14) : "",
        password: parts[idx["password"]] ? String(parts[idx["password"]]).trim() : "",
      };
      obj.entityId = session.role === "entityManager" ? String(session.entityId || "") : String(selectedEntity || "");
      data.push(obj);
    }
    setRows(data);
  };

  const sendImport = async () => {
    setErr("");
    setTextReport(null);
    if (rows.length === 0) {
      setErr("لم يتم تحميل أي صفوف بعد.");
      return;
    }
    if (session.role !== "entityManager" && !selectedEntity) {
      setErr("اختر الكيان أولًا.");
      return;
    }
    for (const [i, r] of rows.entries()) {
      if (!r.name?.trim()) return setErr(`صف ${i + 2}: الاسم مطلوب`);
      if (!/^\d{14}$/.test(String(r.nationalId || ""))) return setErr(`صف ${i + 2}: الرقم القومي يجب أن يكون 14 رقمًا`);
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(r.password || ""))) return setErr(`صف ${i + 2}: كلمة المرور يجب أن تكون 8 أحرف على الأقل وبها حروف وأرقام`);
      if (!r.entityId) return setErr(`صف ${i + 2}: لم يتم تحديد الكيان`);
      if (session.role === "entityManager" && String(r.entityId) !== String(session.entityId || "")) {
        return setErr(`صف ${i + 2}: غير مسموح بإضافة عضو خارج كيانك`);
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/members/bulk", {
        method: "POST",
        headers: buildSessionHeaders(false),
        body: JSON.stringify({ rows }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "فشل الاستيراد");
        return;
      }
      const ok = (data?.results || []).filter((r: any) => r.ok).length;
      const fail = (data?.results || []).length - ok;
      const lines = [`إجمالي الصفوف: ${(data?.results || []).length}`, `نجاح: ${ok}`, `فشل: ${fail}`];
      for (const r of data?.results || []) {
        if (!r.ok) lines.push(`صف ${r.index + 2}: ${r.error}`);
      }
      setTextReport(lines.join("\n"));
      onDone(data?.results || [], rows);
    } catch {
      setErr("فشل الاتصال بخادم الاستيراد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[760px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>استيراد أعضاء من CSV</div>
            <div className="flex items-center gap-2">
              <Button onClick={downloadTemplate} variant="secondary" className="h-9 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                تنزيل القالب
              </Button>
              <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {session.role !== "entityManager" && (
              <Field label="اختيار الكيان المراد إضافة الأعضاء فيه">
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                    <SelectValue placeholder="اختر الكيان" />
                  </SelectTrigger>
                  <SelectContent className="z-[1200]">
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}

            <div className="space-y-1">
              <span className="text-sm" style={{ color: PALETTE.txt }}>ملف CSV</span>
              <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && parseCSV(e.target.files[0])} />
              <div className="text-xs" style={{ color: PALETTE.muted }}>
                الأعمدة المطلوبة: <code>name,email,phone,city,nationalId,password</code>
              </div>
              {session.role !== "entityManager" && selectedEntity && (
                <div className="text-xs" style={{ color: PALETTE.muted }}>
                  سيتم إضافة كل الصفوف إلى كيان: {entities.find((x) => String(x.id) === String(selectedEntity))?.name || selectedEntity}
                </div>
              )}
            </div>

            {rows.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: "#F9F9F9", border: "1px solid #EFEFEF" }}>
                <div className="mb-2 text-sm" style={{ color: PALETTE.txt }}>تمت قراءة {rows.length} صفًا. سيتم التحقق قبل الإرسال.</div>
                <div className="max-h-40 overflow-auto text-xs" dir="ltr" style={{ color: "#333" }}>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left pr-2">name</th>
                        <th className="text-left pr-2">email</th>
                        <th className="text-left pr-2">phone</th>
                        <th className="text-left pr-2">city</th>
                        <th className="text-left pr-2">nationalId</th>
                        <th className="text-left pr-2">password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 20).map((r, i) => (
                        <tr key={i}>
                          <td className="pr-2">{r.name}</td>
                          <td className="pr-2">{r.email}</td>
                          <td className="pr-2">{r.phone}</td>
                          <td className="pr-2">{r.city}</td>
                          <td className="pr-2">{r.nationalId}</td>
                          <td className="pr-2">{r.password}</td>
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
              <Button onClick={sendImport} disabled={saving || rows.length === 0} className="h-11 rounded-full font-semibold transition-all duration-300 hover:translate-y-[-1px]" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                {saving ? "جارٍ الاستيراد…" : "بدء الاستيراد"}
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkImportReportModal({
  onClose,
  results,
  rows,
}: {
  onClose: () => void;
  results: { index: number; ok: boolean; error?: string; id?: string }[];
  rows: any[];
}) {
  const failures = results
    .filter((r) => !r.ok)
    .map((r) => {
      const row = rows[r.index] || {};
      return {
        index: r.index,
        name: row.name || "",
        email: row.email || "",
        phone: row.phone || "",
        city: row.city || "",
        nationalId: row.nationalId || "",
        error: r.error || "",
      };
    });

  const downloadFailuresCSV = () => {
    const header = ["row", "name", "email", "phone", "city", "nationalId", "error"].join(",") + "\n";
    const lines = failures
      .map((f) =>
        [
          String(f.index + 2),
          `"${(f.name || "").replace(/"/g, '""')}"`,
          `"${(f.email || "").replace(/"/g, '""')}"`,
          `"${(f.phone || "").replace(/"/g, '""')}"`,
          `"${(f.city || "").replace(/"/g, '""')}"`,
          `"${(f.nationalId || "").replace(/"/g, '""')}"`,
          `"${(f.error || "").replace(/"/g, '""')}"`,
        ].join(","),
      )
      .join("\n");
    const csv = header + lines;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "members_import_failures.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[1100]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[900px] rounded-3xl bg-white/95 backdrop-blur-xl border shadow-[0_40px_100px_rgba(2,6,23,0.35)] overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="flex items-center justify-between px-5 py-4 border-b bg-white/85 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>تقرير الاستيراد</div>
            <div className="flex items-center gap-2">
              <Button onClick={downloadFailuresCSV} variant="secondary" className="h-9 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                تحميل أخطاء CSV
              </Button>
              <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
            </div>
          </div>

          <div className="p-5 space-y-3">
            <div className="text-sm" style={{ color: PALETTE.txt }}>
              إجمالي الصفوف: {results.length} • تم بنجاح: {results.filter((r) => r.ok).length} • فشلت: {failures.length}
            </div>

            {failures.length === 0 ? (
              <div className="rounded-xl p-3 text-sm" style={{ background: "#E8FFF1", border: "1px solid #C6F2D9", color: "#2D6A4F" }}>
                لا توجد أخطاء. تم استيراد جميع الصفوف بنجاح.
              </div>
            ) : (
              <div className="rounded-xl border" style={{ borderColor: "#EFEFEF" }}>
                <div className="max-h-[65vh] overflow-auto text-xs" dir="ltr" style={{ color: "#333" }}>
                  <table className="w-full">
                    <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                      <tr>
                        <th className="text-left px-3 py-2">row</th>
                        <th className="text-left px-3 py-2">name</th>
                        <th className="text-left px-3 py-2">email</th>
                        <th className="text-left px-3 py-2">phone</th>
                        <th className="text-left px-3 py-2">city</th>
                        <th className="text-left px-3 py-2">nationalId</th>
                        <th className="text-left px-3 py-2">error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failures.map((f, i) => (
                        <tr key={i} className="border-t hover:bg-gray-50/60 transition-colors" style={{ borderColor: "#F1F1F1" }}>
                          <td className="px-3 py-2">{f.index + 2}</td>
                          <td className="px-3 py-2">{f.name}</td>
                          <td className="px-3 py-2">{f.email}</td>
                          <td className="px-3 py-2">{f.phone}</td>
                          <td className="px-3 py-2">{f.city}</td>
                          <td className="px-3 py-2">{f.nationalId}</td>
                          <td className="px-3 py-2" dir="rtl">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateManagerModal({
  entities,
  onClose,
  onSuccess,
  apiCreate,
}: {
  entities: EntityLite[];
  onClose: () => void;
  onSuccess: () => void;
  apiCreate: (payload: any) => Promise<any>;
}) {
  const [form, setForm] = useState({
    entityId: "",
    name: "",
    email: "",
    phone: "",
    city: "",
    password: "",
    nationalId: "", // ← جديد
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const def = entities[0]?.id ? String(entities[0].id) : "";
    setForm((p) => ({ ...p, entityId: def }));
  }, [entities]);

  const passwordValid = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password);
  const nationalIdValid = /^\d{14}$/.test(form.nationalId || "");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.entityId) return setErr("اختر الكيان");
    if (!form.name.trim()) return setErr("الاسم مطلوب");
    if (!form.password) return setErr("كلمة المرور مطلوبة");
    if (!passwordValid) return setErr("كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام");
    if (!nationalIdValid) return setErr("الرقم القومي يجب أن يكون 14 رقمًا");

    setSaving(true);
    try {
      await apiCreate({
        entityId: form.entityId,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        password: form.password,
        nationalId: form.nationalId, // ← جديد
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
    <div className="fixed inset-0 z-[1005]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[600px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden transition-all duration-300" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>إضافة مدير كيان</div>
            <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
          </div>
          <form onSubmit={onSubmit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="الاسم الكامل">
              <Input className="h-11 rounded-xl" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="البريد الإلكتروني">
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" />
                <Input className="pr-8 h-11 rounded-xl" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              </div>
            </Field>
            <Field label="الهاتف">
              <div className="relative">
                <Phone className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" />
                <Input className="pr-8 h-11 rounded-xl" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </Field>
            <Field label="المدينة">
              <div className="relative">
                <MapPin className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" />
                <Input className="pr-8 h-11 rounded-xl" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </div>
            </Field>

            {/* الرقم القومي - جديد */}
            <Field label="الرقم القومي (14 رقم)">
              <div className="relative">
                <IdCard className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" />
                <Input
                  inputMode="numeric"
                  maxLength={14}
                  pattern="\d{14}"
                  className="pr-8 h-11 rounded-xl"
                  value={form.nationalId}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      nationalId: e.target.value.replace(/\D+/g, "").slice(0, 14),
                    }))
                  }
                />
              </div>
            </Field>

            <Field label="كلمة المرور">
              <Input
                type="password"
                className="h-11 rounded-xl"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                pattern="(?=.*[A-Za-z])(?=.*\d).{8,}"
                title="على الأقل 8 أحرف وبها حروف وأرقام"
              />
            </Field>
            <Field label="الكيان">
              <Select value={form.entityId} onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="اختر الكيان" />
                </SelectTrigger>
                <SelectContent className="z-[1200]">
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {err && (
              <div className="md:col-span-2 rounded-xl p-2 text-sm" style={{ background: "#FFF1F1", border: "1px solid #F2CACA", color: "#B00020" }}>
                {err}
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-3 pt-1">
              <Button type="submit" disabled={saving} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                {saving ? "جارٍ الحفظ..." : "إضافة المدير"}
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
function BulkManagersImportModal({
  entities,
  onClose,
  onDone,
  apiBulk,
  setBulkReport,
}: {
  entities: EntityLite[];
  onClose: () => void;
  onDone: () => void;
  apiBulk: (rows: any[]) => Promise<any>;
  setBulkReport: (r: { results: any[]; rows: any[] }) => void;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [textReport, setTextReport] = useState<string | null>(null);

  useEffect(() => {
    setSelectedEntity(entities[0]?.id ? String(entities[0].id) : "");
  }, [entities]);

  const downloadTemplate = () => {
    const header = "name,email,phone,city,nationalId,password\n";
    const example = "مدير 1,manager@test.com,01000000000,القاهرة,29800000000000,Passw0rd\n";
    const csv = header + example;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entity_managers_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = async (file: File, selectedEntity: string) => {
    setErr("");
    setRows([]);
    setTextReport(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setErr("الرجاء رفع ملف CSV فقط.");
      return;
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    if (lines.length === 0) {
      setErr("الملف فارغ.");
      return;
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const colsNeeded = ["name", "email", "phone", "city", "nationalid", "password"];
    const hasAll = colsNeeded.every((c) => header.includes(c));
    if (!hasAll) {
      setErr(`الأعمدة المطلوبة: ${colsNeeded.join(",")}`);
      return;
    }

    const idx = Object.fromEntries(header.map((h, i) => [h, i]));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw) continue;
      const parts = raw.split(",");

      const name = parts[idx["name"]] ? String(parts[idx["name"]]).trim() : "";
      if (!name) continue;

      const nationalId = parts[idx["nationalid"]] ? String(parts[idx["nationalid"]]).replace(/\D+/g, "").slice(0, 14) : "";
      if (!/^\d{14}$/.test(nationalId)) {
        setErr(`الصف ${i + 1}: الرقم القومي يجب أن يكون 14 رقمًا`);
        return;
      }

      const row = {
        name,
        email: parts[idx["email"]] ? String(parts[idx["email"]]).trim() : "",
        phone: parts[idx["phone"]] ? String(parts[idx["phone"]]).trim() : "",
        city: parts[idx["city"]] ? String(parts[idx["city"]]).trim() : "",
        nationalId,
        password: parts[idx["password"]] ? String(parts[idx["password"]]).trim() : "",
        entityId: selectedEntity || "",
      };

      if (row.password && !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(row.password)) {
        setErr(`الصف ${i + 1}: كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام`);
        return;
      }

      data.push(row);
    }

    if (data.length === 0) {
      setErr("لا توجد بيانات صالحة في الملف.");
      return;
    }

    setRows(data);
  };

  const send = async () => {
    setErr("");
    setTextReport(null);
    if (rows.length === 0) {
      setErr("لم يتم تحميل أي صفوف بعد.");
      return;
    }
    if (!selectedEntity) {
      setErr("اختر الكيان أولًا.");
      return;
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.name?.trim()) return setErr(`صف ${i + 2}: الاسم مطلوب`);
      if (!/^\d{14}$/.test(String(r.nationalId || ""))) return setErr(`صف ${i + 2}: الرقم القومي يجب أن يكون 14 رقمًا`);
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(String(r.password || ""))) return setErr(`صف ${i + 2}: كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام`);
    }
    setSaving(true);
    try {
      const res = await apiBulk(rows);
      const ok = (res?.results || []).filter((r: any) => r.ok).length;
      const fail = (res?.results || []).length - ok;
      const lines = [`إجمالي الصفوف: ${(res?.results || []).length}`, `نجاح: ${ok}`, `فشل: ${fail}`];
      for (const r of res?.results || []) {
        if (!r.ok) lines.push(`صف ${r.index + 2}: ${r.error}`);
      }
      setTextReport(lines.join("\n"));
      setBulkReport({ results: res?.results || [], rows });
      onDone();
    } catch (e: any) {
      try {
        const parsed = JSON.parse(e?.message || "{}");
        setErr(parsed?.error || "فشل الاستيراد");
      } catch {
        setErr("فشل الاستيراد");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1006]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-[760px] rounded-3xl bg-white/90 backdrop-blur-xl border shadow-2xl overflow-hidden" style={{ borderColor: PALETTE.border }}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-white/80 backdrop-blur" style={{ borderColor: "#F1EEE8" }}>
            <div className="font-semibold" style={{ color: PALETTE.txt }}>استيراد مديرين كيانات من CSV</div>
            <div className="flex items-center gap-2">
              <Button onClick={downloadTemplate} variant="secondary" className="h-9 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                تنزيل القالب
              </Button>
              <button onClick={onClose} className="h-9 px-3 rounded-full border text-sm transition-all duration-300 hover:translate-y-[-1px]">إغلاق</button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <Field label="اختيار الكيان المراد إضافة المديرين فيه">
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                  <SelectValue placeholder="اختر الكيان" />
                </SelectTrigger>
                <SelectContent className="z-[1200]">
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-1">
              <span className="text-sm" style={{ color: PALETTE.txt }}>ملف CSV</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseCSV(file, selectedEntity);
                }}
              />
              <div className="text-xs" style={{ color: PALETTE.muted }}>
                الأعمدة المطلوبة: <code>name,email,phone,city,nationalId,password</code>
              </div>
              {selectedEntity && (
                <div className="text-xs" style={{ color: PALETTE.muted }}>
                  سيتم إضافة كل الصفوف إلى كيان: {entities.find((x) => String(x.id) === String(selectedEntity))?.name || selectedEntity}
                </div>
              )}
            </div>

            {rows.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: "#F9F9F9", border: "1px solid #EFEFEF" }}>
                <div className="mb-2 text-sm" style={{ color: PALETTE.txt }}>تمت قراءة {rows.length} صفًا. سيتم التحقق قبل الإرسال.</div>
                <div className="max-h-40 overflow-auto text-xs" dir="ltr" style={{ color: "#333" }}>
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left pr-2">name</th>
                        <th className="text-left pr-2">email</th>
                        <th className="text-left pr-2">phone</th>
                        <th className="text-left pr-2">city</th>
                        <th className="text-left pr-2">nationalId</th>
                        <th className="text-left pr-2">password</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 20).map((r, i) => (
                        <tr key={i}>
                          <td className="pr-2">{r.name}</td>
                          <td className="pr-2">{r.email}</td>
                          <td className="pr-2">{r.phone}</td>
                          <td className="pr-2">{r.city}</td>
                          <td className="pr-2">{r.nationalId}</td>
                          <td className="pr-2">{r.password}</td>
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
              <Button onClick={send} disabled={saving || rows.length === 0} className="h-11 rounded-full font-semibold transition-all duration-300 hover:translate-y-[-1px]" style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                {saving ? "جارٍ الاستيراد…" : "بدء الاستيراد"}
              </Button>
              <Button type="button" onClick={onClose} variant="secondary" className="h-11 rounded-full transition-all duration-300 hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid #E3E3E3", color: PALETTE.txt }}>
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
}
