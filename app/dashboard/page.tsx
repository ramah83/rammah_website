"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users, Building2, CalendarDays, ShieldCheck, FileText, BarChart3, ArrowRight, LogOut,
} from "lucide-react"

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

  const show = useMemo(() => {
    if (!session) {
      return { overview: true, entities: false, members: false, events: false, iso: false, governance: false, reports: false }
    }
    return {
      overview: true,
      entities: ["systemAdmin", "entityManager"].includes(session.role),
      members: ["systemAdmin", "entityManager"].includes(session.role),
      events: ["systemAdmin", "entityManager", "qualitySupervisor", "youth"].includes(session.role),
      iso: ["systemAdmin", "qualitySupervisor"].includes(session.role),
      governance: ["systemAdmin", "qualitySupervisor"].includes(session.role),
      reports: true,
    }
  }, [session])

  const defaultTab = "overview"

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col">
      <div className="absolute inset-0 -z-10">
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/LoginPage.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d3c8f] via-[#1368d6] to-[#0a2e6a] opacity-90" />
      </div>

      <div className="pointer-events-none -z-0">
        <div className="absolute -top-10 right-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-28 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-24 right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/4 translate-y-1/4 rounded-full bg-sky-300/10 blur-3xl" />
      </div>


      <HeaderBar />


      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div className="rounded-[22px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-4 md:p-6 text-white flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">لوحة التحكم</h1>
            <p className="text-white/80 text-sm md:text-base">
              {session ? <>مرحباً {session.name} 👋 — ادارة المنصة حسب دورك وصلاحياتك</> : " "}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <span className="inline-flex items-center rounded-full bg-white/15 text-white px-3 h-8 text-sm ring-1 ring-white/25">
                {roleLabel[session.role]}
              </span>
            )}
            <button
              onClick={() => { try { localStorage.removeItem("session") } catch {} ; router.replace("/") }}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-white text-slate-900 font-semibold"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassStat title="الكيانات" icon={<Building2 className="h-5 w-5 text-white" />} value={stats.entities} />
          <GlassStat title="الأعضاء" icon={<Users className="h-5 w-5 text-white" />} value={stats.members} />
          <GlassStat title="الفعاليات" icon={<CalendarDays className="h-5 w-5 text-white" />} value={stats.events} />
          <GlassStat title="نماذج ISO" icon={<ShieldCheck className="h-5 w-5 text-white" />} value={stats.iso} />
        </div>

        <Card className="rounded-[22px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 text-white">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">الوحدات</CardTitle>
            <CardDescription className="text-white/80">اختَر وحدة للإدارة أو الاستعراض</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-2 bg-white/10 rounded-full p-1">
                <Tab value="overview" label="الملخص" />
                {show.entities && <Tab value="entities" label="الكيانات" />}
                {show.members && <Tab value="members" label="الأعضاء" />}
                {show.events && <Tab value="events" label="الفعاليات" />}
                {show.iso && <Tab value="iso" label="نماذج ISO" />}
                {show.governance && <Tab value="governance" label="الحوكمة" />}
              </TabsList>

             <TabsContent value="overview" className="space-y-4">
  <GlassCard>
    <CardHeader className="pb-0 px-5 pt-5 space-y-2">
      <CardTitle className="text-xl leading-snug">اختصارات سريعة</CardTitle>
      <CardDescription className="text-white/80 leading-relaxed">
        روابط مباشرة لأكثر المهام استخدامًا
      </CardDescription>
    </CardHeader>

    <CardContent className="px-5 pb-5">
      <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap py-1">
        {[
          show.entities && { label: "إدارة الكيانات", href: "/entities" },
          show.members && { label: "إدارة الأعضاء", href: "/members" },
          show.events && { label: "إدارة الفعاليات", href: "/events" },
          show.iso && { label: "نماذج ISO", href: "/iso" },
          show.governance && { label: "الحوكمة", href: "/governance" },
          show.reports && { label: "التقارير ولوحات البيانات", href: "/reports" },
        ]
          .filter(Boolean)
          .map((it) => (
            <GlassButton key={(it as any)!.href} onClick={() => router.push((it as any)!.href)}>
              {(it as any)!.label}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </GlassButton>
          ))}
      </div>
    </CardContent>
  </GlassCard>
</TabsContent>

              {show.entities && (
                <TabsContent value="entities">
                  <UnitGlass
                    icon={<Building2 className="h-5 w-5 text-white" />}
                    title="إدارة الكيانات (Youth Entities)"
                    desc="إنشاء وتحديث بيانات الكيانات، المستندات، التواصل والموقع."
                    href="/entities"
                  />
                </TabsContent>
              )}

              {show.members && (
                <TabsContent value="members">
                  <UnitGlass
                    icon={<Users className="h-5 w-5 text-white" />}
                    title="إدارة الأعضاء (Members)"
                    desc="تسجيل وربط الأعضاء بالكيانات."
                    href="/members"
                  />
                </TabsContent>
              )}

              {show.events && (
                <TabsContent value="events">
                  <UnitGlass
                    icon={<CalendarDays className="h-5 w-5 text-white" />}
                    title="إدارة الفعاليات (Events)"
                    desc="جدولة الفعاليات، إدارة الحضور والتقارير."
                    href="/events"
                  />
                </TabsContent>
              )}

              {show.iso && (
                <TabsContent value="iso">
                  <UnitGlass
                    icon={<ShieldCheck className="h-5 w-5 text-white" />}
                    title="نماذج ISO (إجراءات وسياسات)"
                    desc="مكتبة النماذج، سير الاعتماد، وسجل التدقيق."
                    href="/iso"
                  />
                </TabsContent>
              )}

              {show.governance && (
                <TabsContent value="governance">
                  <UnitGlass
                    icon={<FileText className="h-5 w-5 text-white" />}
                    title="الحوكمة (Governance)"
                    desc="اللوائح، محاضر الاجتماعات، القرارات، واعتمادات النماذج."
                    href="/governance"
                  />
                </TabsContent>
              )}

              {show.reports && (
                <TabsContent value="reports">
                  <UnitGlass
                    icon={<BarChart3 className="h-5 w-5 text-white" />}
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
  const linkCls = (href: string) =>
    `px-3 py-1 rounded-lg transition ${
      pathname === href ? "bg-white/15 text-white" : "text-white/85 hover:text-white"
    }`

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
            <Link href="/dashboard" className={linkCls("/dashboard")}>لوحة التحكم</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}


function GlassStat({ title, icon, value }: { title: string; icon: React.ReactNode; value: number }) {
  return (
    <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-4 text-white">
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/80">{title}</span>
        <span className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-white/60 mt-1">إجمالي {title}</div>
    </div>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 text-white">
      {children}
    </div>
  )
}

function GlassButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-between w-full h-11 rounded-xl bg-white/12 hover:bg-white/20 ring-1 ring-white/25 px-4 text-white transition"
    >
      {children}
    </button>
  )
}

function UnitGlass({ icon, title, desc, href }: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  const router = useRouter()
  return (
    <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-5 text-white flex items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 font-semibold">
          <span className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center">{icon}</span>
          <span className="text-base md:text-lg">{title}</span>
        </div>
        <p className="text-white/80 text-sm">{desc}</p>
      </div>
      <button
        onClick={() => router.push(href)}
        className="shrink-0 inline-flex items-center h-10 px-4 rounded-full bg-white text-slate-900 font-semibold"
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
      className="h-10 rounded-full text-white/90 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow"
    >
      {label}
    </TabsTrigger>
  )
}
