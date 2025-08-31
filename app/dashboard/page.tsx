"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">لوحة التحكم</h1>
            <p className="text-gray-600">
              {session ? <>مرحباً {session.name} 👋 — ادارة المنصة حسب دورك وصلاحياتك</> : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <Badge variant="secondary" className="text-sm">
                {roleLabel[session.role]}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                try { localStorage.removeItem("session") } catch {}
                router.replace("/")
              }}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </div>

        {/* بطاقات الإحصائيات — بتبدأ 0 عند SSR/CSR وبعدين تتحدث بعد التركيب */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="الكيانات" icon={<Building2 className="h-4 w-4 text-blue-600" />} value={stats.entities} />
          <StatCard title="الأعضاء" icon={<Users className="h-4 w-4 text-blue-600" />} value={stats.members} />
          <StatCard title="الفعاليات" icon={<CalendarDays className="h-4 w-4 text-blue-600" />} value={stats.events} />
          <StatCard title="نماذج ISO" icon={<ShieldCheck className="h-4 w-4 text-blue-600" />} value={stats.iso} />
        </div>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg">الوحدات</CardTitle>
            <CardDescription>اختَر وحدة للإدارة أو الاستعراض</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-6 gap-1">
                <TabsTrigger value="overview">الملخص</TabsTrigger>
                {show.entities && <TabsTrigger value="entities">الكيانات</TabsTrigger>}
                {show.members && <TabsTrigger value="members">الأعضاء</TabsTrigger>}
                {show.events && <TabsTrigger value="events">الفعاليات</TabsTrigger>}
                {show.iso && <TabsTrigger value="iso">نماذج ISO</TabsTrigger>}
                {show.governance && <TabsTrigger value="governance">الحوكمة</TabsTrigger>}
                {show.reports && <TabsTrigger value="reports">التقارير</TabsTrigger>}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <QuickLinks
                  items={[
                    show.entities && { label: "إدارة الكيانات", href: "/entities" },
                    show.members && { label: "إدارة الأعضاء", href: "/members" },
                    show.events && { label: "إدارة الفعاليات", href: "/events" },
                    show.iso && { label: "نماذج ISO", href: "/iso" },
                    show.governance && { label: "الحوكمة", href: "/governance" },
                    show.reports && { label: "التقارير ولوحات البيانات", href: "/reports" },
                  ].filter(Boolean) as { label: string; href: string }[]}
                />
              </TabsContent>

              {show.entities && (
                <TabsContent value="entities">
                  <UnitCard
                    icon={<Building2 className="h-5 w-5 text-blue-600" />}
                    title="إدارة الكيانات (Youth Entities)"
                    desc="إنشاء وتحديث بيانات الكيانات، المستندات، التواصل والموقع."
                    href="/entities"
                  />
                </TabsContent>
              )}

              {show.members && (
                <TabsContent value="members">
                  <UnitCard
                    icon={<Users className="h-5 w-5 text-blue-600" />}
                    title="إدارة الأعضاء (Members)"
                    desc="تسجيل وربط الأعضاء بالكيانات."
                    href="/members"
                  />
                </TabsContent>
              )}

              {show.events && (
                <TabsContent value="events">
                  <UnitCard
                    icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
                    title="إدارة الفعاليات (Events)"
                    desc="جدولة الفعاليات، إدارة الحضور والتقارير."
                    href="/events"
                  />
                </TabsContent>
              )}

              {show.iso && (
                <TabsContent value="iso">
                  <UnitCard
                    icon={<ShieldCheck className="h-5 w-5 text-blue-600" />}
                    title="نماذج ISO (إجراءات وسياسات)"
                    desc="مكتبة النماذج، سير الاعتماد، وسجل التدقيق."
                    href="/iso"
                  />
                </TabsContent>
              )}

              {show.governance && (
                <TabsContent value="governance">
                  <UnitCard
                    icon={<FileText className="h-5 w-5 text-blue-600" />}
                    title="الحوكمة (Governance)"
                    desc="اللوائح، محاضر الاجتماعات، القرارات، واعتمادات النماذج."
                    href="/governance"
                  />
                </TabsContent>
              )}

              {show.reports && (
                <TabsContent value="reports">
                  <UnitCard
                    icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
                    title="التقارير ولوحات البيانات (Dashboards)"
                    desc="ملخصات بالأرقام والرسوم البيانية عن الكيانات والأعضاء والفعاليات و ISO."
                    href="/reports"
                  />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <Separator className="opacity-0" />
      </div>
    </div>
  )
}

/* ====== Components ====== */
function StatCard({ title, icon, value }: { title: string; icon: React.ReactNode; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">{title}</CardTitle>
        <CardDescription className="flex items-center gap-2">{icon} إجمالي {title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function QuickLinks({ items }: { items: { label: string; href: string }[] }) {
  const router = useRouter()
  return (
    <Card>
      <CardHeader>
        <CardTitle>اختصارات سريعة</CardTitle>
        <CardDescription>روابط مباشرة لأكثر المهام استخدامًا</CardDescription>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => (
          <Button key={it.href} variant="outline" className="justify-between" onClick={() => router.push(it.href)}>
            {it.label}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

function UnitCard({ icon, title, desc, href }: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  const router = useRouter()
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
          <CardDescription>{desc}</CardDescription>
        </div>
        <Button variant="outline" onClick={() => router.push(href)} className="shrink-0">
          فتح الصفحة
          <ArrowRight className="h-4 w-4 ms-2" />
        </Button>
      </CardHeader>
    </Card>
  )
}
