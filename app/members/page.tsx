"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Users, UserPlus, Building2, Search } from "lucide-react"
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
    if (!s) { router.push("/"); return }
    const parsed: Session = JSON.parse(s)
    if (!["systemAdmin", "entityManager"].includes(parsed.role)) { router.push("/dashboard"); return }
    setSession(parsed)
  }, [router])

  useEffect(() => {
    try {
      const ents = dataStore?.listEntities?.() ?? []
      setEntities(ents)

      const members = dataStore?.listMembers?.() ?? []
      setList(members)

      if (ents.length && !form.entityId) {
        const def =
          ents.find((e: any) => e.id === session?.entityId)?.id ??
          ents[0]?.id
        if (def) setForm(p => ({ ...p, entityId: def }))
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
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">إدارة الأعضاء</h1>
              <p className="text-white/80 text-sm">تسجيل الأعضاء وربطهم بالكيانات</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full bg-white/15 ring-1 ring-white/25 text-white/95 flex items-center">
            {list.length} عضو
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10 text-white">

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-white">
              <UserPlus className="h-5 w-5" />
              إضافة عضو جديد
            </CardTitle>
            <CardDescription className="text-white/80">أدخل بيانات العضو واختر الكيان التابع له</CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px bg-white/15" />

          <CardContent className="px-5 pb-5">
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="الكيان">
                <Select value={form.entityId} onValueChange={(v) => setForm((p) => ({ ...p, entityId: v }))}>
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="اختر الكيان" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="اسم العضو">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="البريد الإلكتروني">
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="رقم الهاتف">
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="دور العضو داخل الكيان" className="md:col-span-2">
                <Input
                  id="roleInEntity"
                  value={form.roleInEntity}
                  onChange={(e) => setForm((p) => ({ ...p, roleInEntity: e.target.value }))}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={saving} className="gap-2 h-11 rounded-full bg-white text-slate-900 font-semibold">
                  {saving ? "جارٍ الحفظ..." : "إضافة"}
                </Button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-11 px-5 rounded-full bg-white/14 hover:bg-white/22 ring-1 ring-white/25 hover:ring-white/40 text-white transition"
                >
                  مسح الحقول
                </button>
              </div>
            </form>
          </CardContent>
        </GlassCard>

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="text-white">قائمة الأعضاء</CardTitle>
            <CardDescription className="text-white/80">فلترة حسب الكيان أو البحث بالاسم/البريد/الهاتف</CardDescription>
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
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Label className="text-white/90 text-sm">بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث بالاسم/البريد/الهاتف..."
                    className="pr-9 h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-white/70">لا يوجد أعضاء لعرضهم</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((m) => {
                  const ent = entities.find((e) => e.id === m.entityId)
                  return (
                    <li
                      key={m.id}
                      className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white/15 h-10 w-10 grid place-items-center ring-1 ring-white/20">
                            <Users className="h-5 w-5 text-white/90" />
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-xs text-white/80">{m.email || "—"} • {m.phone || "—"}</div>
                          </div>
                        </div>
                        <div className="text-xs text-white/80 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Building2 className="h-3 w-3" />
                            <span>{ent?.name || "بدون كيان"}</span>
                          </div>
                          {m.roleInEntity && <div className="mt-1">الدور: {m.roleInEntity}</div>}
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
              <Users className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={linkCls("/")}>الرئيسية</Link>
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
            <Link href="/dashboard" className={linkCls("/dashboard")}>لوحة التحكم</Link>
            <Link href="/members" className={linkCls("/members")}>الأعضاء</Link>

          </nav>
        </div>
      </div>
    </header>
  )
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
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
