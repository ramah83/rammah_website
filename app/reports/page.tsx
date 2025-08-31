"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"

import { Users, Building2, CalendarDays, ShieldCheck, Filter } from "lucide-react"
import { dataStore } from "@/lib/data-store"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null }
type RangeKey = "7" | "30" | "90" | "all"

export default function ReportsPage() {
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)

  const [entities, setEntities] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [iso, setISO] = useState<any[]>([])

  const [range, setRange] = useState<RangeKey>("30")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    try {
      const s = localStorage.getItem("session")
      if (!s) { setSession(null); router.replace("/"); return }
      setSession(JSON.parse(s))
    } catch {
      setSession(null); router.replace("/")
    }
  }, [router])

  useEffect(() => {
    const safe = <T,>(fn?: () => T[] | undefined) => (typeof fn === "function" ? fn() ?? [] : [])
    try {
      setEntities(safe(dataStore?.listEntities))
      setMembers(safe(dataStore?.listMembers))
      setEvents(safe(dataStore?.listEvents))
      setISO(safe(dataStore?.listISO))
    } catch {
      setEntities([]); setMembers([]); setEvents([]); setISO([])
    }
  }, [])

  const withinRange = (dateStr?: string) => {
    if (!dateStr) return true
    if (range === "all") return true
    const days = Number(range)
    const d = new Date(dateStr).getTime()
    const limit = Date.now() - days * 24 * 60 * 60 * 1000
    return d >= limit
  }

  const filtered = useMemo(() => {
    const filterByEntity = (entityId?: string) => (entityFilter === "all" ? true : (entityId ?? "") === entityFilter)
    const q = search.trim().toLowerCase()

    const ents = (entities || []).filter((e) => (q ? String(e.name ?? "").toLowerCase().includes(q) : true))

    const mems = (members || [])
      .filter((m) => filterByEntity(m.entityId))
      .filter((m) =>
        q ? [m.name, m.email, m.phone].filter(Boolean).join(" ").toLowerCase().includes(q) : true
      )

    const evs = (events || [])
      .filter((ev) => filterByEntity(ev.entityId))
      .filter((ev) => withinRange(ev.date))
      .filter((ev) => (q ? [ev.title, ev.status].join(" ").toLowerCase().includes(q) : true))

    const isoForms = (iso || [])
      .filter((f) => filterByEntity(f.ownerEntityId))
      .filter((f) =>
        q ? [f.title, f.code, f.status].filter(Boolean).join(" ").toLowerCase().includes(q) : true
      )

    return { ents, mems, evs, isoForms }
  }, [entities, members, events, iso, entityFilter, range, search])

  const kpis = useMemo(
    () => ({
      entities: filtered.ents.length,
      members: filtered.mems.length,
      events: filtered.evs.length,
      iso: filtered.isoForms.length,
    }),
    [filtered]
  )

  const byEntity = useMemo(() => {
    const nameOf = (id?: string) => entities.find((e) => e.id === id)?.name || "غير محدد"
    const group: Record<string, { name: string; members: number; events: number; iso: number }> = {}
    filtered.mems.forEach((m) => {
      const key = m.entityId || "none"
      group[key] ??= { name: nameOf(m.entityId), members: 0, events: 0, iso: 0 }
      group[key].members++
    })
    filtered.evs.forEach((ev) => {
      const key = ev.entityId || "none"
      group[key] ??= { name: nameOf(ev.entityId), members: 0, events: 0, iso: 0 }
      group[key].events++
    })
    filtered.isoForms.forEach((f) => {
      const key = f.ownerEntityId || "none"
      group[key] ??= { name: nameOf(f.ownerEntityId), members: 0, events: 0, iso: 0 }
      group[key].iso++
    })
    return Object.entries(group)
      .map(([entityId, v]) => ({ entityId, ...v }))
      .sort((a, b) => b.members + b.events + b.iso - (a.members + a.events + a.iso))
      .slice(0, 6)
  }, [filtered, entities])

  const eventStatusDist = useMemo(() => {
    const dist: Record<string, number> = { draft: 0, approved: 0, cancelled: 0, done: 0 }
    filtered.evs.forEach((ev) => { dist[ev.status] = (dist[ev.status] || 0) + 1 })
    return dist
  }, [filtered.evs])

  const isoStatusDist = useMemo(() => {
    const dist: Record<string, number> = { draft: 0, submitted: 0, review: 0, approved: 0, rejected: 0 }
    filtered.isoForms.forEach((f) => { dist[f.status] = (dist[f.status] || 0) + 1 })
    return dist
  }, [filtered.isoForms])

  const maxEntityMetric = Math.max(1, ...byEntity.map((x) => x.members + x.events + x.iso))

  if (!session) return null

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col">

      <div className="absolute inset-0 -z-10">
        <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/LoginPage.png')" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d3c8f] via-[#1368d6] to-[#0a2e6a] opacity-90" />
      </div>


      <div className="pointer-events-none -z-0">
        <div className="absolute -top-10 right-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute top-28 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-24 right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/4 translate-y-1/4 rounded-full bg-sky-300/10 blur-3xl" />
      </div>


      <HeaderBar />


      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-5 md:p-6 text-white flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">التقارير ولوحات البيانات</h1>
            <p className="text-white/80 text-sm">ملخصات ديناميكية مبنية على البيانات الحالية</p>
          </div>
        </div>
      </section>


      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10 text-white">


        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mx-3 sm:mx-[1cm]">
          <GlassStat
            title="الكيانات"
            subtitle="إجمالي الكيانات"
            icon={<Building2 className="h-4 w-4" />}
            value={kpis.entities}
          />
          <GlassStat
            title="الأعضاء"
            subtitle="إجمالي الأعضاء"
            icon={<Users className="h-4 w-4" />}
            value={kpis.members}
          />
          <GlassStat
            title="الفعاليات"
            subtitle={`في المدى (${range === "all" ? "كل الوقت" : `آخر ${range} يوم`})`}
            icon={<CalendarDays className="h-4 w-4" />}
            value={kpis.events}
          />
          <GlassStat
            title="نماذج ISO"
            subtitle="إجمالي النماذج"
            icon={<ShieldCheck className="h-4 w-4" />}
            value={kpis.iso}
          />
        </div>


        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="h-4 w-4" /> الفلاتر
            </CardTitle>
            <CardDescription className="text-white/80">طبّق فلاتر عامة على التقارير</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="المدى الزمني">
                <Select value={range} onValueChange={(v: RangeKey) => setRange(v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="اختر المدى" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">آخر 7 أيام</SelectItem>
                    <SelectItem value="30">آخر 30 يوم</SelectItem>
                    <SelectItem value="90">آخر 90 يوم</SelectItem>
                    <SelectItem value="all">كل الوقت</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="الكيان">
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="كل الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {entities.map((e, i) => (
                      <SelectItem key={e?.id ?? i} value={e?.id ?? ""}>{e?.name ?? "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="بحث">
                <Input
                  placeholder="ابحث باسم كيان/عضو/فعالية/نموذج..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>
            </div>
          </CardContent>
        </GlassCard>


        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="px-5 pt-5">
            <CardTitle className="text-white">أعلى الكيانات نشاطًا</CardTitle>
            <CardDescription className="text-white/80">
              مجموع (أعضاء + فعاليات + ISO) بعد تطبيق الفلاتر
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {byEntity.length === 0 ? (
              <div className="text-center text-white/70 py-8">لا توجد بيانات للعرض</div>
            ) : (
              byEntity.map((row) => {
                const total = row.members + row.events + row.iso
                return (
                  <div key={row.entityId} className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
                    <div className="md:col-span-1">
                      <div className="font-semibold text-white">{row.name}</div>
                      <div className="text-xs text-white/80">إجمالي: {total}</div>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-white/85">
                        <span>أعضاء ({row.members})</span>
                        <span>فعاليات ({row.events})</span>
                        <span>ISO ({row.iso})</span>
                      </div>
                      <GlassBar value={total} max={maxEntityMetric} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </GlassCard>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-3 sm:mx-[1cm]">
          <GlassCard>
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-white">توزيع حالات الفعاليات</CardTitle>
              <CardDescription className="text-white/80">بعد تطبيق الفلاتر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {(["draft","approved","cancelled","done"] as const).map((st) => {
                const v = eventStatusDist[st] || 0
                const max = Math.max(1, ...Object.values(eventStatusDist))
                return (
                  <div key={st}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">
                        {st === "draft" ? "مسودة" :
                         st === "approved" ? "معتمد" :
                         st === "cancelled" ? "ملغي" : "منفذ"}
                      </span>
                      <Badge variant="secondary">{v}</Badge>
                    </div>
                    <GlassBar value={v} max={max} />
                  </div>
                )
              })}
            </CardContent>
          </GlassCard>

          <GlassCard>
            <CardHeader className="px-5 pt-5">
              <CardTitle className="text-white">توزيع حالات نماذج ISO</CardTitle>
              <CardDescription className="text-white/80">بعد تطبيق الفلاتر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {(["draft","submitted","review","approved","rejected"] as const).map((st) => {
                const v = isoStatusDist[st] || 0
                const max = Math.max(1, ...Object.values(isoStatusDist))
                return (
                  <div key={st}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">
                        {st === "draft" ? "مسودة" :
                         st === "submitted" ? "مُقدَّم" :
                         st === "review" ? "قيد المراجعة" :
                         st === "approved" ? "معتمد" : "مرفوض"}
                      </span>
                      <Badge variant="secondary">{v}</Badge>
                    </div>
                    <GlassBar value={v} max={max} />
                  </div>
                )
              })}
            </CardContent>
          </GlassCard>
        </div>

        <Separator className="opacity-0" />
      </main>
    </div>
  )
}



function HeaderBar() {
  const pathname = usePathname()
  const linkCls = (href: string) =>
    `px-3 py-1 rounded-lg transition ${pathname === href ? "bg-white/15 text-white" : "text-white/85 hover:text-white"}`
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={linkCls("/")}>الرئيسية</Link>
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
            <Link href="/dashboard" className={linkCls("/dashboard")}>لوحة التحكم</Link>
            <Link href="/reports" className={linkCls("/reports")}>التقارير</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 text-white ${className}`}>
      {children}
    </div>
  )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-white/90 text-sm">{label}</span>
      {children}
    </label>
  )
}

function GlassStat({
  title,
  subtitle,
  icon,
  value,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  value: number | string
}) {
  return (
    <div className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 text-white p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm text-white/85">{title}</div>
          <div className="text-xs text-white/70">{subtitle}</div>
        </div>
        <div className="h-9 w-9 rounded-xl bg-white/15 grid place-items-center ring-1 ring-white/20">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-extrabold">{value}</div>
    </div>
  )
}

function GlassBar({ value = 0, max = 1 }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden ring-1 ring-white/20">
      <div className="h-full bg-white" style={{ width: `${pct}%` }} />
    </div>
  )
}
