"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClipboardList, FileText, Gavel, Plus, Search, Users, Trash2, Pencil, Check, X } from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"
type Session = { id: string; email: string; name: string; role: UserRole; entityId?: string | null }
type GovType = "policy" | "procedure" | "minutes" | "decision" | "inquiry" | "response"

const PALETTE = {
  bg: "#EFE6DE",     
  text: "#1D1D1D",    
  sub: "#4A4A4A",      
  white: "#F6F6F6",    
  primary: "#EC1A24",  
  border: "#E5DED7",  
}

const typeLabel: Record<GovType, string> = {
  policy: "سياسة/لائحة",
  procedure: "إجراء",
  minutes: "محضر اجتماع",
  decision: "قرار",
  inquiry: "استفسار",
  response: "ردّ",
}

const typeStyle: Record<GovType, string> = {
  policy:   "bg-white text-[#1D1D1D] ring-1 ring-[#E5DED7]",
  procedure:"bg-[#F6F6F6] text-[#1D1D1D] ring-1 ring-[#E5DED7]",
  minutes:  "bg-[#F6F6F6] text-[#1D1D1D] ring-1 ring-[#E5DED7]",
  decision: "bg-[#EC1A24]/10 text-[#EC1A24] ring-1 ring-[#EC1A24]/30",
  inquiry:  "bg-white text-[#1D1D1D] ring-1 ring-[#E5DED7]",
  response: "bg-[#F6F6F6] text-[#1D1D1D] ring-1 ring-[#E5DED7]",
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

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{ title: string; notes: string; type: GovType } | null>(null)

  useEffect(() => {
    const s = localStorage.getItem("session")
    if (!s) { router.push("/"); return }
    setSession(JSON.parse(s))
  }, [router])

  const refreshList = async () => {
    try {
      const res = await fetch("/api/governance", { cache: "no-store" })
      const items = await res.json()
      setList(Array.isArray(items) ? items : [])
    } catch {
      setList([])
    }
  }

  useEffect(() => {
    refreshList()
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
      await refreshList()
      resetForm()
    } catch (err: any) {
      alert(err?.message || "حدث خطأ")
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا السجل؟")) return
    try {
      const res = await fetch("/api/governance", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error("فشل الحذف")
      setList(prev => prev.filter((x: any) => x.id !== id))
    } catch (e: any) {
      alert(e?.message || "حدث خطأ أثناء الحذف")
    }
  }

  const startEdit = (g: any) => {
    setEditingId(g.id)
    setEditDraft({ title: g.title, notes: g.notes || "", type: g.type })
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(null)
  }
  const confirmEdit = async () => {
    if (!editingId || !editDraft) return
    try {
      const res = await fetch("/api/governance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          title: editDraft.title,
          notes: editDraft.notes,
          type: editDraft.type,
        }),
      })
      if (!res.ok) throw new Error("فشل التعديل")
      await refreshList()
      cancelEdit()
    } catch (e: any) {
      alert(e?.message || "حدث خطأ أثناء التعديل")
    }
  }

  return (
    <div dir="rtl" className="min-h-screen" style={{ backgroundColor: PALETTE.bg }}>
      <HeaderBar />

      <section className="mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-2xl p-5 md:p-6 shadow-sm border"
          style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 rounded-xl grid place-items-center"
                style={{ backgroundColor: "#ffffff", border: `1px solid ${PALETTE.border}`, color: PALETTE.primary }}
              >
                <Gavel className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: PALETTE.text }}>
                  الحوكمة
                </h1>
                <p className="text-sm" style={{ color: PALETTE.sub }}>
                  اللوائح، محاضر الاجتماعات، القرارات، وسجل التدقيق
                </p>
              </div>
            </div>
            <div
              className="h-9 px-3 rounded-full grid place-items-center text-sm"
              style={{ backgroundColor: "#ffffff", color: PALETTE.text, border: `1px solid ${PALETTE.border}` }}
            >
              {filtered.length} عنصر
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl w-full px-4 mt-6 space-y-6 pb-12">

        <Card className="shadow-sm" style={{ borderColor: PALETTE.border, backgroundColor: "#FFFFFF", color: PALETTE.text }}>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2" style={{ color: PALETTE.text }}>
              <ClipboardList className="h-5 w-5" style={{ color: PALETTE.primary }} />
              إضافة سجل حوكمة
            </CardTitle>
            <CardDescription style={{ color: PALETTE.sub }}>
              أدخل البيانات التالية لإنشاء عنصر جديد
            </CardDescription>
          </CardHeader>
          <div className="mx-5 my-4 h-px" style={{ backgroundColor: PALETTE.border }} />
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="نوع السجل">
                <Select
                  value={form.type}
                  onValueChange={(v: GovType) => setForm(p => ({ ...p, type: v }))}
                >
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border, color: PALETTE.text }}>
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
                  className="h-11 rounded-xl"
                  style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border, color: PALETTE.text }}
                  placeholder="مثال: لائحة السلوك المهني"
                />
              </Field>

              <Field label="المحتوى/الوصف" className="md:col-span-2">
                <textarea
                  id="content"
                  rows={5}
                  value={form.content}
                  onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                  className="w-full rounded-xl px-3 py-2 outline-none focus:ring-2"
                  style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, color: PALETTE.text, boxShadow: "0 0 0 0 rgba(0,0,0,0)" }}
                  placeholder="اكتب تفاصيل السجل..."
                />
              </Field>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 h-11 rounded-xl"
                  style={{ backgroundColor: PALETTE.primary, color: "#FFFFFF" }}
                >
                  {saving ? "جارٍ الحفظ..." : (<><Plus className="h-4 w-4" />حفظ</>)}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm" style={{ borderColor: PALETTE.border, backgroundColor: "#FFFFFF", color: PALETTE.text }}>
          <CardHeader className="pb-0">
            <CardTitle style={{ color: PALETTE.text }}>قائمة سجلات الحوكمة</CardTitle>
            <CardDescription style={{ color: PALETTE.sub }}>
              فلترة حسب النوع أو البحث بالعنوان/المحتوى
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <Field label="فلتر النوع">
                <Select value={filterType} onValueChange={(v: GovType | "all") => setFilterType(v)}>
                  <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border, color: PALETTE.text }}>
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
                <Label className="text-sm" style={{ color: PALETTE.text }}>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4" style={{ color: "#9CA3AF" }} />
                  <Input
                    placeholder="ابحث بالعنوان/المحتوى..."
                    className="pr-9 h-11 rounded-xl"
                    style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border, color: PALETTE.text }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10" style={{ color: PALETTE.sub }}>لا توجد سجلات حوكمة بعد</div>
            ) : (
              <ul className="space-y-3">
                {filtered.map((g: any) => (
                  <li
                    key={g.id}
                    className="rounded-xl p-4 hover:shadow-sm transition border"
                    style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 w-full">
                        {editingId === g.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editDraft?.title || ""}
                              onChange={(e) => setEditDraft(p => ({ ...(p as any), title: e.target.value }))}
                              className="h-10 rounded-xl"
                              style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border, color: PALETTE.text }}
                            />
                            <textarea
                              rows={3}
                              value={editDraft?.notes || ""}
                              onChange={(e) => setEditDraft(p => ({ ...(p as any), notes: e.target.value }))}
                              className="w-full rounded-xl px-3 py-2"
                              style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}
                            />
                            <div className="max-w-xs">
                              <Select
                                value={editDraft?.type || g.type}
                                onValueChange={(v: GovType) => setEditDraft(p => ({ ...(p as any), type: v }))}
                              >
                                <SelectTrigger className="h-10 rounded-xl" style={{ backgroundColor: "#FFFFFF", borderColor: PALETTE.border, color: PALETTE.text }}>
                                  <SelectValue />
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
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold" style={{ color: PALETTE.text }}>{g.title}</div>
                            <div className="text-xs" style={{ color: PALETTE.sub }}>{g.notes || "—"}</div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-full ${typeStyle[g.type as GovType]}`}>
                          {typeIcon[g.type as GovType]}
                          {typeLabel[g.type as GovType] ?? g.type}
                        </span>
                        {g.createdAt && (
                          <span className="text-[11px]" style={{ color: PALETTE.sub }}>
                            {new Date(g.createdAt).toLocaleString("ar-EG")}
                          </span>
                        )}

                        {/* أزرار الإجراءات */}
                        <div className="flex items-center gap-2 mt-1">
                          {editingId === g.id ? (
                            <>
                              <Button
                                variant="secondary"
                                className="h-8 px-2 rounded-lg"
                                style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}
                                onClick={confirmEdit}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                className="h-8 px-2 rounded-lg"
                                style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}
                                onClick={cancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="secondary"
                                className="h-8 px-2 rounded-lg"
                                style={{ backgroundColor: "#FFFFFF", border: `1px solid ${PALETTE.border}`, color: PALETTE.text }}
                                onClick={() => startEdit(g)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                className="h-8 px-2 rounded-lg"
                                style={{ backgroundColor: "transparent", border: `1px solid ${PALETTE.primary}`, color: PALETTE.primary }}
                                onClick={() => onDelete(g.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function HeaderBar() {
  const pathname = usePathname()
  const linkCls = (href: string) =>
    `px-3 py-2 rounded-lg text-sm transition ${
      pathname === href
        ? "text-white"
        : "hover:opacity-90"
    }`

  return (
    <header
      className="border-b sticky top-0 z-20 backdrop-blur"
      style={{ backgroundColor: "#EFE6DECC", borderColor: PALETTE.border }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="h-14 w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded-lg grid place-items-center"
              style={{ backgroundColor: PALETTE.primary, color: "#FFFFFF" }}
            >
              <Users className="h-4 w-4" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: PALETTE.text }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            <Link href="/"         className={linkCls("/")}         style={navStyle(pathname === "/")}        >الرئيسية</Link>
            <Link href="/about"    className={linkCls("/about")}    style={navStyle(pathname === "/about")}   >عن المنصة</Link>
            <Link href="/support"  className={linkCls("/support")}  style={navStyle(pathname === "/support")} >الدعم</Link>
            <Link href="/dashboard"className={linkCls("/dashboard")}style={navStyle(pathname === "/dashboard")}>لوحة التحكم</Link>
            <Link href="/governance"className={linkCls("/governance")}style={navStyle(pathname === "/governance")}>الحوكمة</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

function navStyle(active: boolean): React.CSSProperties {
  return active
    ? { backgroundColor: "#EC1A24", border: "1px solid #EC1A24", color: "#FFFFFF" }
    : { color: "#1D1D1D", border: "1px solid transparent" }
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
      <span className="text-sm" style={{ color: PALETTE.text }}>{label}</span>
      {children}
    </label>
  )
}
