"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  CalendarDays, CalendarPlus, Search, Users, Building2,
} from "lucide-react"
import { dataStore } from "@/lib/data-store"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
}

type FormState = {
  entityId: string
  title: string
  date: string
  capacity: string
  status: "draft" | "approved" | "cancelled" | "done"
}

const statusLabel: Record<FormState["status"], string> = {
  draft: "مسودة",
  approved: "معتمد",
  cancelled: "ملغي",
  done: "منفذ",
}

const statusStyle: Record<FormState["status"], string> = {
  draft: "bg-white/10 text-white/90 ring-1 ring-white/20",
  approved: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25",
  cancelled: "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/25",
  done: "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/25",
}

export default function EventsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [entities, setEntities] = useState<any[]>([])
  const [list, setList] = useState<any[]>([])

  const [filterEntity, setFilterEntity] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const canCreate = (role: UserRole) => ["systemAdmin", "entityManager"].includes(role)

  const [form, setForm] = useState<FormState>({
    entityId: "",
    title: "",
    date: "",
    capacity: "",
    status: "draft",
  })

  useEffect(() => {
    const s = localStorage.getItem("session")
    if (!s) {
      router.push("/")
      return
    }
    const parsed: Session = JSON.parse(s)
    setSession(parsed)
  }, [router])

  useEffect(() => {
    try {
      const ents = dataStore?.listEntities?.() ?? []
      setEntities(ents)

      const events = dataStore?.listEvents?.() ?? []
      setList(events)

      const defaultEnt =
        (ents.find((e: any) => e.id === session?.entityId)?.id as string | undefined) ||
        (ents[0]?.id as string | undefined)

      if (defaultEnt) {
        setForm((p) => ({ ...p, entityId: p.entityId || defaultEnt }))
      }
      if (session?.entityId) setFilterEntity(session.entityId)
    } catch {
      setEntities([])
      setList([])
    }
  }, [session])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (list || [])
      .filter((ev) => (filterEntity === "all" ? true : ev.entityId === filterEntity))
      .filter((ev) => {
        if (!q) return true
        const hay = [ev.title, ev.status, ev.date].filter(Boolean).join(" ").toLowerCase()
        return hay.includes(q)
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [list, filterEntity, search])

  if (!session) return null

  const resetForm = () =>
    setForm({
      entityId: session?.entityId || entities[0]?.id || "",
      title: "",
      date: "",
      capacity: "",
      status: "draft",
    })

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate(session.role)) return
    if (!form.entityId) return alert("اختر الكيان")
    if (!form.title.trim()) return alert("عنوان الفعالية مطلوب")
    if (!form.date) return alert("تاريخ الفعالية مطلوب")

    setSaving(true)
    try {
      dataStore.createEvent({
        entityId: form.entityId,
        title: form.title,
        date: form.date,
        status: form.status,
      })
      setList([...(dataStore?.listEvents?.() ?? [])])
      resetForm()
    } catch (err: any) {
      alert(err?.message || "حدث خطأ")
    } finally {
      setSaving(false)
    }
  }

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

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] bg-white/12 backdrop-blur-2xl ring-1 ring-white/25 p-5 md:p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">إدارة الفعاليات</h1>
              <p className="text-white/80 text-sm">جدولة الفعاليات، إدارة الحضور، واستعراض الحالة</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full bg-white/15 ring-1 ring-white/25 text-white/95 flex items-center">
            {list.length} فعالية
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10 text-white">
        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-white">
              <CalendarPlus className="h-5 w-5" />
              إنشاء فعالية جديدة
            </CardTitle>
            <CardDescription className="text-white/80">أدخل بيانات الفعالية واضغط حفظ</CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px bg-white/15" />

          <CardContent className="px-5 pb-5">
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="الكيان">
                <Select
                  value={form.entityId}
                  onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))}
                  disabled={!canCreate(session.role)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="اختر الكيان" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="عنوان الفعالية">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!canCreate(session.role)}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="التاريخ">
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  disabled={!canCreate(session.role)}
                  className="h-11 rounded-xl bg-white text-slate-900 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="السعة (اختياري)">
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  disabled={!canCreate(session.role)}
                  className="h-11 rounded-xl bg-white text-slate-900 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="الحالة">
                <Select
                  value={form.status}
                  onValueChange={(v: FormState["status"]) => setForm((p) => ({ ...p, status: v }))}
                  disabled={!canCreate(session.role)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="done">منفذ</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!canCreate(session.role) || saving}
                  className="gap-2 h-11 rounded-full bg-white text-slate-900 font-semibold"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {!canCreate(session.role) && (
                  <span className="text-xs text-white/80">لا تملك صلاحية إنشاء فعاليات</span>
                )}
              </div>
            </form>
          </CardContent>
        </GlassCard>

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="text-white">قائمة الفعاليات</CardTitle>
            <CardDescription className="text-white/80">
              فلترة حسب الكيان أو البحث بالعنوان/التاريخ/الحالة
            </CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label="فلتر الكيان">
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="جميع الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Label className="text-white/90 text-sm">بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث بالعنوان/التاريخ/الحالة..."
                    className="pr-9 h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-white/70">لا توجد فعاليات بعد</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((ev) => {
                  const ent = entities.find((e) => e.id === ev.entityId)
                  const attendeesCount = Array.isArray(ev.attendees) ? ev.attendees.length : 0
                  return (
                    <li
                      key={ev.id}
                      className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-4 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-white">{ev.title}</div>
                        <div className="text-xs text-white/80">
                          {new Date(ev.date).toLocaleString("ar-EG")} • {ent?.name || "بدون كيان"}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center h-6 px-2 rounded-full ${statusStyle[ev.status as FormState["status"]]}`}>
                            {statusLabel[ev.status as FormState["status"]]}
                          </span>
                          {typeof ev.capacity === "number" && (
                            <span className="text-white/80">السعة: {ev.capacity}</span>
                          )}
                          <span className="flex items-center gap-1 text-white/80">
                            <Users className="h-3 w-3" />
                            حضور: {attendeesCount}
                          </span>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </GlassCard>
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
              <Building2 className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={linkCls("/")}>الرئيسية</Link>
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
            <Link href="/dashboard" className={linkCls("/dashboard")}>لوحة التحكم</Link>
            <Link href="/events" className={linkCls("/events")}>الفعاليات</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-white/90 text-sm">{label}</span>
      {children}
    </label>
  )
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 text-white ${className}`}>
      {children}
    </div>
  )
}
