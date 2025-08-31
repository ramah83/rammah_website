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
import { Users, UserPlus, Building2, Search, Plus } from "lucide-react"
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
  name: string
  email: string
  phone: string
  roleInEntity: string
}

export default function MembersPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [entities, setEntities] = useState<any[]>([])
  const [list, setList] = useState<any[]>([])

  const [filterEntity, setFilterEntity] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<FormState>({
    entityId: "",
    name: "",
    email: "",
    phone: "",
    roleInEntity: "",
  })

  useEffect(() => {
    const s = localStorage.getItem("session")
    if (!s) {
      router.push("/")
      return
    }
    const parsed: Session = JSON.parse(s)
    if (!["systemAdmin", "entityManager"].includes(parsed.role)) {
      router.push("/dashboard")
      return
    }
    setSession(parsed)
  }, [router])

  useEffect(() => {
    try {
      const ents = dataStore?.listEntities?.() ?? []
      setEntities(ents)

      const members = dataStore?.listMembers?.() ?? []
      setList(members)

      if (ents.length && !form.entityId) {
        const defaultEnt =
          (ents.find((e: any) => e.id === session?.entityId)?.id as string | undefined) ||
          (ents[0]?.id as string | undefined)
        if (defaultEnt) {
          setForm((p) => ({ ...p, entityId: defaultEnt }))
        }
      }
      if (session?.entityId) {
        setFilterEntity(session.entityId)
      }
    } catch {
      setEntities([])
      setList([])
    }
  }, [session])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (list || [])
      .filter((m) => (filterEntity === "all" ? true : m.entityId === filterEntity))
      .filter((m) => {
        if (!q) return true
        const hay = [m.name, m.email, m.phone, m.roleInEntity].filter(Boolean).join(" ").toLowerCase()
        return hay.includes(q)
      })
  }, [list, filterEntity, search])

  if (!session) return null

  const resetForm = () =>
    setForm({
      entityId: session?.entityId || entities[0]?.id || "",
      name: "",
      email: "",
      phone: "",
      roleInEntity: "",
    })

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.entityId) return alert("اختر الكيان")
    if (!form.name.trim()) return alert("اسم العضو مطلوب")

    setSaving(true)
    try {
      dataStore.createMember({
        entityId: form.entityId,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
      })
      setList([...(dataStore?.listMembers?.() ?? [])])
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة الأعضاء</h1>
            <p className="text-gray-600">تسجيل الأعضاء وربطهم بالكيانات</p>
          </div>
          <Badge variant="secondary" className="text-sm flex items-center gap-1">
            <Users className="h-4 w-4" />
            {list.length} عضو
          </Badge>
        </div>

        {/* النموذج */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              إضافة عضو جديد
            </CardTitle>
            <CardDescription>أدخل بيانات العضو واختر الكيان التابع له</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الكيان</Label>
                <Select
                  value={form.entityId}
                  onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))}
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
                <Label htmlFor="name">اسم العضو</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleInEntity">دور العضو داخل الكيان</Label>
                <Input
                  id="roleInEntity"
                  value={form.roleInEntity}
                  onChange={(e) => setForm((p) => ({ ...p, roleInEntity: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <>جارٍ الحفظ...</>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      إضافة
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  مسح الحقول
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* الفلاتر + القائمة */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>قائمة الأعضاء</CardTitle>
            <CardDescription>فلترة حسب الكيان أو البحث بالاسم/البريد/الهاتف</CardDescription>
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
                    placeholder="ابحث بالاسم/البريد/الهاتف..."
                    className="pr-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">لا يوجد أعضاء لعرضهم</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((m) => {
                  const ent = entities.find((e) => e.id === m.entityId)
                  return (
                    <li key={m.id} className="p-3 rounded border bg-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-100 text-blue-700 w-8 h-8 grid place-items-center">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-gray-500">
                            {m.email || "-"} • {m.phone || "-"}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Building2 className="h-3 w-3" />
                          <span>{ent?.name || "بدون كيان"}</span>
                        </div>
                        {m.roleInEntity && <div className="mt-1">الدور: {m.roleInEntity}</div>}
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
