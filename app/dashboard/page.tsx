"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Building2,
  CalendarDays,
  ShieldCheck,
  FileText,
  BarChart3,
  ArrowRight,
  LogOut,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Cairo } from "next/font/google";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "500", "600", "700", "800"], display: "swap" });

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entityId?: string | null;
  permissions?: string[];
};

type EntityLite = { id: string; name: string; managerUserId?: string | null; status?: string };

const roleLabel: Record<UserRole, string> = {
  unionSupervisor: "مسؤول اتحاد الكيانات",
  entityManager: "مسؤول كيان",
  user: "مستخدم",
};

const sessionHeaderB64 = () => {
  const raw = typeof window !== "undefined" ? localStorage.getItem("session") || "" : "";
  if (!raw) return "";
  return btoa(unescape(encodeURIComponent(raw)));
};

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
async function safeFetch(url: string, init: RequestInit = {}) {
  const h = new Headers(init.headers || {});
  const s = sessionHeaderB64();
  if (s) h.set("x-session-b64", s);
  return fetch(url, { ...init, headers: h, credentials: "include", cache: "no-store" });
}
async function fetchCount(url: string): Promise<number> {
  const r = await safeFetch(url);
  const data = await safeJson<any>(r, []);
  return Array.isArray(data) ? data.length : Number(data?.count ?? 0);
}

export default function DashboardPage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  const [entitiesCount, setEntitiesCount] = useState(0);
  const [membersCount, setMembersCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [isoCount, setIsoCount] = useState(0);

  const [managedEntities, setManagedEntities] = useState<EntityLite[]>([]);
  const managedEntity = managedEntities[0];
  const managedEntityName = managedEntity?.name || "";

  const [leaving, setLeaving] = useState(false);

  useEffect(() => setHydrated(true), []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      const s = localStorage.getItem("session");
      if (!s) {
        router.replace("/");
        return;
      }
      setSession(JSON.parse(s));
    } catch {
      router.replace("/");
    }
  }, [hydrated, router]);

  const [refreshedSession, setRefreshedSession] = useState(false);
  useEffect(() => {
    if (!hydrated || !session?.id || refreshedSession) return;
    safeFetch(`/api/me?id=${encodeURIComponent(session.id)}`)
      .then((r) => safeJson<Session>(r, session as Session))
      .then((fresh) => {
        setSession(fresh);
        try {
          localStorage.setItem("session", JSON.stringify(fresh));
        } catch {}
      })
      .catch(() => {})
      .finally(() => setRefreshedSession(true));
  }, [hydrated, session?.id, refreshedSession]);

  useEffect(() => {
    if (!hydrated || !session?.id || !session.role) return;
    const url = `/api/entities?viewerId=${encodeURIComponent(session.id)}&role=${encodeURIComponent(
      session.role
    )}&scope=mine`;
    safeFetch(url)
      .then((r) => safeJson<EntityLite[]>(r, []))
      .then((list) => setManagedEntities(Array.isArray(list) ? list : []))
      .catch(() => setManagedEntities([]));
  }, [hydrated, session?.id, session?.role]);

  const [approvedEntityIds, setApprovedEntityIds] = useState<string[]>([]);
  const approvedCount = approvedEntityIds.length;

  useEffect(() => {
    if (!hydrated || !session?.id) return;
    if (session.role !== "user") {
      setApprovedEntityIds([]);
      return;
    }
    safeFetch(`/api/membership/my`)
      .then((r) => safeJson<any>(r, { entityId: null }))
      .then((res) => {
        const eid = res?.entityId ? String(res.entityId) : null;
        setApprovedEntityIds(eid ? [eid] : []);
      })
      .catch(() => setApprovedEntityIds([]));
  }, [hydrated, session?.id, session?.role]);

  useEffect(() => {
    if (!hydrated) return;
    (async () => {
      try {
        if (session?.role === "entityManager") {
          const entityId = (session.entityId || managedEntity?.id || "").toString();
          setEntitiesCount(entityId ? 1 : 0);

          let m = 0,
            e = 0,
            i = 0;
          try {
            m = await fetchCount(`/api/members?entityId=${encodeURIComponent(entityId)}`);
          } catch {
            const all = await safeJson(await safeFetch("/api/members"), [] as any[]);
            m = (Array.isArray(all) ? all : []).filter((x: any) => String(x?.entityId || "") === entityId).length;
          }
          try {
            e = await fetchCount(`/api/events?scope=mine`);
          } catch {
            const all = await safeJson(await safeFetch("/api/events"), [] as any[]);
            e = (Array.isArray(all) ? all : []).filter((x: any) => String(x?.entityId || "") === entityId).length;
          }
          try {
            i = await fetchCount(`/api/iso?entityId=${encodeURIComponent(entityId)}`);
          } catch {
            const all = await safeJson(await safeFetch(`/api/iso?entityId=${encodeURIComponent(entityId)}`), [] as any[]);
            i = Array.isArray(all) ? all.length : 0;
          }

          setMembersCount(m);
          setEventsCount(e);
          setIsoCount(i);
          return;
        }

        if (session?.role === "unionSupervisor") {
          const s = await safeJson(await safeFetch("/api/stats"), { entities: 0, members: 0, events: 0, iso: 0 });
          setEntitiesCount(Number(s?.entities) || 0);
          setMembersCount(Number(s?.members) || 0);
          setEventsCount(Number(s?.events) || 0);
          try {
            setIsoCount(await fetchCount(`/api/iso`));
          } catch {
            setIsoCount(Number(s?.iso) || 0);
          }
          return;
        }

        if (session?.role === "user") {
          setEntitiesCount(approvedCount);

          let totalMembers = 0;
          for (const eid of approvedEntityIds) {
            try {
              totalMembers += await fetchCount(`/api/members?entityId=${encodeURIComponent(eid)}`);
            } catch {
              const all = await safeJson(await safeFetch(`/api/members?entityId=${encodeURIComponent(eid)}`), [] as any[]);
              totalMembers += (Array.isArray(all) ? all : []).length;
            }
          }
          setMembersCount(totalMembers);

          try {
            setEventsCount(await fetchCount(`/api/events?scope=mine`));
          } catch {
            setEventsCount(0);
          }

          try {
            setIsoCount(await fetchCount(`/api/iso?status=approved`));
          } catch {
            setIsoCount(0);
          }
          return;
        }

        setEntitiesCount(0);
        setMembersCount(0);
        setEventsCount(0);
        setIsoCount(0);
      } catch {
        setEntitiesCount(0);
        setMembersCount(0);
        setEventsCount(0);
        setIsoCount(0);
      }
    })();
  }, [hydrated, session?.role, session?.entityId, managedEntity?.id, approvedCount, approvedEntityIds]);

  const isManager = session?.role === "entityManager";
  const isUser = session?.role === "user";
  const managerSuspended = isManager && managedEntity?.status === "suspended";
  const userSuspended = isUser && managedEntity?.status === "suspended";
  const suspendedAny = managerSuspended || userSuspended;

  const guardNavigate = (href: string) => {
    if (suspendedAny) {
      alert("الكيان متوقف حاليًا. يمكنك الخروج من الكيان أو الانتظار حتى يتم استئنافه.");
      return;
    }
    router.push(href);
  };

  const leaveEntityNow = async () => {
    if (!isUser) return;
    if (!confirm("هل تريد الخروج من الكيان الحالي الآن؟")) return;
    try {
      setLeaving(true);
      const r = await safeFetch("/api/membership/leave", { method: "POST" });
      await safeJson(r, {});
      setApprovedEntityIds([]);
      setManagedEntities([]);
      alert("تم الخروج من الكيان بنجاح.");
    } catch {
      alert("تعذر إتمام العملية. حاول مرة أخرى.");
    } finally {
      setLeaving(false);
    }
  };

  const visible = useMemo(() => {
    const isUnion = session?.role === "unionSupervisor";
    const isUserRole = session?.role === "user";
    return {
      overview: true,
      entities: true,
      members: true,
      events: true,
      iso: isUnion || isManager || isUserRole,
      governance: true,
      reports: true,
    };
  }, [session?.role, isManager]);

  const showAcceptedBadge = session?.role === "user";

  return (
    <div className={`${cairo.className} relative min-h-screen overflow-hidden flex flex-col bg-[#EFE6DE]`}>
      <HeaderBar />

      {/* تنبيه التوقيف */}
      {(managerSuspended || userSuspended) && (
        <div className="mx-auto max-w-6xl w-full px-4 mt-4">
          <div className="rounded-xl p-3 md:p-4 flex items-start gap-3 bg-[#FFF7E6] border border-[#FFE2B5]">
            <span className="h-8 w-8 mt-0.5 rounded-lg flex items-center justify-center bg-white border border-[#FFE2B5]">
              <AlertTriangle className="h-5 w-5 text-[#B26B00]" />
            </span>
            <div className="text-[#6B4E00] text-sm">
              <div className="font-semibold mb-0.5">الكيان موقوف مؤقتًا</div>
              <div>
                لن تتمكن من تنفيذ إجراءات على الكيان الآن. {isUser ? "يمكنك الخروج من الكيان فورًا أو الانتظار حتى يتم استئنافه." : "غيّر الكيان أو انتظر حتى يتم استئنافه."}
              </div>
              {isUser && (
                <div className="mt-3">
                  <button
                    onClick={leaveEntityNow}
                    disabled={leaving}
                    className="inline-flex items-center h-10 px-4 rounded-full font-semibold bg-[#EC1A24] text-white disabled:opacity-60"
                    title="الخروج من الكيان الآن"
                  >
                    {leaving ? "جارٍ الخروج..." : "الخروج من الكيان الآن"}
                    <ArrowRight className="h-4 w-4 ms-2" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* رأس الصفحة */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div className="rounded-[22px] p-4 md:p-6 flex items-center justify-between bg-white border border-[#E7E2DC] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1D1D1D]">لوحة التحكم</h1>
            <p className="text-sm md:text-base text-[#595959]">{session ? <>مرحباً {session.name} 👋 — ادارة المنصة حسب دورك وصلاحياتك</> : " "}</p>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <>
                <span className="inline-flex items-center rounded-full px-3 h-8 text-sm bg-[#F6F6F6] text-[#1D1D1D] border border-[#E5E5E5]">
                  {session.role === "entityManager" && managedEntityName ? (
                    <>
                      مسؤول كيان — <span className="font-semibold ms-1">{managedEntityName}</span>
                    </>
                  ) : (
                    roleLabel[session.role]
                  )}
                </span>

                {/* شارة التوقيف */}
                {(managerSuspended || userSuspended) && (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 h-8 text-sm bg-[#FFF0F0] text-[#7A0010] border border-[#F5C2C7]">
                    موقوف مؤقتًا
                  </span>
                )}

                {showAcceptedBadge && (
                  <span className="inline-flex items-center gap-1 rounded-full px-3 h-8 text-sm bg-[#E8F7EE] text-[#0F5132] border border-[#CBE9D6]">
                    <Check className="h-4 w-4" /> مقبول في {approvedCount} كيان
                  </span>
                )}
              </>
            )}
            <button
              onClick={() => {
                try {
                  localStorage.removeItem("session");
                } catch {}
                router.replace("/");
              }}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full font-semibold bg-[#EC1A24] text-white"
            >
              <LogOut className="h-4 w-4" /> تسجيل الخروج
            </button>
          </div>
        </div>
      </section>

      {/* المحتوى */}
      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="الكيانات"
            icon={<Building2 className="h-5 w-5 text-[#1D1D1D]" />}
            value={entitiesCount}
            extra={session?.role === "entityManager" ? <>كيانك</> : session?.role === "user" ? <>الكيانات المقبول بها</> : <>إجمالي الكيانات</>}
          />
          <StatCard
            title="الأعضاء"
            icon={<Users className="h-5 w-5 text-[#1D1D1D]" />}
            value={membersCount}
            extra={session?.role === "entityManager" ? <>أعضاء كيانك</> : session?.role === "user" ? <>أعضاء كياناتك</> : <>إجمالي الأعضاء</>}
          />
          <StatCard
            title="الفعاليات"
            icon={<CalendarDays className="h-5 w-5 text-[#1D1D1D]" />}
            value={eventsCount}
            extra={session?.role === "entityManager" ? <>فعاليات كيانك</> : session?.role === "user" ? <>فعاليات كياناتك</> : <>إجمالي الفعاليات</>}
          />
          <StatCard
            title="نماذج ISO"
            icon={<ShieldCheck className="h-5 w-5 text-[#1D1D1D]" />}
            value={isoCount}
            extra={session?.role === "entityManager" ? <>نماذج كيانك</> : session?.role === "user" ? <>النماذج المعتمدة</> : <>إجمالي النماذج</>}
          />
        </div>

        <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">الوحدات</CardTitle>
            <CardDescription className="text-sm text-[#6B6B6B]">اختر وحدة للإدارة أو الاستعراض</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue="events" className="w-full">
              {/* تبويبات */}
              <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-full p-1 bg-[#F6F6F6] border border-[#E7E2DC]">
                <Tab value="overview" label="الملخص" />
                <Tab value="entities" label="الكيانات" />
                <Tab value="members" label="الأعضاء" />
                <Tab value="events" label="الفعاليات" />
                {visible.iso && <Tab value="iso" label="نماذج ISO" />}
                <Tab value="governance" label="الحوكمة" />
                <Tab value="reports" label="التقارير" />
              </TabsList>

              {/* الملخص */}
              <TabsContent value="overview" className="space-y-4">
                <SurfaceCard>
                  <CardHeader className="pb-0 px-5 pt-5 space-y-2">
                    <CardTitle className="text-xl leading-snug">اختصارات سريعة</CardTitle>
                    <CardDescription className="leading-relaxed text-[#6B6B6B]">روابط مباشرة لأكثر المهام استخدامًا</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap py-1">
                      {[
                        (session?.role === "unionSupervisor" || session?.role === "entityManager") && {
                          label: "إدارة الكيانات",
                          href: "/entities",
                        },
                        session?.role === "unionSupervisor" && { label: "طلبات الانضمام", href: "/dashboard/requests" },
                        session?.role === "entityManager" && { label: "طلبات انضمام كيانك", href: "/dashboard/requests" },
                        session?.role === "user" && { label: "اختيار كيان وطلب انضمام", href: "/dashboard/requests" },
                        { label: "الحوكمة", href: "/governance" },
                        visible.iso && { label: "نماذج ISO", href: "/iso" },
                        (session?.role === "unionSupervisor" || session?.role === "entityManager") && {
                          label: "إدارة الأعضاء",
                          href: "/members",
                        },
                        { label: "التقارير ولوحات البيانات", href: "/reports" },
                      ]
                        .filter(Boolean)
                        .map((it) => (
                          <QuickButton
                            key={(it as any)!.href}
                            onClick={() => guardNavigate((it as any)!.href)}
                            blocked={suspendedAny}
                            titleWhenBlocked="الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا"
                          >
                            {(it as any)!.label}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                          </QuickButton>
                        ))}
                    </div>
                  </CardContent>
                </SurfaceCard>
              </TabsContent>

              {/* الكيانات */}
              <TabsContent value="entities" className="space-y-3">
                <UnitCard
                  icon={<Building2 className="h-5 w-5 text-[#1D1D1D]" />}
                  title="إدارة الكيانات (Youth Entities)"
                  desc={session?.role === "entityManager" ? "تعديل بيانات كيانك ومستنداته" : "إنشاء وتحديث بيانات الكيانات، المستندات، التواصل والموقع."}
                  href="/entities"
                  blocked={suspendedAny}
                  onOpen={(href) => guardNavigate(href)}
                />

                {(session?.role === "unionSupervisor" || session?.role === "entityManager") && (
                  <UnitCard
                    icon={<ShieldCheck className="h-5 w-5 text-[#1D1D1D]" />}
                    title="طلبات الكيانات"
                    desc={
                      session?.role === "unionSupervisor"
                        ? "راجع ووافق/ارفض طلبات إنشاء/تعديل/حذف الكيانات المقدَّمة من المديرين."
                        : "متابعة حالة طلبات إنشاء/تعديل/حذف كيانك (قراءة فقط)."
                    }
                    href="/dashboard/entity-requests"
                    blocked={suspendedAny && session?.role === "entityManager"}
                    onOpen={(href) => guardNavigate(href)}
                  />
                )}

                {session?.role !== "unionSupervisor" && (
                  <button
                    onClick={() => guardNavigate("/dashboard/promotion-request")}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold bg-[#EC1A24] text-white disabled:opacity-60"
                    disabled={suspendedAny}
                    title={suspendedAny ? "الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا" : undefined}
                  >
                    <ShieldCheck className="h-4 w-4" /> طلب ترقية لمسؤول اتحاد
                  </button>
                )}
              </TabsContent>

              {/* الأعضاء */}
              <TabsContent value="members" className="space-y-3">
                <UnitCard
                  icon={<Users className="h-5 w-5 text-[#1D1D1D]" />}
                  title="الأعضاء (Members)"
                  desc={
                    session?.role === "unionSupervisor"
                      ? "تسجيل وربط الأعضاء بكل الكيانات"
                      : session?.role === "entityManager"
                      ? "أعضاء كيانك فقط"
                      : "أعضاء كيانك — عرض فقط"
                  }
                  href="/members"
                  blocked={suspendedAny}
                  onOpen={(href) => guardNavigate(href)}
                />

                {session?.role === "unionSupervisor" && (
                  <UnitCard
                    icon={<Users className="h-5 w-5 text-[#1D1D1D]" />}
                    title="طلبات الانضمام لكل الكيانات"
                    desc="استعراض جميع طلبات الانضمام المعلّقة على مستوى المنصّة والموافقة/الرفض."
                    href="/dashboard/requests"
                    onOpen={(href) => guardNavigate(href)}
                  />
                )}

                {session?.role === "unionSupervisor" && (
                  <>
                    <UnitCard
                      icon={<ShieldCheck className="h-5 w-5 text-[#1D1D1D]" />}
                      title="طلبات تعيين مديري الكيانات"
                      desc="راجع ووافق/ارفض طلبات تعيين المديرين المرسلة من المستخدمين."
                      href="/dashboard/manager-requests"
                      onOpen={(href) => guardNavigate(href)}
                    />
                    <UnitCard
                      icon={<Users className="h-5 w-5 text-[#1D1D1D]" />}
                      title="طلبات الترقية لمسؤول اتحاد"
                      desc="إدارة طلبات الترقية لمستوى مسؤول اتحاد الكيانات."
                      href="/dashboard/promotion-request"
                      onOpen={(href) => guardNavigate(href)}
                    />
                  </>
                )}

                {session?.role === "entityManager" && (
                  <UnitCard
                    icon={<Users className="h-5 w-5 text-[#1D1D1D]" />}
                    title="طلبات الانضمام إلى كيانك"
                    desc="مراجعة طلبات انضمام الأفراد والموافقة/الرفض."
                    href="/dashboard/requests"
                    blocked={suspendedAny}
                    onOpen={(href) => guardNavigate(href)}
                  />
                )}
              </TabsContent>

              {/* الفعاليات */}
              <TabsContent value="events" className="space-y-3">
                <UnitCard
                  icon={<CalendarDays className="h-5 w-5 text-[#1D1D1D]" />}
                  title={session?.role === "user" ? "تقييم فعالية" : "الفعاليات (Events)"}
                  desc={
                    session?.role === "entityManager" ? "فعاليات كيانك فقط (طلبات)" : session?.role === "user" ? "قيّم فعالية حضرتها" : "جدولة/متابعة الفعاليات والتقارير"
                  }
                  href={session?.role === "user" ? "/evaluations/new" : "/events"}
                  blocked={suspendedAny}
                  onOpen={(href) => guardNavigate(href)}
                />

                <div
                  className="rounded-xl px-3 py-3 flex items-center justify-between bg-[#F6F6F6] border border-[#E7E2DC]"
                  style={{ boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
                >
                  <span className="text-sm text-[#6B6B6B]">إجراءات سريعة على الفعاليات</span>
                  <div className="flex items-center gap-2">
                    {session?.role === "user" && (
                      <button
                        onClick={() => guardNavigate("/evaluations/new")}
                        className="inline-flex items-center h-10 px-4 rounded-full font-semibold bg-[#EC1A24] text-white disabled:opacity-60"
                        disabled={suspendedAny}
                        title={suspendedAny ? "الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا" : undefined}
                      >
                        تقييم فعالية
                        <CalendarDays className="h-4 w-4 ms-2" />
                      </button>
                    )}
                    {session?.role === "entityManager" && (
                      <button
                        onClick={() => guardNavigate("/manager/evaluations")}
                        className="inline-flex items-center h-10 px-4 rounded-full font-semibold bg-[#EC1A24] text-white disabled:opacity-60"
                        disabled={suspendedAny}
                        title={suspendedAny ? "الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا" : undefined}
                      >
                        عرض تقييمات الكيان
                        <ArrowRight className="h-4 w-4 ms-2" />
                      </button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ISO */}
              {visible.iso && (
                <TabsContent value="iso">
                  <UnitCard
                    icon={<ShieldCheck className="h-5 w-5 text-[#1D1D1D]" />}
                    title="نماذج ISO (إجراءات وسياسات)"
                    desc={
                      session?.role === "unionSupervisor"
                        ? "مكتبة النماذج، سير الاعتماد، وسجل التدقيق."
                        : session?.role === "entityManager"
                        ? "استعراض وإنشاء نماذج لسياسات كيانك وإرسالها للاعتماد."
                        : "استعراض النماذج المعتمدة والسياسات المنشورة."
                    }
                    href="/iso"
                    blocked={suspendedAny}
                    onOpen={(href) => guardNavigate(href)}
                  />
                </TabsContent>
              )}

              {/* الحوكمة */}
              <TabsContent value="governance">
                <UnitCard
                  icon={<FileText className="h-5 w-5 text-[#1D1D1D]" />}
                  title="الحوكمة (Governance)"
                  desc={
                    session?.role === "unionSupervisor"
                      ? "اللوائح، محاضر الاجتماعات، القرارات — إنشاء/تعديل/حذف السجلات."
                      : session?.role === "entityManager"
                      ? "عرض سجل الحوكمة لكيانك (الكتابة حسب صلاحيات الواجهة الخلفية)."
                      : "عرض اللوائح، المحاضر والقرارات (قراءة فقط)."
                  }
                  href="/governance"
                  blocked={suspendedAny}
                  onOpen={(href) => guardNavigate(href)}
                />
              </TabsContent>

              {/* التقارير */}
              <TabsContent value="reports">
                <UnitCard
                  icon={<BarChart3 className="h-5 w-5 text-[#1D1D1D]" />}
                  title="التقارير ولوحات البيانات (Dashboards)"
                  desc={session?.role === "entityManager" ? "تقارير كيانك" : "ملخصات عامة للأرقام والرسوم البيانية"}
                  href="/reports"
                  blocked={suspendedAny}
                  onOpen={(href) => guardNavigate(href)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
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
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border border-[#E7E2DC] shadow-[0_6px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#F6F6F6] border border-[#E5E5E5]">
              <Users className="h-5 w-5 text-[#1D1D1D]" />
            </div>
            <Link href="/" className="font-semibold text-[#1D1D1D]">
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/profile", label: "الملف الشخصى" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
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

function StatCard({ title, icon, value, extra }: { title: string; icon: React.ReactNode; value: number; extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-[#E7E2DC] shadow text-[#1D1D1D]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#6B6B6B]">{title}</span>
        <span className="h-8 w-8 rounded-xl flex items-center justify-center bg-[#F6F6F6] border border-[#E5E5E5]">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="text-xs mt-1 text-[#7A7A7A]">{extra ? extra : <>إجمالي {title}</>}</div>
    </div>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white border border-[#E7E2DC] shadow-[0_8px_18px_rgba(0,0,0,0.05)] text-[#1D1D1D]">{children}</div>;
}

function QuickButton({
  children,
  onClick,
  blocked,
  titleWhenBlocked,
}: {
  children: React.ReactNode;
  onClick: () => void;
  blocked?: boolean;
  titleWhenBlocked?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-between w-full h-11 rounded-xl px-4 transition group bg-white text-[#1D1D1D] border border-[#E7E2DC] shadow-[0_4px_10px_rgba(0,0,0,0.04)] disabled:opacity-60"
      disabled={!!blocked}
      title={blocked ? titleWhenBlocked || "الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا" : undefined}
    >
      {children}
    </button>
  );
}

function UnitCard({
  icon,
  title,
  desc,
  href,
  adminActions,
  blocked,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  adminActions?: { label: string; href: string }[];
  blocked?: boolean;
  onOpen?: (href: string) => void;
}) {
  const router = useRouter();
  const open = () => (onOpen ? onOpen(href) : router.push(href));
  return (
    <div className="rounded-2xl p-5 flex items-start justify-between gap-4 bg-white border border-[#E7E2DC] shadow-[0_8px_18px_rgba(0,0,0,0.05)] text-[#1D1D1D]">
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <span className="h-9 w-9 rounded-xl flex items-center justify-center bg-[#F6F6F6] border border-[#E5E5E5]">{icon}</span>
          <span className="text-base md:text-lg">{title}</span>
        </div>
        <p className="text-sm text-[#595959]">{desc}</p>
        {adminActions && adminActions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {adminActions.map((a) => (
              <Link key={a.href} href={a.href} className="inline-flex items-center h-9 px-3 rounded-full border border-[#E7E2DC] text-sm hover:bg-[#F6F6F6]">
                {a.label}
              </Link>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={open}
        className="shrink-0 inline-flex items-center h-10 px-4 rounded-full font-semibold bg-[#EC1A24] text-white disabled:opacity-60"
        disabled={!!blocked}
        title={blocked ? "الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا" : undefined}
      >
        فتح الصفحة
        <ArrowRight className="h-4 w-4 ms-2" />
      </button>
    </div>
  );
}

function Tab({ value, label }: { value: string; label: string }) {
  return <TabsTrigger value={value} className="h-10 rounded-full data-[state=active]:shadow text-[#1D1D1D] bg-transparent">{label}</TabsTrigger>;
}
