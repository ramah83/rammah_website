"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Users, ShieldCheck, FilePlus2, Search, Building2, GitBranch, CheckCircle2, XCircle, UploadCloud, Pencil, Trash2, Check, X } from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null }
type ISOStatus = "draft" | "submitted" | "review" | "approved" | "rejected"

type FormState = { code: string; title: string; ownerEntityId: string; status: ISOStatus }

const statusLabel: Record<ISOStatus, string> = {
  draft: "مسودة",
  submitted: "مُقدَّم",
  review: "قيد المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
}

const pillClass: Record<ISOStatus, string> = {
  draft:    "bg-[#F6F6F6] text-[#1D1D1D] border border-[#E5E5E5]",
  submitted:"bg-[#FFF2F2] text-[#1D1D1D] border border-[#F2D6D6]",
  review:   "bg-[#FFF8E8] text-[#1D1D1D] border border-[#F2E7C6]",
  approved: "bg-[#EAF8F0] text-[#1D1D1D] border border-[#CBEBDD]",
  rejected: "bg-[#FEEDEF] text-[#1D1D1D] border border-[#F5C9CF]",
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; code: string; ownerEntityId: string; status: ISOStatus } | null>(null)

  const canManage = (role: UserRole) => ["systemAdmin", "qualitySupervisor"].includes(role)

  const [form, setForm] = useState<FormState>({ code: "", title: "", ownerEntityId: "", status: "draft" })

  const api = {
    getEntities: async () => {
      const res = await fetch("/api/entities", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/entities failed")
      const data = await res.json()
      return Array.isArray(data) ? data : Array.isArray(data?.entities) ? data.entities : []
    },
    getISO: async () => {
      const res = await fetch("/api/iso", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/iso failed")
      const data = await res.json()
      return Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []
    },
    createISO: async (payload: { code: string; title: string; status: ISOStatus; ownerEntityId: string }) => {
      const res = await fetch("/api/iso", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("POST /api/iso failed")
      return res.json()
    },
    updateISO: async (id: string, payload: Partial<{ status: ISOStatus; title: string; code: string; ownerEntityId: string }>) => {
      const res = await fetch(`/api/iso/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error("PATCH /api/iso/:id failed")
      return res.json()
    },
    deleteISO: async (id: string) => {
      const res = await fetch(`/api/iso/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("DELETE /api/iso/:id failed")
      return res.json()
    },
  }

  useEffect(() => {
    try {
      const s = localStorage.getItem("session")
      if (!s) { router.push("/"); return }
      setSession(JSON.parse(s))
    } catch { router.push("/") }
  }, [router])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true); setErrMsg("")
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
    if (!session || form.ownerEntityId || !entities.length) return
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

  const resetForm = () => setForm({ code: "", title: "", ownerEntityId: session?.entityId || entities[0]?.id || "", status: "draft" })

  const refreshISO = async () => {
    try { setList(await api.getISO()) } catch { setList([]) }
  }

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canManage(session.role)) return
    if (!form.code.trim()) return alert("كود النموذج مطلوب")
    if (!form.title.trim()) return alert("عنوان النموذج مطلوب")
    if (!form.ownerEntityId) return alert("اختر الكيان")
    setSaving(true)
    try {
      await api.createISO({ code: form.code.trim(), title: form.title.trim(), status: form.status, ownerEntityId: form.ownerEntityId })
      await refreshISO(); resetForm()
    } catch (err: any) {
      alert(err?.message || "حدث خطأ")
    } finally { setSaving(false) }
  }

  const changeStatus = async (id: string, next: ISOStatus) => {
    try { await api.updateISO(id, { status: next }); await refreshISO() }
    catch { alert("لم يتم تغيير الحالة") }
  }

  const startEdit = (it: any) => {
    setEditingId(it.id)
    setEditDraft({ title: it.title ?? "", code: it.code ?? "", ownerEntityId: it.ownerEntityId ?? "", status: it.status as ISOStatus })
  }
  const cancelEdit = () => { setEditingId(null); setEditDraft(null) }
  const confirmEdit = async () => {
    if (!editingId || !editDraft) return
    try {
      await api.updateISO(editingId, {
        title: editDraft.title.trim(),
        code: editDraft.code.trim(),
        ownerEntityId: editDraft.ownerEntityId,
        status: editDraft.status,
      })
      await refreshISO(); cancelEdit()
    } catch (e: any) { alert(e?.message || "فشل التعديل") }
  }
  const onDelete = async (id: string) => {
    if (!confirm("حذف النموذج؟")) return
    try { await api.deleteISO(id); await refreshISO() }
    catch (e: any) { alert(e?.message || "فشل الحذف") }
  }

  const nextActions = (st: ISOStatus) => {
    switch (st) {
      case "draft":     return [{ key: "submitted", label: "تقديم", icon: <UploadCloud className="h-4 w-4" /> }]
      case "submitted": return [{ key: "review", label: "إرسال للمراجعة", icon: <GitBranch className="h-4 w-4" /> }]
      case "review":    return [
        { key: "approved", label: "اعتماد", icon: <CheckCircle2 className="h-4 w-4" /> },
        { key: "rejected", label: "رفض", icon: <XCircle className="h-4 w-4" /> },
      ]
      default: return []
    }
  }

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: "#1D1D1D" }}>نماذج ISO (إجراءات وسياسات)</h1>
              <p className="text-sm" style={{ color: "#6B6B6B" }}>مكتبة النماذج، سير الاعتماد، وسجل التدقيق</p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full flex items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: "#1D1D1D" }}>
            {list.length} نموذج
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-10" style={{ color: "#1D1D1D" }}>
        {errMsg && (
          <div className="mx-3 sm:mx-[1cm] rounded-2xl p-3" style={{ backgroundColor: "#FFF8E8", border: "1px solid #F2E7C6", color: "#6B6B6B" }}>
            {errMsg}
          </div>
        )}

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5" color="#1D1D1D" />
              إنشاء نموذج ISO
            </CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>أدخل بيانات النموذج واضغط حفظ</CardDescription>
          </CardHeader>

          <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

          <CardContent className="px-5 pb-5">
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="كود النموذج">
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  disabled={!canManage(session.role) || loading}
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>

              <Field label="عنوان النموذج">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!canManage(session.role) || loading}
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                />
              </Field>

              <Field label="الكيان المالك">
                <Select
                  value={form.ownerEntityId}
                  onValueChange={(v) => setForm((p) => ({ ...p, ownerEntityId: v }))}
                  disabled={!canManage(session.role) || loading}
                >
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                    <SelectValue placeholder="اختر الكيان" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
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
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
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
                <Button type="submit" disabled={!canManage(session.role) || saving || loading || !form.ownerEntityId} className="gap-2 h-11 rounded-full font-semibold" style={{ backgroundColor: "#EC1A24", color: "#FFFFFF" }}>
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {!canManage(session.role) && (
                  <span className="text-xs" style={{ color: "#6B6B6B" }}>لا تملك صلاحية إنشاء نماذج</span>
                )}
              </div>
            </form>
          </CardContent>
        </SurfaceCard>

        <SurfaceCard className="mx-3 sm:mx-[1cm]">
          <CardHeader className="pb-0 px-5 pt-5">
            <CardTitle>قائمة النماذج</CardTitle>
            <CardDescription style={{ color: "#6B6B6B" }}>فلترة حسب الكيان/الحالة أو البحث بالكود/العنوان</CardDescription>
          </CardHeader>

          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label="فلتر الكيان">
                <Select value={filterEntity} onValueChange={setFilterEntity}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                    <SelectValue placeholder="جميع الكيانات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكيانات</SelectItem>
                    {entities.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="فلتر الحالة">
                <Select value={filterStatus} onValueChange={(v: ISOStatus | "all") => setFilterStatus(v)}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
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
                <Label className="text-sm" style={{ color: "#1D1D1D" }}>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" color="#7A7A7A" />
                  <Input
                    placeholder="ابحث بالكود/العنوان..."
                    className="pr-9 h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10" style={{ color: "#7A7A7A" }}>
                {loading ? "جارٍ التحميل..." : "لا توجد نماذج بعد"}
              </div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((f: any) => {
                  const ent = entities.find((e) => e.id === f.ownerEntityId)
                  const actions = nextActions(f.status as ISOStatus)
                  const isEdit = editingId === f.id
                  return (
                    <li key={f.id} className="rounded-2xl p-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-full space-y-2">
                          {isEdit ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <Input
                                value={editDraft?.title || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), title: e.target.value }))}
                                className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                              />
                              <Input
                                value={editDraft?.code || ""}
                                onChange={(e) => setEditDraft(p => ({ ...(p as any), code: e.target.value }))}
                                className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", color: "#1D1D1D", borderColor: "#E3E3E3" }}
                                placeholder="الكود"
                              />
                              <div className="md:col-span-1">
                                <Select value={editDraft?.ownerEntityId || f.ownerEntityId} onValueChange={(v) => setEditDraft(p => ({ ...(p as any), ownerEntityId: v }))}>
                                  <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {entities.map((e) => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="md:col-span-1">
                                <Select value={editDraft?.status || f.status} onValueChange={(v: ISOStatus) => setEditDraft(p => ({ ...(p as any), status: v }))}>
                                  <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E3E3E3", color: "#1D1D1D" }}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">مسودة</SelectItem>
                                    <SelectItem value="submitted">مُقدَّم</SelectItem>
                                    <SelectItem value="review">قيد المراجعة</SelectItem>
                                    <SelectItem value="approved">معتمد</SelectItem>
                                    <SelectItem value="rejected">مرفوض</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="font-semibold" style={{ color: "#1D1D1D" }}>{f.title}</div>
                              <div className="text-xs" style={{ color: "#6B6B6B" }}>الكود: {f.code || "—"}</div>
                              <div className="text-xs flex items-center gap-1" style={{ color: "#6B6B6B" }}>
                                <Building2 className="h-3 w-3" color="#6B6B6B" />
                                <span>{ent?.name || "بدون كيان"}</span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`inline-flex items-center h-6 px-2 rounded-full text-xs ${pillClass[f.status as ISOStatus]}`}>
                            {statusLabel[f.status as ISOStatus]}
                          </span>

                          {canManage(session.role) && (
                            <div className="flex items-center gap-2 mt-1">
                              {isEdit ? (
                                <>
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={confirmEdit}>
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={cancelEdit}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  {actions.length > 0 && actions.map(a => (
                                    <button
                                      key={a.key}
                                      onClick={() => changeStatus(f.id, a.key as ISOStatus)}
                                      className="h-8 px-3 rounded-full text-xs"
                                      style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5", color: "#1D1D1D" }}
                                    >
                                      <span className="inline-flex items-center gap-1">{a.icon}{a.label}</span>
                                    </button>
                                  ))}
                                  <Button variant="secondary" className="h-8 px-2 rounded-full" onClick={() => startEdit(f)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button className="h-8 px-2 rounded-full" style={{ backgroundColor: "#EC1A24" }} onClick={() => onDelete(f.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </SurfaceCard>
      </main>
    </div>
  )
}

function HeaderBar() {
  const pathname = usePathname()
  const active = (href: string) => pathname === href
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/iso", label: "نماذج ISO" },
            ].map(l => (
              <Link key={l.href} href={l.href} className="px-3 py-1 rounded-lg transition"
                style={{ color: active(l.href) ? "#FFFFFF" : "#1D1D1D", backgroundColor: active(l.href) ? "#EC1A24" : "transparent" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
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

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`} style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  )
}
