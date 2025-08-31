"use client"

import { JSX, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileText, Gavel, ClipboardList, Search, Plus } from "lucide-react"
import { dataStore } from "@/lib/data-store"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
}

type GovType = "policy" | "minutes" | "decision"

type FormState = {
  type: GovType
  title: string
  content: string
}

const typeLabel: Record<GovType, string> = {
  policy: "سياسة/لائحة",
  minutes: "محضر اجتماع",
  decision: "قرار",
}

const typeColor: Record<GovType, string> = {
  policy: "bg-blue-100 text-blue-800",
  minutes: "bg-amber-100 text-amber-800",
  decision: "bg-emerald-100 text-emerald-800",
}

const typeIcon: Record<GovType, JSX.Element> = {
  policy: <ClipboardList className="h-3.5 w-3.5" />,
  minutes: <FileText className="h-3.5 w-3.5" />,
  decision: <Gavel className="h-3.5 w-3.5" />,
}

export default function GovernancePage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)

  const [list, setList] = useState<any[]>([])

  const [filterType, setFilterType] = useState<GovType | "all">("all")
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)

  const canCreate = (role: UserRole) => ["systemAdmin", "qualitySupervisor"].includes(role)

  const [form, setForm] = useState<FormState>({
    type: "policy",
    title: "",
    content: "",
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
      const items = (dataStore as any)?.listGov?.() ?? []
      setList(items)
    } catch {
      setList([])
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (list || [])
      .filter((g: any) => (filterType === "all" ? true : g.type === filterType))
      .filter((g: any) => {
        if (!q) return true
        const hay = [g.title, g.content, g.type].filter(Boolean).join(" ").toLowerCase()
        return hay.includes(q)
      })
      .sort((a: any, b: any) => {
        const at = (x: any) => (x?.createdAt ? new Date(x.createdAt).getTime() : 0)
        return at(b) - at(a)
      })
  }, [list, filterType, search])

  if (!session) return null

  const resetForm = () =>
    setForm({
      type: "policy",
      title: "",
      content: "",
    })

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate(session.role)) return
    if (!form.title.trim()) return alert("العنوان مطلوب")
    if (!form.content.trim()) return alert("المحتوى مطلوب")

    const hasCreate = typeof (dataStore as any)?.createGov === "function"
    if (!hasCreate) {
      alert("إنشاء سجلات الحوكمة غير متاح حالياً (dataStore.createGov غير موجود)")
      return
    }

    setSaving(true)
    try {
      ;(dataStore as any).createGov({
        type: form.type,
        title: form.title.trim(),
        content: form.content.trim(),
        files: [],
      })
      setList([...(dataStore as any).listGov()])
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">الحوكمة</h1>
            <p className="text-gray-600">اللوائح، محاضر الاجتماعات، القرارات، وسجل التدقيق</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {filtered.length} عنصر
          </Badge>
        </div>

        {/* النموذج (إنشاء عنصر حوكمة) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              إضافة سجل حوكمة
            </CardTitle>
            <CardDescription>أدخل البيانات التالية لإنشاء عنصر حوكمة جديد</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نوع السجل</Label>
                <Select
                  value={form.type}
                  onValueChange={(v: GovType) => setForm((p) => ({ ...p, type: v }))}
                  disabled={!canCreate(session.role)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="policy">سياسة/لائحة</SelectItem>
                    <SelectItem value="minutes">محضر اجتماع</SelectItem>
                    <SelectItem value="decision">قرار</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">العنوان</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!canCreate(session.role)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="content">المحتوى/الوصف</Label>
                <Input
                  id="content"
                  value={form.content}
                  onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                  placeholder="وصف مختصر للسياسة/المحضر/القرار..."
                  disabled={!canCreate(session.role)}
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!canCreate(session.role) || saving} className="gap-2">
                  {saving ? "جارٍ الحفظ..." : (<><Plus className="h-4 w-4" />حفظ</>)}
                </Button>
                {!canCreate(session.role) && (
                  <span className="text-xs text-gray-500">لا تملك صلاحية إنشاء سجلات حوكمة</span>
                )}
                {typeof (dataStore as any)?.createGov !== "function" && (
                  <span className="text-xs text-red-600">
                    ⚠︎ dataStore.createGov غير متوفر — الإنشاء غير مفعل حالياً
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* الفلاتر + القائمة */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>قائمة سجلات الحوكمة</CardTitle>
            <CardDescription>فلترة حسب النوع أو البحث بالعنوان/المحتوى</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="space-y-2">
                <Label>فلتر النوع</Label>
                <Select value={filterType} onValueChange={(v: GovType | "all") => setFilterType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="كل الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    <SelectItem value="policy">سياسة/لائحة</SelectItem>
                    <SelectItem value="minutes">محضر اجتماع</SelectItem>
                    <SelectItem value="decision">قرار</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ابحث بالعنوان/المحتوى..."
                    className="pr-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">لا توجد سجلات حوكمة بعد</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((g: any) => (
                  <li key={g.id} className="p-3 rounded border bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{g.title}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{g.content || "—"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={typeColor[g.type as GovType]}>
                          <span className="flex items-center gap-1">
                            {typeIcon[g.type as GovType]}
                            {typeLabel[g.type as GovType] ?? g.type}
                          </span>
                        </Badge>
                        {g.createdAt && (
                          <span className="text-[11px] text-gray-500">
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
        </Card>

        <Separator className="opacity-0" />
      </div>
    </div>
  )
}
