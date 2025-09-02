"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Users, Building2, CalendarDays, ShieldCheck, FileText, BarChart3, ArrowRight, LogOut } from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
  permissions?: string[]
}

const roleLabel: Record<UserRole, string> = {
  systemAdmin: "مدير النظام",
  qualitySupervisor: "مشرف جودة",
  entityManager: "مسؤول كيان",
  youth: "مستخدم",
}

export default function DashboardPage() {
  const router = useRouter()

  const [hydrated, setHydrated] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [stats, setStats] = useState({ entities: 0, members: 0, events: 0, iso: 0 })

  useEffect(() => { setHydrated(true) }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      const s = localStorage.getItem("session")
      if (!s) {
        router.replace("/")
        return
      }
      setSession(JSON.parse(s))
    } catch {
      router.replace("/")
    }
  }, [hydrated, router])

  useEffect(() => {
    if (!hydrated) return
    fetch("/api/stats")
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        setStats({
          entities: Number(data?.entities) || 0,
          members: Number(data?.members) || 0,
          events: Number(data?.events) || 0,
          iso: Number(data?.iso) || 0,
        })
      })
      .catch(() => {
        setStats({ entities: 0, members: 0, events: 0, iso: 0 })
      })
  }, [hydrated])

  const isAdminOrManager = !!session && ["systemAdmin","entityManager"].includes(session.role)

  const show = useMemo(() => {
         return {
      overview: true,
      entities: true,
      members: ["systemAdmin", "entityManager"].includes(session?.role || "youth"),
      events: ["systemAdmin", "entityManager", "qualitySupervisor", "youth"].includes(session?.role || "youth"),
      iso: ["systemAdmin", "qualitySupervisor"].includes(session?.role || "youth"),
      governance: ["systemAdmin", "qualitySupervisor"].includes(session?.role || "youth"),
      reports: true,
    }
  }, [session])

  const defaultTab = "overview"

     const entitiesHref = isAdminOrManager ? "/entities" : "/dashboard/requests"
  const entitiesTitle = isAdminOrManager ? "إدارة الكيانات (Youth Entities)" : "الانضمام إلى كيان"
  const entitiesDesc = isAdminOrManager
    ? "إنشاء وتحديث بيانات الكيانات، المستندات، التواصل والموقع."
    : "استعرض الكيانات واختر كيانًا لتقديم طلب الانضمام، ثم انتظر الموافقة."

  const quickEntities = {
    label: isAdminOrManager ? "إدارة الكيانات" : "اختيار كيان وطلب انضمام",
    href: entitiesHref,
  }

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div className="rounded-[22px] p-4 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>لوحة التحكم</h1>
            <p className="text-sm md:text-base" style={{ color: "#595959" }}>
              {session ? <>مرحباً {session.name} 👋 — ادارة المنصة حسب دورك وصلاحياتك</> : " "}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <span className="inline-flex items-center rounded-full px-3 h-8 text-sm" style={{ backgroundColor: "#F6F6F6", color: "#1D1D1D", border: "1px solid #E5E5E5" }}>
                {roleLabel[session.role]}
              </span>
            )}
            <button
              onClick={() => { try { localStorage.removeItem("session") } catch {} ; router.replace("/") }}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full font-semibold"
              style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="الكيانات" icon={<Building2 className="h-5 w-5" color="#1D1D1D" />} value={stats.entities} />
          <StatCard title="الأعضاء" icon={<Users className="h-5 w-5" color="#1D1D1D" />} value={stats.members} />
          <StatCard title="الفعاليات" icon={<CalendarDays className="h-5 w-5" color="#1D1D1D" />} value={stats.events} />
          <StatCard title="نماذج ISO" icon={<ShieldCheck className="h-5 w-5" color="#1D1D1D" />} value={stats.iso} />
        </div>

        <Card className="rounded-[22px]" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", color: "#1D1D1D", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">الوحدات</CardTitle>
            <CardDescription className="text-sm" style={{ color: "#6B6B6B" }}>اختَر وحدة للإدارة أو الاستعراض</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 rounded-full p-1" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E7E2DC" }}>
                <Tab value="overview" label="الملخص" />
                { }
                {show.entities && <Tab value="entities" label="الكيانات" />}
                {show.members && <Tab value="members" label="الأعضاء" />}
                {show.events && <Tab value="events" label="الفعاليات" />}
                {show.iso && <Tab value="iso" label="نماذج ISO" />}
                {show.governance && <Tab value="governance" label="الحوكمة" />}
                {show.reports && <Tab value="reports" label="التقارير" />}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <SurfaceCard>
                  <CardHeader className="pb-0 px-5 pt-5 space-y-2">
                    <CardTitle className="text-xl leading-snug">اختصارات سريعة</CardTitle>
                    <CardDescription className="leading-relaxed" style={{ color: "#6B6B6B" }}>
                      روابط مباشرة لأكثر المهام استخدامًا
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="px-5 pb-5">
                    <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap py-1">
                      {[
                        { label: quickEntities.label, href: quickEntities.href },
                        show.members && { label: "إدارة الأعضاء", href: "/members" },
                        show.events && { label: "إدارة الفعاليات", href: "/events" },
                        show.iso && { label: "نماذج ISO", href: "/iso" },
                        show.governance && { label: "الحوكمة", href: "/governance" },
                        show.reports && { label: "التقارير ولوحات البيانات", href: "/reports" },
                      ]
                        .filter(Boolean)
                        .map((it) => (
                          <QuickButton key={(it as any)!.href} onClick={() => router.push((it as any)!.href)}>
                            {(it as any)!.label}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                          </QuickButton>
                        ))}
                    </div>
                  </CardContent>
                </SurfaceCard>
              </TabsContent>

              { }
              {show.entities && (
                <TabsContent value="entities">
                  <UnitCard
                    icon={<Building2 className="h-5 w-5" color="#1D1D1D" />}
                    title={entitiesTitle}
                    desc={entitiesDesc}
                    href={entitiesHref}
                  />
                </TabsContent>
              )}

              {show.members && (
                <TabsContent value="members">
                  <UnitCard
                    icon={<Users className="h-5 w-5" color="#1D1D1D" />}
                    title="إدارة الأعضاء (Members)"
                    desc="تسجيل وربط الأعضاء بالكيانات."
                    href="/members"
                  />
                </TabsContent>
              )}

              {show.events && (
                <TabsContent value="events">
                  <UnitCard
                    icon={<CalendarDays className="h-5 w-5" color="#1D1D1D" />}
                    title="إدارة الفعاليات (Events)"
                    desc="جدولة الفعاليات، إدارة الحضور والتقارير."
                    href="/events"
                  />
                </TabsContent>
              )}

              {show.iso && (
                <TabsContent value="iso">
                  <UnitCard
                    icon={<ShieldCheck className="h-5 w-5" color="#1D1D1D" />}
                    title="نماذج ISO (إجراءات وسياسات)"
                    desc="مكتبة النماذج، سير الاعتماد، وسجل التدقيق."
                    href="/iso"
                  />
                </TabsContent>
              )}

              {show.governance && (
                <TabsContent value="governance">
                  <UnitCard
                    icon={<FileText className="h-5 w-5" color="#1D1D1D" />}
                    title="الحوكمة (Governance)"
                    desc="اللوائح، محاضر الاجتماعات، القرارات، واعتمادات النماذج."
                    href="/governance"
                  />
                </TabsContent>
              )}

              {show.reports && (
                <TabsContent value="reports">
                  <UnitCard
                    icon={<BarChart3 className="h-5 w-5" color="#1D1D1D" />}
                    title="التقارير ولوحات البيانات (Dashboards)"
                    desc="ملخصات بالأرقام والرسوم البيانية عن الكيانات والأعضاء والفعاليات و ISO."
                    href="/reports"
                  />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function HeaderBar() {
  const pathname = usePathname()
  const active = (href: string) => pathname === href

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
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
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
  )
}

function StatCard({ title, icon, value }: { title: string; icon: React.ReactNode; value: number }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "#6B6B6B" }}>{title}</span>
        <span className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="text-xs mt-1" style={{ color: "#7A7A7A" }}>إجمالي {title}</div>
    </div>
  )
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
      {children}
    </div>
  )
}

function QuickButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-between w-full h-11 rounded-xl px-4 transition group"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 4px 10px rgba(0,0,0,0.04)", color: "#1D1D1D" }}
    >
      {children}
    </button>
  )
}

function UnitCard({ icon, title, desc, href }: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  const router = useRouter()
  return (
    <div className="rounded-2xl p-5 flex items-start justify-between gap-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", color: "#1D1D1D" }}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-semibold">
          <span className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>{icon}</span>
          <span className="text-base md:text-lg">{title}</span>
        </div>
        <p className="text-sm" style={{ color: "#595959" }}>{desc}</p>
      </div>
      <button
        onClick={() => router.push(href)}
        className="shrink-0 inline-flex items-center h-10 px-4 rounded-full font-semibold"
        style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}
      >
        فتح الصفحة
        <ArrowRight className="h-4 w-4 ms-2" />
      </button>
    </div>
  )
}

function Tab({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="h-10 rounded-full data-[state=active]:shadow"
      style={{ color: "#1D1D1D", backgroundColor: "transparent" }}
    >
      {label}
    </TabsTrigger>
  )
}
