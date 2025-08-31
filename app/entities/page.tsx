"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, Save, Edit2, Search } from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
}

type Entity = {
  id: string
  name: string
  type?: string
  contactEmail?: string
  phone?: string
  location?: string
  documents?: string[]
  createdAt: string
}

type FormState = {
  name: string
  type: string
  contactPhone: string
  contactEmail: string
  city: string
  address: string
}

export default function EntitiesPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [list, setList] = useState<Entity[]>([])
  const [search, setSearch] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    name: "",
    type: "",
    contactPhone: "",
    contactEmail: "",
    city: "",
    address: "",
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadEntities = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/entities", { cache: "no-store" })
      const data: Entity[] = await res.json()
      setList(Array.isArray(data) ? data : [])
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }

  const createEntity = async () => {
    const payload = {
      name: form.name,
      type: form.type || undefined,
      phone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      location: [form.city, form.address].filter(Boolean).join(" - ") || undefined,
      documents: [] as string[],
    }
    await fetch("/api/entities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  }

  const updateEntity = async (id: string) => {
    const payload = {
      id,
      name: form.name,
      type: form.type || undefined,
      phone: form.contactPhone || undefined,
      contactEmail: form.contactEmail || undefined,
      location: [form.city, form.address].filter(Boolean).join(" - ") || undefined,
    }
    await fetch("/api/entities", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  }

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
    loadEntities()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) =>
      [
        e.name,
        e.type,
        e.location,
        e.phone,
        e.contactEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
  }, [list, search])

  if (!session) return null

  const resetForm = () => {
    setEditingId(null)
    setForm({ name: "", type: "", contactPhone: "", contactEmail: "", city: "", address: "" })
  }

  const onEdit = (item: Entity) => {
    setEditingId(item.id)
    const [city = "", address = ""] = (item.location || "").split(" - ")
    setForm({
      name: item.name || "",
      type: item.type || "",
      contactPhone: item.phone || "",
      contactEmail: item.contactEmail || "",
      city,
      address,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      alert("اسم الكيان مطلوب")
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await updateEntity(editingId)
      } else {
        await createEntity()
      }
      await loadEntities()
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة الكيانات</h1>
            <p className="text-gray-600">إنشاء وتحديث بيانات الكيانات، المستندات، التواصل والموقع</p>
          </div>
          <Badge variant="secondary" className="text-sm flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {list.length} كيان
          </Badge>
        </div>

        {/* النموذج */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              {editingId ? "تعديل كيان" : "إضافة كيان جديد"}
            </CardTitle>
            <CardDescription>
              {editingId ? "يمكنك تعديل بيانات الكيان ثم الضغط حفظ" : "أدخل بيانات الكيان ثم اضغط حفظ"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">اسم الكيان</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">نوع الكيان</Label>
                <Input id="type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">هاتف التواصل</Label>
                <Input
                  id="phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    إلغاء التعديل
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* البحث + القائمة */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>قائمة الكيانات</CardTitle>
            <CardDescription>ابحث أو حرر أي كيان</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث بالاسم/المدينة/البريد..."
                  className="pr-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setSearch("")}>
                مسح
              </Button>
            </div>

            {loading ? (
              <div className="h-24 bg-white/60 rounded animate-pulse" />
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">لا توجد كيانات بعد</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((e) => (
                  <li key={e.id} className="p-3 rounded border bg-white flex items-center justify-between">
                    <div>
                      <div className="font-medium">{e.name}</div>
                      <div className="text-xs text-gray-500">
                        {e.type ? `${e.type} • ` : ""}
                        {e.location || "-"} • {e.phone || "-"} • {e.contactEmail || "-"}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(e)}>
                      <Edit2 className="h-4 w-4" />
                      تحرير
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Separator className="opacity-0" />
      </div>
    </div>
  )
}
