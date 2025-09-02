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
  const [errMsg, setErrMsg] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  const readArray = (data: any) =>
    Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.entities)
          ? data.entities
          : Array.isArray(data?.members)
            ? data.members
            : Array.isArray(data?.events)
              ? data.events
              : []

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/entities failed")
      return readArray(await res.json())
    },
    getMembers: async () => {
      const res = await fetch("/api/members", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/members failed")
      return readArray(await res.json())
    },
    getEvents: async () => {
      const res = await fetch("/api/events", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/events failed")
      return readArray(await res.json())
    },
    getISO: async () => {
      const res = await fetch("/api/iso", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/iso failed")
      return readArray(await res.json())
    },
  }

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
    let mounted = true
    ;(async () => {
      setLoading(true); setErrMsg("")
      try {
        const [ents, mems, evs, isoItems] = await Promise.all([
          api.getEntities(),
          api.getMembers(),
          api.getEvents(),
          api.getISO(),
        ])
        if (!mounted) return
        setEntities(ents)
        setMembers(mems)
        setEvents(evs)
        setISO(isoItems)
      } catch (e: any) {
        if (!mounted) return
        setErrMsg(e?.message || "تعذّر تحميل البيانات")
        setEntities([]); setMembers([]); setEvents([]); setISO([])
      } finally {
        mounted && setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!session || entityFilter !== "all") return
    if (session.entityId) setEntityFilter(session.entityId)
  }, [session]) 

  const withinRange = (dateStr?: string) => {
    if (!dateStr) return true
    if (range === "all") return true
    const days = Number(range)
    const d = new Date(dateStr).getTime()
    if (Number.isNaN(d)) return false
    const limit = Date.now() - days * 24 * 60 * 60 * 1000
    return d >= limit
  }

  const filtered = useMemo(() => {
    const filterByEntity = (entityId?: string) => (entityFilter === "all" ? true : (entityId ?? "") === entityFilter)
    const q = search.trim().toLowerCase()

    const ents = (entities || []).filter((e) => (q ? String(e.name ?? "").toLowerCase().includes(q) : true))

    const mems = (members || [])
      .filter((m) => filterByEntity(m.entityId))
      .filter((m) => q ? [m.name, m.email, m.phone].filter(Boolean).join(" ").toLowerCase().includes(q) : true)

    const evs = (events || [])
      .filter((ev) => filterByEntity(ev.entityId))
      .filter((ev) => withinRange(ev.date))
      .filter((ev) => (q ? [ev.title, ev.status].join(" ").toLowerCase().includes(q) : true))

    const isoForms = (iso || [])
      .filter((f) => filterByEntity(f.ownerEntityId))
      .filter((f) => q ? [f.title, f.code, f.status].filter(Boolean).join(" ").toLowerCase().includes(q) : true)

    return { ents, mems, evs, isoForms }
  }, [entities, members, events, iso, entityFilter, range, search])

  const kpis = useMemo(
    () => ({ entities: filtered.ents.length, members: filtered.mems.length, events: filtered.evs.length, iso: filtered.isoForms.length }),
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
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>التقارير ولوحات البيانات</h1>
            <p className="text-sm" style={{ color: "#6B6B6B" }}>{errMsg ? errMsg : "ملخصات ديناميكية مبنية على البيانات الحالية"}</p>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: "#1D1D1D" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mx-3 sm:mx-[1cm]">
          <SurfaceStat title="الكيانات" subtitle="إجمالي الكيانات" icon={<Building2 className="h-4 w-4" color="#1D1D1D" />} value={kpis.entities} />
          <SurfaceStat title="الأعضاء" subtitle="إجمالي الأعضاء" icon={<Users className="h-4 w-4" color="#1D1D1D" />} value={kpis.members} />
          <SurfaceStat title="الفعاليات" subtitle={`في المدى (${range === "all" ? "كل الوقت" : `آخر ${range} يوم`})`} icon={<CalendarDays className="h-4 w-4" color="#1D1D1D" />} value={kpis.events} />
          <SurfaceStat title="نماذج ISO" subtitle="إجمالي النماذج" icon={<ShieldCheck className="h-4 w-4" color="#1D1D1D" />} value={kpis.iso} />
        </div>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" color="#1D1D1D" /> الفلاتر
            </CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>طبّق فلاتر عامة على التقارير</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="المدى الزمني">
                <Select value={range} onValueChange={(v: RangeKey) => setRange(v)}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
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
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
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
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>
            </div>
          </CardContent>
        </SurfaceCard>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="px-5 pt-5">
            <CardTitle>أعلى الكيانات نشاطًا</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>مجموع (أعضاء + فعاليات + ISO) بعد تطبيق الفلاتر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {byEntity.length === 0 ? (
              <div className="text-center py-8" style={{ color: "#7A7A7A" }}>{loading ? "جارٍ التحميل..." : "لا توجد بيانات للعرض"}</div>
            ) : (
              byEntity.map((row) => {
                const total = row.members + row.events + row.iso
                return (
                  <div key={row.entityId} className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
                    <div className="md:col-span-1">
                      <div className="font-semibold" style={{ color: "#1D1D1D" }}>{row.name}</div>
                      <div className="text-xs" style={{ color: "#6B6B6B" }}>إجمالي: {total}</div>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <div className="flex items-center justify-between text-xs" style={{ color: "#6B6B6B" }}>
                        <span>أعضاء ({row.members})</span>
                        <span>فعاليات ({row.events})</span>
                        <span>ISO ({row.iso})</span>
                      </div>
                      <SurfaceBar value={total} max={maxEntityMetric} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </SurfaceCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-3 sm:mx-[1cm]">
          <SurfaceCard>
            <CardHeader className="px-5 pt-5">
              <CardTitle>توزيع حالات الفعاليات</CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>بعد تطبيق الفلاتر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {(["draft","approved","cancelled","done"] as const).map((st) => {
                const v = eventStatusDist[st] || 0
                const max = Math.max(1, ...Object.values(eventStatusDist))
                return (
                  <div key={st}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>
                        {st === "draft" ? "مسودة" :
                         st === "approved" ? "معتمد" :
                         st === "cancelled" ? "ملغي" : "منفذ"}
                      </span>
                      <Badge variant="secondary">{v}</Badge>
                    </div>
                    <SurfaceBar value={v} max={max} />
                  </div>
                )
              })}
            </CardContent>
          </SurfaceCard>

          <SurfaceCard>
            <CardHeader className="px-5 pt-5">
              <CardTitle>توزيع حالات نماذج ISO</CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>بعد تطبيق الفلاتر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {(["draft","submitted","review","approved","rejected"] as const).map((st) => {
                const v = isoStatusDist[st] || 0
                const max = Math.max(1, ...Object.values(isoStatusDist))
                return (
                  <div key={st}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>
                        {st === "draft" ? "مسودة" :
                         st === "submitted" ? "مُقدَّم" :
                         st === "review" ? "قيد المراجعة" :
                         st === "approved" ? "معتمد" : "مرفوض"}
                      </span>
                      <Badge variant="secondary">{v}</Badge>
                    </div>
                    <SurfaceBar value={v} max={max} />
                  </div>
                )
              })}
            </CardContent>
          </SurfaceCard>
        </div>

        <Separator className="opacity-0" />
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
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Building2 className="h-5 w-5" color="#1D1D1D" />
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
              { href: "/reports", label: "التقارير" },
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

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  )
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-sm" style={{ color: "#1D1D1D" }}>{label}</span>
      {children}
    </label>
  )
}

function SurfaceStat({ title, subtitle, icon, value }: { title: string; subtitle: string; icon: React.ReactNode; value: number | string }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-sm" style={{ color: "#6B6B6B" }}>{title}</div>
          <div className="text-xs" style={{ color: "#7A7A7A" }}>{subtitle}</div>
        </div>
        <div className="h-9 w-9 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
          {icon}
        </div>
      </div>
      <div className="mt-3 text-2xl font-extrabold" style={{ color: "#1D1D1D" }}>{value}</div>
    </div>
  )
}

function SurfaceBar({ value = 0, max = 1 }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F1EFEA", border: "1px solid #E7E2DC" }}>
      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: "#EC1A24" }} />
    </div>
  )
}
