"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, CalendarPlus, Building2, Search, Users } from "lucide-react"
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

const statusColor: Record<FormState["status"], string> = {
  draft: "bg-gray-100 text-gray-800",
  approved: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  done: "bg-blue-100 text-blue-800",
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
        capacity: form.capacity ? Number(form.capacity) : undefined,
        attendees: [],
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* العنوان */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة الفعاليات</h1>
            <p className="text-gray-600">جدولة الفعاليات، إدارة الحضور، واستعراض الحالة</p>
          </div>
          <Badge variant="secondary" className="text-sm flex items-center gap-1">
            <CalendarDays className="h-4 w-4" />
            {list.length} فعالية
          </Badge>
        </div>

        {/* النموذج (إنشاء فعالية) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-blue-600" />
              إنشاء فعالية جديدة
            </CardTitle>
            <CardDescription>أدخل بيانات الفعالية واضغط حفظ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الكيان</Label>
                <Select
                  value={form.entityId}
                  onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))}
                  disabled={!canCreate(session.role)}
                >
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">عنوان الفعالية</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!canCreate(session.role)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">التاريخ</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                  disabled={!canCreate(session.role)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">السعة (اختياري)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))}
                  disabled={!canCreate(session.role)}
                />
              </div>

              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: FormState["status"]) => setForm((p) => ({ ...p, status: v }))}
                  disabled={!canCreate(session.role)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                    <SelectItem value="done">منفذ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!canCreate(session.role) || saving} className="gap-2">
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {!canCreate(session.role) && (
                  <span className="text-xs text-gray-500">لا تملك صلاحية إنشاء فعاليات</span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* الفلاتر + القائمة */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>قائمة الفعاليات</CardTitle>
            <CardDescription>فلترة حسب الكيان أو البحث بالعنوان/التاريخ/الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="space-y-2">
                <Label>فلتر الكيان</Label>
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ابحث بالعنوان/التاريخ/الحالة..."
                    className="pr-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">لا توجد فعاليات بعد</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((ev) => {
                  const ent = entities.find((e) => e.id === ev.entityId)
                  const attendeesCount = Array.isArray(ev.attendees) ? ev.attendees.length : 0
                  return (
                    <li key={ev.id} className="p-3 rounded border bg-white flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(ev.date).toLocaleString("ar-EG")} • {ent?.name || "بدون كيان"}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <Badge className={statusColor[ev.status]}>{statusLabel[ev.status]}</Badge>
                          {typeof ev.capacity === "number" && (
                            <span className="text-gray-500">السعة: {ev.capacity}</span>
                          )}
                          <span className="flex items-center gap-1 text-gray-500">
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
        </Card>

        <Separator className="opacity-0" />
      </div>
    </div>
  )
}
