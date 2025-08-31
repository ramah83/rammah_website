"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList, FileText, Gavel, Plus, Search, Users } from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null }
type GovType = "policy" | "procedure" | "minutes" | "decision" | "inquiry" | "response"

const typeLabel: Record<GovType, string> = {
  policy: "سياسة/لائحة",
  procedure: "إجراء",
  minutes: "محضر اجتماع",
  decision: "قرار",
  inquiry: "استفسار",
  response: "ردّ",
}

const typeStyle: Record<GovType, string> = {
  policy: "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/25",
  procedure: "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/25",
  minutes: "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25",
  decision: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25",
  inquiry: "bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/25",
  response: "bg-white/10 text-white/90 ring-1 ring-white/20",
}

const typeIcon: Record<GovType, React.ReactElement> = {
  policy: <ClipboardList className="h-3.5 w-3.5" />,
  procedure: <ClipboardList className="h-3.5 w-3.5" />,
  minutes: <FileText className="h-3.5 w-3.5" />,
  decision: <Gavel className="h-3.5 w-3.5" />,
  inquiry: <FileText className="h-3.5 w-3.5" />,
  response: <FileText className="h-3.5 w-3.5" />,
}

type FormState = { type: GovType; title: string; content: string }

export default function GovernancePage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [list, setList] = useState<any[]>([])
  const [filterType, setFilterType] = useState<GovType | "all">("all")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const canCreate = (role: UserRole) => ["systemAdmin", "qualitySupervisor"].includes(role)
  const [form, setForm] = useState<FormState>({ type: "policy", title: "", content: "" })

  useEffect(() => {
    const s = localStorage.getItem("session")
    if (!s) { router.push("/"); return }
    setSession(JSON.parse(s))
  }, [router])

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/governance", { cache: "no-store" })
        const items = await res.json()
        setList(Array.isArray(items) ? items : [])
      } catch {
        setList([])
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (list || [])
      .filter((g: any) => (filterType === "all" ? true : g.type === filterType))
      .filter((g: any) => {
        if (!q) return true
        const hay = [g.title, g.notes, g.type].filter(Boolean).join(" ").toLowerCase()
        return hay.includes(q)
      })
      .sort((a: any, b: any) => {
        const at = (x: any) => (x?.createdAt ? new Date(x.createdAt).getTime() : 0)
        return at(b) - at(a)
      })
  }, [list, filterType, search])

  if (!session) return null

  const resetForm = () => setForm({ type: "policy", title: "", content: "" })

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate(session.role)) return
    if (!form.title.trim()) return alert("العنوان مطلوب")
    if (!form.content.trim()) return alert("المحتوى مطلوب")

    setSaving(true)
    try {
      const res = await fetch("/api/governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          type: form.type,
          notes: form.content.trim(), 
          status: "draft",
          entityId: session?.entityId ?? null,
        }),
      })
      if (!res.ok) throw new Error("فشل الحفظ")

      const listRes = await fetch("/api/governance", { cache: "no-store" })
      setList(await listRes.json())
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
              <Gavel className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">الحوكمة</h1>
              <p className="text-white/80 text-sm">اللوائح، محاضر الاجتماعات، القرارات، وسجل التدقيق</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full bg-white/15 ring-1 ring-white/25 text-white/95 flex items-center">
            {filtered.length} عنصر
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10 text-white">
        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-white">
              <ClipboardList className="h-5 w-5" />
              إضافة سجل حوكمة
            </CardTitle>
            <CardDescription className="text-white/80">أدخل البيانات التالية لإنشاء عنصر حوكمة جديد</CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px bg-white/15" />

          <CardContent className="px-5 pb-5">
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="نوع السجل">
                <Select
                  value={form.type}
                  onValueChange={(v: GovType) => setForm(p => ({ ...p, type: v }))}
                  disabled={!canCreate(session.role)}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">سياسة/لائحة</SelectItem>
                    <SelectItem value="procedure">إجراء</SelectItem>
                    <SelectItem value="minutes">محضر اجتماع</SelectItem>
                    <SelectItem value="decision">قرار</SelectItem>
                    <SelectItem value="inquiry">استفسار</SelectItem>
                    <SelectItem value="response">ردّ</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="العنوان">
                <Input
                  id="title"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  disabled={!canCreate(session.role)}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="المحتوى/الوصف" className="md:col-span-2">
                <textarea
                  id="content"
                  rows={5}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  disabled={!canCreate(session.role)}
                  className="w-full rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400 px-3 py-2"
                  placeholder="اكتب تفاصيل السجل..."
                />
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!canCreate(session.role) || saving}
                  className="gap-2 h-11 rounded-full bg-white text-slate-900 font-semibold"
                >
                  {saving ? "جارٍ الحفظ..." : (<><Plus className="h-4 w-4" />حفظ</>)}
                </Button>
                {!canCreate(session.role) && (
                  <span className="text-xs text-white/80">لا تملك صلاحية إنشاء سجلات حوكمة</span>
                )}
              </div>
            </form>
          </CardContent>
        </GlassCard>

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="text-white">قائمة سجلات الحوكمة</CardTitle>
            <CardDescription className="text-white/80">فلترة حسب النوع أو البحث بالعنوان/المحتوى</CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label="فلتر النوع">
                <Select value={filterType} onValueChange={(v: GovType | "all") => setFilterType(v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="كل الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    <SelectItem value="policy">سياسة/لائحة</SelectItem>
                    <SelectItem value="procedure">إجراء</SelectItem>
                    <SelectItem value="minutes">محضر اجتماع</SelectItem>
                    <SelectItem value="decision">قرار</SelectItem>
                    <SelectItem value="inquiry">استفسار</SelectItem>
                    <SelectItem value="response">ردّ</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2">
                <Label className="text-white/90 text-sm">بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث بالعنوان/المحتوى..."
                    className="pr-9 h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-white/70">لا توجد سجلات حوكمة بعد</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((g: any) => (
                  <li
                    key={g.id}
                    className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-white">{g.title}</div>
                        <div className="text-xs text-white/80">
                          {g.notes || "—"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full ${typeStyle[g.type as GovType]}`}>
                          {typeIcon[g.type as GovType]}
                          {typeLabel[g.type as GovType] ?? g.type}
                        </span>
                        {g.createdAt && (
                          <span className="text-[11px] text-white/70">
                            {new Date(g.createdAt).toLocaleString("ar-EG")}
                          </span>
                        )}
                      </div>
                    </div>
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
            <Link href="/governance" className={linkCls("/governance")}>الحوكمة</Link>
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
