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
import { Building2, Save, Edit2, Search, Users } from "lucide-react"

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
      [e.name, e.type, e.location, e.phone, e.contactEmail]
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
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">إدارة الكيانات</h1>
              <p className="text-white/80 text-sm">إنشاء وتحديث بيانات الكيانات، المستندات، التواصل والموقع</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full bg-white/15 ring-1 ring-white/25 text-white/95 flex items-center">
            {list.length} كيان
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10 text-white">
        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5" />
              {editingId ? "تعديل كيان" : "إضافة كيان جديد"}
            </CardTitle>
            <CardDescription className="text-white/80">
              {editingId ? "يمكنك تعديل بيانات الكيان ثم الضغط حفظ" : "أدخل بيانات الكيان ثم اضغط حفظ"}
            </CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px bg-white/15" />

          <CardContent className="px-5 pb-5">
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="اسم الكيان">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="نوع الكيان">
                <Input
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="هاتف التواصل">
                <Input
                  id="phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="البريد الإلكتروني">
                <Input
                  id="email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="المدينة">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="العنوان">
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="gap-2 h-11 rounded-full bg-white text-slate-900 font-semibold">
                  <Save className="h-4 w-4" />
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm} className="h-11 rounded-full">
                    إلغاء التعديل
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </GlassCard>

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="text-white">قائمة الكيانات</CardTitle>
            <CardDescription className="text-white/80">ابحث أو حرر أي كيان</CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ابحث بالاسم/المدينة/البريد..."
                  className="pr-9 h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" onClick={() => setSearch("")} className="h-11 rounded-full">
                مسح
              </Button>
            </div>

            {loading ? (
              <div className="h-24 rounded-2xl bg-white/20 ring-1 ring-white/20 animate-pulse" />
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-white/70">لا توجد كيانات بعد</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-white">{e.name}</div>
                      <div className="text-xs text-white/80">
                        {e.type ? `${e.type} • ` : ""}
                        {e.location || "-"} • {e.phone || "-"} • {e.contactEmail || "-"}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full bg-white text-slate-900 hover:bg-white"
                      onClick={() => onEdit(e)}
                    >
                      <Edit2 className="h-4 w-4" />
                      تحرير
                    </Button>
                  </li>
                ))}
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
              <Users className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={linkCls("/")}>الرئيسية</Link>
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
            <Link href="/dashboard" className={linkCls("/dashboard")}>لوحة التحكم</Link>
            <Link href="/entities" className={linkCls("/entities")}>الكيانات</Link>
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
