"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Cairo } from "next/font/google"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import DeveloperFooter from "@/components/DeveloperFooter"

import { Users, Building2, CalendarDays, ShieldCheck, Filter } from "lucide-react"

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700", "800"] })

type UserRole = "unionSupervisor" | "entityManager" | "user"
type Session  = { id: string; email: string; name: string; role: UserRole; entityId?: string | null }
type RangeKey = "7" | "30" | "90" | "all"

type EventLite = { id: string; title: string; date?: string | null; status?: string | null; entityId?: string | null }

export default function ReportsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [entities, setEntities] = useState<any[]>([])
  const [members,  setMembers]  = useState<any[]>([])
  const [events,   setEvents]   = useState<EventLite[]>([])
  const [iso,      setISO]      = useState<any[]>([])

  const [range, setRange] = useState<RangeKey>("30")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [search, setSearch]   = useState("")
  const [errMsg, setErrMsg]   = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  const sessionHeaderB64 = () => {
    try {
      const raw = localStorage.getItem("session") || ""
      return raw ? btoa(unescape(encodeURIComponent(raw))) : ""
    } catch { return "" }
  }
  const safeJson = async <T,>(res: Response, fallback: T): Promise<T> => {
    const text = await res.text()
    if (!res.ok) throw new Error(text || res.statusText)
    if (!text) return fallback
    try { return JSON.parse(text) as T } catch { return fallback }
  }
  const safeFetch = (url: string, init: RequestInit = {}) => {
    const h = new Headers(init.headers || {})
    const s = sessionHeaderB64()
    if (s) h.set("x-session-b64", s)
    return fetch(url, { ...init, headers: h, cache: "no-store", credentials: "include" })
  }

  const readArray = (data: any) =>
    Array.isArray(data) ? data
    : Array.isArray(data?.items)     ? data.items
    : Array.isArray(data?.entities)  ? data.entities
    : Array.isArray(data?.members)   ? data.members
    : Array.isArray(data?.events)    ? data.events
    : []

  const api = {
    getEntities: async () => {
      const r = await safeFetch("/api/entities")
      return readArray(await safeJson(r, []))
    },
    getMembers: async () => {
      const r = await safeFetch("/api/members")
      return readArray(await safeJson(r, []))
    },
    getEvents: async () => {
      try {
        const r1 = await safeFetch("/api/events?scope=mine")
        const j1 = await safeJson<any>(r1, [])
        const arr1 = readArray(j1).map(normalizeEvent)
        if (Array.isArray(arr1)) return arr1
      } catch {}
      const r2 = await safeFetch("/api/events")
      const j2 = await safeJson<any>(r2, [])
      return readArray(j2).map(normalizeEvent)
    },
    getISO: async () => {
      const r = await safeFetch("/api/iso")
      return readArray(await safeJson(r, []))
    },
  }

  function normalizeEvent(e: any): EventLite {
    return {
      id: String(e?.id ?? ""),
      title: String(e?.title ?? e?.name ?? "فعالية"),
      date: e?.date ?? null,
      status: e?.status ?? null,
      entityId: e?.entityId ?? null,
    }
  }

  function parseDate(input?: any): number | null {
    if (!input) return null
    if (typeof input === "number") return Number.isNaN(input) ? null : input
    const s = String(input).trim()
    if (!s) return null
    let t = Date.parse(s)
    if (!Number.isNaN(t)) return t
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
    if (m) {
      const [_, y, mo, d] = m
      const mm = String(mo).padStart(2, "0")
      const dd = String(d).padStart(2, "0")
      t = Date.parse(`${y}-${mm}-${dd}T00:00:00`)
      if (!Number.isNaN(t)) return t
    }
    return null
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

  const isManager       = session?.role === "entityManager"
  const defaultEntityId = session?.entityId ? String(session.entityId) : ""
  useEffect(() => {
    if (isManager && defaultEntityId && entityFilter === "all") {
      setEntityFilter(defaultEntityId)
    }
  }, [isManager, defaultEntityId, entityFilter])

  const withinRange = (dateStr?: string | null) => {
    if (!dateStr) return true
    if (range === "all") return true
    const t = parseDate(dateStr)
    if (t == null) return false
    const limit = Date.now() - Number(range) * 24 * 60 * 60 * 1000
    return t >= limit
  }

  const filtered = useMemo(() => {
    const filterByEntity = (eid?: string | null) =>
      entityFilter === "all" ? true : String(eid ?? "") === entityFilter
    const q = search.trim().toLowerCase()

    const ents = (entities || []).filter((e) =>
      q ? String(e.name ?? "").toLowerCase().includes(q) : true
    )

    const mems = (members || [])
      .filter((m) => filterByEntity(m.entityId))
      .filter((m) =>
        q ? [m.name, m.email, m.phone].filter(Boolean).join(" ").toLowerCase().includes(q) : true
      )

    const evs = (events || [])
      .filter((ev) => filterByEntity(ev.entityId))
      .filter((ev) => withinRange(ev.date))
      .filter((ev) =>
        q ? [ev.title, ev.status].filter(Boolean).join(" ").toLowerCase().includes(q) : true
      )

    const isoForms = (iso || [])
      .filter((f) => filterByEntity(f.ownerEntityId))
      .filter((f) =>
        q ? [f.title, f.code, f.status].filter(Boolean).join(" ").toLowerCase().includes(q) : true
      )

    return { ents, mems, evs, isoForms }
  }, [entities, members, events, iso, entityFilter, range, search])

  const today0  = new Date(new Date().toDateString()).getTime()
  const dayMs   = 24 * 60 * 60 * 1000

  const eventsKPIs = useMemo(() => {
    const total = filtered.evs.length
    let upcoming = 0, past = 0, undated = 0
    filtered.evs.forEach(ev => {
      const t = parseDate(ev.date)
      if (t == null) { undated++; return }
      if (t >= today0) upcoming++; else past++
    })
    return { total, upcoming, past, undated }
  }, [filtered.evs, today0])

  const timeDist = useMemo(() => {
    let upcoming7 = 0, upcoming30 = 0, past7 = 0, past30 = 0, undated = 0
    filtered.evs.forEach(ev => {
      const t = parseDate(ev.date)
      if (t == null) { undated++; return }
      const diffDays = Math.floor((t - today0) / dayMs)
      if (diffDays >= 0 && diffDays <= 7) upcoming7++
      else if (diffDays > 7 && diffDays <= 30) upcoming30++
      else if (diffDays < 0 && diffDays >= -7) past7++
      else if (diffDays < -7 && diffDays >= -30) past30++
    })
    return { upcoming7, upcoming30, past7, past30, undated }
  }, [filtered.evs, today0])

  const upcomingList = useMemo(() => {
    return [...filtered.evs]
      .map(ev => ({ ev, t: parseDate(ev.date) }))
      .filter(x => x.t != null && x.t >= today0)
      .sort((a, b) => (a.t! - b.t!))
      .slice(0, 6)
      .map(x => x.ev)
  }, [filtered.evs, today0])

  const recentList = useMemo(() => {
    return [...filtered.evs]
      .map(ev => ({ ev, t: parseDate(ev.date) }))
      .filter(x => x.t != null && x.t < today0)
      .sort((a, b) => (b.t! - a.t!))
      .slice(0, 6)
      .map(x => x.ev)
  }, [filtered.evs, today0])

  const kpis = useMemo(
    () => ({
      entities: filtered.ents.length,
      members:  filtered.mems.length,
      events:   filtered.evs.length,
      iso:      filtered.isoForms.length,
    }),
    [filtered]
  )

  const byEntity = useMemo(() => {
    const nameOf = (id?: string | null) => entities.find((e) => e.id === id)?.name || "غير محدد"
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
      .sort((a, b) => b.events - a.events || (b.members + b.iso) - (a.members + a.iso))
      .slice(0, 6)
  }, [filtered, entities])

  const isoStatusDist = useMemo(() => {
    const dist: Record<string, number> = { draft: 0, submitted: 0, review: 0, approved: 0, rejected: 0, unknown: 0 }
    filtered.isoForms.forEach((f) => {
      const st = (f.status as string) || "unknown"
      dist[st] = (dist[st] || 0) + 1
    })
    return dist
  }, [filtered.isoForms])

  const maxEntityMetric = Math.max(1, ...byEntity.map((x) => x.events))

  if (!session) return null

  const today0Date = new Date(today0)
  const day_Ms = 24 * 60 * 60 * 1000
const daysFromNowText = (dateStr?: string | null) => {
  const t = parseDate(dateStr)
  if (t == null) return "بدون تاريخ"
  const diff = Math.floor((t - today0) / day_Ms) 
  if (diff === 0) return "اليوم"
  if (diff === 1) return "غدًا"
  if (diff > 1) return `بعد ${diff} يوم`
  if (diff === -1) return "أمس"
  return `قبل ${Math.abs(diff)} يوم`
}
  return (
    <div dir="rtl" className={`${cairo.className} relative min-h-screen overflow-hidden flex flex-col`} style={{ backgroundColor: "#EFE6DE" }}>
      {/* Animated Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full opacity-10 animate-pulse" style={{ background: "radial-gradient(circle, #EC1A24 0%, transparent 70%)", animation: "float 8s ease-in-out infinite" }} />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full opacity-10 animate-pulse" style={{ background: "radial-gradient(circle, #EC1A24 0%, transparent 70%)", animation: "float 10s ease-in-out infinite reverse" }} />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full opacity-5" style={{ background: "radial-gradient(circle, #1D1D1D 0%, transparent 70%)", animation: "float 12s ease-in-out infinite", transform: "translate(-50%, -50%)" }} />
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scaleIn 0.5s ease-out forwards;
        }
      `}</style>

      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8 animate-slide-up">
        <div 
          className="rounded-[28px] p-8 md:p-10 relative overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl"
          style={{ 
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 24px 48px rgba(0,0,0,0.12)"
          }}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(236,26,36,0.05) 0%, transparent 70%)" }} />
          
          <div className="relative z-10 flex items-center gap-6">
            <div 
              className="h-20 w-20 rounded-3xl flex items-center justify-center relative group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"
              style={{ 
                background: "linear-gradient(135deg, #EC1A24 0%, #C41820 100%)",
                boxShadow: "0 12px 24px rgba(236,26,36,0.4)"
              }}
            >
              <CalendarDays className="h-10 w-10" color="#FFFFFF" />
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%)" }} />
            </div>
            
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-2" style={{ color: "#1D1D1D" }}>
                التقارير ولوحات البيانات
              </h1>
              <p className="text-base md:text-lg" style={{ color: "#6B6B6B" }}>
                {errMsg ? errMsg : "ملخصات ديناميكية مبنية على البيانات الحالية"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: "#1D1D1D" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mx-3 sm:mx-[1cm]">
          <SurfaceStat title="الكيانات"  subtitle="إجمالي الكيانات"                      icon={<Building2 className="h-4 w-4" color="#1D1D1D" />} value={kpis.entities} />
          <SurfaceStat title="الأعضاء"   subtitle="إجمالي الأعضاء"                       icon={<Users className="h-4 w-4" color="#1D1D1D" />}      value={kpis.members} />
          <SurfaceStat title="الفعاليات" subtitle={`في المدى (${range === "all" ? "كل الوقت" : `آخر ${range} يوم`})`} icon={<CalendarDays className="h-4 w-4" color="#1D1D1D" />} value={kpis.events} />
          <SurfaceStat title="نماذج ISO" subtitle="إجمالي النماذج"                       icon={<ShieldCheck className="h-4 w-4" color="#1D1D1D" />} value={kpis.iso} />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-3 sm:mx-[1cm]">
          <SurfaceStat title="ملخص الفعاليات" subtitle="إجمالي في الفلاتر الحالية" icon={<CalendarDays className="h-4 w-4" color="#1D1D1D" />} value={eventsKPIs.total} />
          <SurfaceStat title="قادمة" subtitle="تاريخ ≥ اليوم" icon={<CalendarDays className="h-4 w-4" color="#1D1D1D" />} value={eventsKPIs.upcoming} />
          <SurfaceStat title="ماضية" subtitle="قبل اليوم" icon={<CalendarDays className="h-4 w-4" color="#1D1D1D" />} value={eventsKPIs.past} />
        </div>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="px-5 pt-5">
            <CardTitle>تفصيل زمني للفعاليات</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>يقيس القرب/البعد عن اليوم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {[
              { label: "قادمة خلال 7 أيام", value: timeDist.upcoming7 },
              { label: "قادمة خلال 30 يوم", value: timeDist.upcoming30 },
              { label: "ماضية (آخر 7 أيام)", value: timeDist.past7 },
              { label: "ماضية (آخر 30 يوم)", value: timeDist.past30 },
              { label: "بدون تاريخ", value: timeDist.undated },
            ].map((row) => {
              const max = Math.max(1, timeDist.upcoming7, timeDist.upcoming30, timeDist.past7, timeDist.past30, timeDist.undated)
              return (
                <div key={row.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{row.label}</span>
                    <Badge variant="secondary">{row.value}</Badge>
                  </div>
                  <SurfaceBar value={row.value} max={max} />
                </div>
              )
            })}
          </CardContent>
        </SurfaceCard>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="px-5 pt-5">
            <CardTitle>أكثر الكيانات من حيث الفعاليات</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>بعد تطبيق الفلاتر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {byEntity.length === 0 ? (
              <div className="text-center py-8" style={{ color: "#7A7A7A" }}>{loading ? "جارٍ التحميل..." : "لا توجد بيانات للعرض"}</div>
            ) : (
              byEntity.map((row) => (
                <div key={row.entityId} className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
                  <div className="md:col-span-1">
                    <div className="font-semibold" style={{ color: "#1D1D1D" }}>{row.name}</div>
                    <div className="text-xs" style={{ color: "#6B6B6B" }}>فعاليات: {row.events}</div>
                  </div>
                  <div className="md:col-span-3">
                    <SurfaceBar value={row.events} max={maxEntityMetric} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </SurfaceCard>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="px-5 pt-5">
            <CardTitle>توزيع حالات نماذج ISO</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>بعد تطبيق الفلاتر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {(["draft","submitted","review","approved","rejected","unknown"] as const).map((st) => {
              const v = (isoStatusDist as any)[st] || 0
              const max = Math.max(1, ...Object.values(isoStatusDist))
              return (
                <div key={st}>
                  <div className="flex items-center justify_between text-sm mb-1">
                    <span>
                      {st === "draft" ? "مسودة" :
                        st === "submitted" ? "مُقدَّم" :
                        st === "review" ? "قيد المراجعة" :
                        st === "approved" ? "معتمد" :
                        st === "rejected" ? "مرفوض" : "غير محدد"}
                    </span>
                    <Badge variant="secondary">{v}</Badge>
                  </div>
                  <SurfaceBar value={v} max={max} />
                </div>
              )
            })}
          </CardContent>
        </SurfaceCard>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-3 sm:mx-[1cm]">
          <SurfaceCard>
            <CardHeader className="px-5 pt-5">
              <CardTitle>أقرب فعاليات قادمة</CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>أقرب 6 فعاليات حسب التاريخ</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {upcomingList.length === 0 ? (
                <div className="text-sm" style={{ color: "#7A7A7A" }}>لا توجد فعاليات قادمة ضمن الفلاتر الحالية</div>
              ) : (
                <ul className="space-y-2">
                  {upcomingList.map((ev) => (
                    <li 
                      key={ev.id} 
                      className="rounded-xl p-3 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer group" 
                      style={{ borderColor:"#E7E2DC", background:"#FFFFFF" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold group-hover:text-[#EC1A24] transition-colors duration-300">{ev.title}</div>
                        <span 
                          className="text-xs px-3 py-1 rounded-full font-semibold transition-all duration-300 group-hover:scale-110" 
                          style={{ 
                            background: "linear-gradient(135deg, #FFF0F0 0%, #FFE2E2 100%)",
                            color:"#EC1A24",
                            border: "1px solid #FFE2E2"
                          }}
                        >
                          {daysFromNowText(ev.date)}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color:"#6B6B6B" }}>
                        {ev.date ? new Date(parseDate(ev.date)!).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" }) : "بدون تاريخ"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </SurfaceCard>

          <SurfaceCard>
            <CardHeader className="px-5 pt-5">
              <CardTitle>أحدث فعاليات منتهية</CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>آخر 6 فعاليات بتاريخ سابق</CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-2">
              {recentList.length === 0 ? (
                <div className="text-sm" style={{ color: "#7A7A7A" }}>لا توجد فعاليات منتهية ضمن الفلاتر الحالية</div>
              ) : (
                <ul className="space-y-2">
                  {recentList.map((ev) => (
                    <li 
                      key={ev.id} 
                      className="rounded-xl p-3 border transition-all duration-300 hover:scale-[1.02] hover:shadow-lg cursor-pointer group" 
                      style={{ borderColor:"#E7E2DC", background:"#FFFFFF" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold group-hover:text-[#EC1A24] transition-colors duration-300">{ev.title}</div>
                        <span 
                          className="text-xs px-3 py-1 rounded-full font-semibold transition-all duration-300 group-hover:scale-110" 
                          style={{ 
                            backgroundColor: "#F6F6F6",
                            color:"#6B6B6B",
                            border: "1px solid #E7E2DC"
                          }}
                        >
                          {daysFromNowText(ev.date)}
                        </span>
                      </div>
                      <div className="text-xs mt-1" style={{ color:"#6B6B6B" }}>
                        {ev.date ? new Date(parseDate(ev.date)!).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo" }) : "بدون تاريخ"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </SurfaceCard>
        </div>

        <Separator className="opacity-0" />
      </main>

      <DeveloperFooter />
    </div>
  )
}

function HeaderBar() {
  const pathname = usePathname()
  const active = (href: string) => pathname === href

  const [displayName, setDisplayName] = useState<string>("")

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session") || ""
      const s = raw ? JSON.parse(raw) : {}
      setDisplayName((s?.name || "").trim())
    } catch { setDisplayName("") }
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "session") {
        try {
          const s = e.newValue ? JSON.parse(e.newValue) : {}
          setDisplayName((s?.name || "").trim())
        } catch {}
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  return (
    <header className="relative z-[100001]">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-16 w-full rounded-2xl flex items-center justify-between px-5 transition-all duration-300 hover:scale-[1.01] hover:shadow-2xl"
          style={{ 
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)"
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="h-10 w-10 rounded-xl grid place-items-center transition-all duration-300 hover:rotate-12 hover:scale-110"
              style={{ 
                background: "linear-gradient(135deg, #EC1A24 0%, #C41820 100%)",
                boxShadow: "0 4px 12px rgba(236,26,36,0.3)"
              }}
            >
              <Building2 className="h-5 w-5" color="#FFFFFF" />
            </div>
            <Link href="/" className="font-bold text-lg" style={{ color: "#1D1D1D" }}>
              منصة الكيانات الشبابية
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {[
                { href: "/", label: "الرئيسية" },
                { href: "/about", label: "عن المنصة" },
                { href: "/support", label: "الدعم" },
                { href: "/dashboard", label: "لوحة التحكم" },
                { href: "/reports",  label: "التقارير" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-4 py-2 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
                  style={{ 
                    color: active(l.href) ? "#FFFFFF" : "#1D1D1D",
                    background: active(l.href) ? "linear-gradient(135deg, #EC1A24 0%, #C41820 100%)" : "transparent",
                    boxShadow: active(l.href) ? "0 4px 12px rgba(236,26,36,0.3)" : "none"
                  }}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  )
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div 
      className={`rounded-2xl relative overflow-hidden group transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl animate-slide-up ${className}`}
      style={{ 
        backgroundColor: "#FFFFFF",
        border: "1px solid #E7E2DC",
        boxShadow: "0 12px 24px rgba(0,0,0,0.08)"
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "radial-gradient(circle at top right, rgba(236,26,36,0.03) 0%, transparent 70%)" }} />
      
      {/* 3D depth effect */}
      <div className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none blur-xl" style={{ background: "linear-gradient(135deg, rgba(236,26,36,0.1) 0%, transparent 100%)", zIndex: -1 }} />
      
      <div className="relative z-10" style={{ color: "#1D1D1D" }}>
        {children}
      </div>
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
    <div 
      className="rounded-2xl p-5 relative overflow-hidden group transition-all duration-500 hover:scale-105 hover:-translate-y-2 cursor-pointer animate-scale-in"
      style={{ 
        backgroundColor: "#FFFFFF",
        border: "1px solid #E7E2DC",
        boxShadow: "0 12px 24px rgba(0,0,0,0.08)"
      }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(236,26,36,0.05) 0%, transparent 100%)" }} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold" style={{ color: "#1D1D1D" }}>{title}</div>
            <div className="text-xs" style={{ color: "#6B6B6B" }}>{subtitle}</div>
          </div>
          <div 
            className="h-12 w-12 rounded-xl grid place-items-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-500"
            style={{ 
              background: "linear-gradient(135deg, #FFF0F0 0%, #FFE2E2 100%)",
              border: "1px solid #FFE2E2",
              boxShadow: "0 4px 12px rgba(236,26,36,0.15)"
            }}
          >
            <div style={{ color: "#EC1A24" }}>{icon}</div>
          </div>
        </div>
        <div className="text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>{value}</div>
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden pointer-events-none">
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(236,26,36,0.1) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
        </div>
      </div>
    </div>
  )
}

function SurfaceBar({ value = 0, max = 1 }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="w-full h-3 rounded-full overflow-hidden relative" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E7E2DC" }}>
      <div 
        className="h-full transition-all duration-1000 ease-out relative overflow-hidden"
        style={{ 
          width: `${pct}%`,
          background: "linear-gradient(90deg, #EC1A24 0%, #FF6B6B 100%)",
          boxShadow: "0 2px 8px rgba(236,26,36,0.3)"
        }}
      >
        {/* Animated shimmer effect */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)", animation: "shimmer 2s infinite" }} />
      </div>
    </div>
  )
}
