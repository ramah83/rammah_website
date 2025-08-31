// app/reports/page.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Users, Building2, CalendarDays, ShieldCheck, Filter } from "lucide-react"
import { dataStore } from "@/lib/data-store"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
}

type RangeKey = "7" | "30" | "90" | "all"

export default function ReportsPage() {
  const router = useRouter()

  // ---- state (كل الhooks هنا فوق) ----
  const [session, setSession] = useState<Session | null>(null)

  const [entities, setEntities] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [iso, setISO] = useState<any[]>([])

  // فلاتر
  const [range, setRange] = useState<RangeKey>("30")
  const [entityFilter, setEntityFilter] = useState<string>("all")
  const [search, setSearch] = useState("")

  // ---- تأكيد الجلسة (بدون return مبكر) ----
  useEffect(() => {
    try {
      const s = localStorage.getItem("session")
      if (!s) {
        setSession(null)
        router.replace("/")
        return
      }
      setSession(JSON.parse(s))
    } catch {
      setSession(null)
      router.replace("/")
    }
  }, [router])

  // ---- تحميل الداتا من dataStore (بدون return) ----
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

  // ---- helpers ثابتة ----
  const withinRange = (dateStr?: string) => {
    if (!dateStr) return true
    if (range === "all") return true
    const days = Number(range)
    const d = new Date(dateStr).getTime()
    const limit = Date.now() - days * 24 * 60 * 60 * 1000
    return d >= limit
  }

  // ---- فلترة حسب الكيان والزمن والبحث (useMemo تُستدعى دائمًا) ----
  const filtered = useMemo(() => {
    const filterByEntity = (entityId?: string) => {
      if (entityFilter === "all") return true
      return (entityId ?? "") === entityFilter
    }
    const q = search.trim().toLowerCase()

    const ents = (entities || []).filter((e) =>
      q ? String(e.name ?? "").toLowerCase().includes(q) : true
    )

    const mems = (members || [])
      .filter((m) => filterByEntity(m.entityId))
      .filter((m) =>
        q
          ? [m.name, m.email, m.phone].filter(Boolean).join(" ").toLowerCase().includes(q)
          : true
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

  // ---- KPIs ----
  const kpis = useMemo(
    () => ({
      entities: filtered.ents.length,
      members: filtered.mems.length,
      events: filtered.evs.length,
      iso: filtered.isoForms.length,
    }),
    [filtered]
  )

  // ---- تجميع حسب الكيان ----
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

  // ---- توزيع الحالات ----
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

  // ---- progress bar بسيط ----
  function Bar({ value = 0, max = 1 }: { value: number; max: number }) {
    const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
      <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
        <div className="h-2 bg-blue-600" style={{ width: `${pct}%` }} />
      </div>
    )
  }

  const maxEntityMetric = Math.max(1, ...byEntity.map((x) => x.members + x.events + x.iso))

  // ---- JSX ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">التقارير ولوحات البيانات</h1>
            <p className="text-gray-600">ملخصات ديناميكية مبنية على البيانات الحالية</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">الكيانات</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" /> إجمالي الكيانات
              </CardDescription>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{kpis.entities}</div></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">الأعضاء</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" /> إجمالي الأعضاء
              </CardDescription>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{kpis.members}</div></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">الفعاليات</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" /> فعاليات في المدى المحدد
              </CardDescription>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{kpis.events}</div></CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-600">نماذج ISO</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" /> إجمالي النماذج
              </CardDescription>
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{kpis.iso}</div></CardContent>
          </Card>
        </div>

        {/* فلاتر عامة */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2"><Filter className="h-4 w-4" /> الفلاتر</CardTitle>
            <CardDescription>طبّق فلاتر عامة على التقارير</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-gray-600 mb-1">المدى الزمني</div>
                <Select value={range} onValueChange={(v: RangeKey) => setRange(v)}>
                  <SelectTrigger><SelectValue placeholder="اختر المدى" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">آخر 7 أيام</SelectItem>
                    <SelectItem value="30">آخر 30 يوم</SelectItem>
                    <SelectItem value="90">آخر 90 يوم</SelectItem>
                    <SelectItem value="all">كل الوقت</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">الكيان</div>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger><SelectValue placeholder="كل الكيانات" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {entities.map((e, i) => (
                      <SelectItem key={e?.id ?? i} value={e?.id ?? ""}>{e?.name ?? "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <div className="text-xs text-gray-600 mb-1">بحث</div>
                <Input
                  placeholder="ابحث باسم كيان/عضو/فعالية/نموذج..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* أعلى الكيانات نشاطًا */}
        <Card>
          <CardHeader>
            <CardTitle>أعلى الكيانات نشاطًا</CardTitle>
            <CardDescription>مجموع (أعضاء + فعاليات + ISO) بعد تطبيق الفلاتر</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byEntity.length === 0 ? (
              <div className="text-center text-gray-500 py-8">لا توجد بيانات للعرض</div>
            ) : (
              byEntity.map((row) => {
                const total = row.members + row.events + row.iso
                return (
                  <div key={row.entityId} className="grid grid-cols-1 md:grid-cols-4 items-center gap-2">
                    <div className="md:col-span-1">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-gray-500">إجمالي: {total}</div>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>أعضاء ({row.members})</span>
                        <span>فعاليات ({row.events})</span>
                        <span>ISO ({row.iso})</span>
                      </div>
                      <Bar value={total} max={maxEntityMetric} />
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* توزيع الحالات */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>توزيع حالات الفعاليات</CardTitle>
              <CardDescription>بعد تطبيق الفلاتر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <Bar value={v} max={max} />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>توزيع حالات نماذج ISO</CardTitle>
              <CardDescription>بعد تطبيق الفلاتر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                    <Bar value={v} max={max} />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <Separator className="opacity-0" />
      </div>
    </div>
  )
}
