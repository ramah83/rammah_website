"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

import {
  ShieldCheck, FilePlus2, Search, Building2, GitBranch,
  CheckCircle2, XCircle, UploadCloud, Users,
} from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null }
type ISOStatus = "draft" | "submitted" | "review" | "approved" | "rejected"

type FormState = {
  code: string
  title: string
  ownerEntityId: string
  status: ISOStatus
}

const statusLabel: Record<ISOStatus, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
}

const statusStyle: Record<ISOStatus, string> = {
  draft: "bg-white/10 text-white/90 ring-1 ring-white/20",
  submitted: "bg-sky-500/15 text-sky-100 ring-1 ring-sky-400/25",
  review: "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25",
  approved: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25",
  rejected: "bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/25",
}

export default function ISOPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [entities, setEntities] = useState<any[]>([])
  const [list, setList] = useState<any[]>([])

  const [filterEntity, setFilterEntity] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<ISOStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState<string>("")

  const canManage = (role: UserRole) => ["systemAdmin", "qualitySupervisor"].includes(role)

  const [form, setForm] = useState<FormState>({
    code: "",
    title: "",
    ownerEntityId: "",
    status: "draft",
  })

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/entities failed")
      const data = await res.json()
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.entities)) return data.entities
      return []
    },
    getISO: async () => {
      const res = await fetch("/api/iso", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/iso failed")
      const data = await res.json()
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.items)) return data.items
      return []
    },
    createISO: async (payload: { code: string; title: string; status: ISOStatus; ownerEntityId: string }) => {
      const res = await fetch("/api/iso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("POST /api/iso failed")
      return res.json()
    },
    updateISO: async (id: string, payload: { status: ISOStatus; note?: string }) => {
      const res = await fetch(`/api/iso/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("PATCH /api/iso/:id failed")
      return res.json()
    },
  }

  useEffect(() => {
    try {
      const s = localStorage.getItem("session")
      if (!s) { router.push("/"); return }
      setSession(JSON.parse(s))
    } catch {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setErrMsg("")
      try {
        const ents = await api.getEntities()
        const isoItems = await api.getISO()
        if (!mounted) return
        setEntities(ents)
        setList(isoItems)
      } catch (e: any) {
        if (!mounted) return
        setErrMsg(e?.message || "تعذّر تحميل البيانات")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!session) return
    if (form.ownerEntityId) return
    if (!entities.length) return
    const def = entities.find((e: any) => e.id === session.entityId)?.id ?? entities[0].id
    setForm(p => ({ ...p, ownerEntityId: def }))
  }, [session, entities]) 

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (list || [])
      .filter((f: any) => (filterEntity === "all" ? true : f.ownerEntityId === filterEntity))
      .filter((f: any) => (filterStatus === "all" ? true : f.status === filterStatus))
      .filter((f: any) => {
        if (!q) return true
        const hay = [f.code, f.title, f.status].filter(Boolean).join(" ").toLowerCase()
        return hay.includes(q)
      })
  }, [list, filterEntity, filterStatus, search])

  if (!session) return null

  const resetForm = () =>
    setForm({
      code: "",
      title: "",
      ownerEntityId: session?.entityId || entities[0]?.id || "",
      status: "draft",
    })

  const refreshISO = async () => {
    try {
      const iso = await api.getISO()
      setList(Array.isArray(iso) ? iso : [])
    } catch {
      setList([])
    }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage(session.role)) return
    if (!form.code.trim()) return alert("كود النموذج مطلوب")
    if (!form.title.trim()) return alert("عنوان النموذج مطلوب")
    if (!form.ownerEntityId) return alert("اختر الكيان")

    setSaving(true)
    try {
      await api.createISO({
        code: form.code.trim(),
        title: form.title.trim(),
        status: form.status,
        ownerEntityId: form.ownerEntityId,
      })
      await refreshISO()
      resetForm()
    } catch (err: any) {
      alert(err?.message || "حدث خطأ")
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (id: string, next: ISOStatus, note?: string) => {
    try {
      await api.updateISO(id, { status: next, note })
      await refreshISO()
    } catch {
      alert("لم يتم تغيير الحالة")
    }
  }

  const nextActions = (st: ISOStatus) => {
    switch (st) {
      case "draft":
        return [{ key: "submitted", label: "تقديم", icon: <UploadCloud className="h-4 w-4" /> }]
      case "submitted":
        return [{ key: "review", label: "إرسال للمراجعة", icon: <GitBranch className="h-4 w-4" /> }]
      case "review":
        return [
          { key: "approved", label: "اعتماد", icon: <CheckCircle2 className="h-4 w-4" /> },
          { key: "rejected", label: "رفض", icon: <XCircle className="h-4 w-4" /> },
        ]
      default:
        return []
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
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">نماذج ISO (إجراءات وسياسات)</h1>
              <p className="text-white/80 text-sm">مكتبة النماذج، سير الاعتماد، وسجل التدقيق</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full bg-white/15 ring-1 ring-white/25 text-white/95 flex items-center">
            {list.length} نموذج
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10 text-white">
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25 p-3">
            {errMsg}
          </div>
        )}

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="flex items-center gap-2 text-white">
              <FilePlus2 className="h-5 w-5" />
              إنشاء نموذج ISO
            </CardTitle>
            <CardDescription className="text-white/80">أدخل بيانات النموذج واضغط حفظ</CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px bg-white/15" />

          <CardContent className="px-5 pb-5">
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="كود النموذج">
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  disabled={!canManage(session.role) || loading}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="عنوان النموذج">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!canManage(session.role) || loading}
                  className="h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                />
              </Field>

              <Field label="الكيان المالك">
                <Select
                  value={form.ownerEntityId}
                  onValueChange={(v) => setForm((p) => ({ ...p, ownerEntityId: v }))}
                  disabled={!canManage(session.role) || loading}
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

              <Field label="الحالة">
                <Select
                  value={form.status}
                  onValueChange={(v: ISOStatus) => setForm((p) => ({ ...p, status: v }))}
                  disabled={!canManage(session.role) || loading}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="submitted">مُقدَّم</SelectItem>
                    <SelectItem value="review">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={!canManage(session.role) || saving || loading || !form.ownerEntityId}
                  className="gap-2 h-11 rounded-full bg-white text-slate-900 font-semibold"
                >
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {!canManage(session.role) && (
                  <span className="text-xs text-white/80">لا تملك صلاحية إنشاء نماذج</span>
                )}
              </div>
            </form>
          </CardContent>
        </GlassCard>

        <GlassCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="text-white">قائمة النماذج</CardTitle>
            <CardDescription className="text-white/80">
              فلترة حسب الكيان/الحالة أو البحث بالكود/العنوان
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

              <Field label="فلتر الحالة">
                <Select value={filterStatus} onValueChange={(v: ISOStatus | "all") => setFilterStatus(v)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white text-slate-900 border-slate-200">
                    <SelectValue placeholder="كل الحالات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الحالات</SelectItem>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="submitted">مُقدَّم</SelectItem>
                    <SelectItem value="review">قيد المراجعة</SelectItem>
                    <SelectItem value="approved">معتمد</SelectItem>
                    <SelectItem value="rejected">مرفوض</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="md:col-span-1">
                <Label className="text-white/90 text-sm">بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ابحث بالكود/العنوان..."
                    className="pr-9 h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-blue-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-white/70">
                {loading ? "جارٍ التحميل..." : "لا توجد نماذج بعد"}
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((f: any) => {
                  const ent = entities.find((e) => e.id === f.ownerEntityId)
                  const actions = nextActions(f.status as ISOStatus)
                  return (
                    <li
                      key={f.id}
                      className="rounded-2xl bg-white/12 backdrop-blur-2xl ring-1 ring-white/20 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-semibold text-white">{f.title}</div>
                          <div className="text-xs text-white/80">الكود: {f.code}</div>
                          <div className="text-xs text-white/80 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{ent?.name || "بدون كيان"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`inline-flex items-center h-6 px-2 rounded-full ${statusStyle[f.status as ISOStatus]}`}>
                            {statusLabel[f.status as ISOStatus]}
                          </span>

                          {canManage(session.role) && actions.length > 0 && (
                            <div className="flex gap-2">
                              {actions.map(a => (
                                <button
                                  key={a.key}
                                  onClick={() => changeStatus(f.id, a.key as ISOStatus)}
                                  className="h-8 px-3 rounded-full bg-white/14 hover:bg-white/22 ring-1 ring-white/25 hover:ring-white/40 text-white text-xs inline-flex items-center gap-1 transition"
                                >
                                  {a.icon}
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {Array.isArray(f.trail) && f.trail.length > 0 && (
                        <div className="mt-3 border-t border-white/15 pt-2">
                          <div className="text-xs text-white/80 mb-1">سجل التدقيق:</div>
                          <div className="flex flex-wrap gap-2">
                            {f.trail.slice(-3).map((t: any, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center h-6 px-2 rounded-full bg-white/10 text-white/90 ring-1 ring-white/20 text-[11px]"
                              >
                                {new Date(t.at).toLocaleString("ar-EG")} • {t.by} •{" "}
                                {statusLabel[t.action as ISOStatus] || t.action}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
            <Link href="/iso" className={linkCls("/iso")}>نماذج ISO</Link>
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
