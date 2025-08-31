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
import {
  ShieldCheck,
  FilePlus2,
  Search,
  Building2,
  GitBranch,
  CheckCircle2,
  XCircle,
  UploadCloud,
} from "lucide-react"
import { dataStore } from "@/lib/data-store"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
}

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

const statusColor: Record<ISOStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  review: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
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
      return Array.isArray(data?.entities) ? data.entities : []
    },
    getISO: async () => {
      const res = await fetch("/api/iso", { cache: "no-store" })
      if (!res.ok) throw new Error("GET /api/iso failed")
      const data = await res.json()
      return Array.isArray(data?.items) ? data.items : []
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
      if (!s) {
        router.push("/")
        return
      }
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
        let ents = [] as any[]
        let isoItems = [] as any[]

        try {
          ents = await api.getEntities()
        } catch {
          ents = dataStore?.listEntities?.() ?? []
        }

        try {
          isoItems = await api.getISO()
        } catch {
          isoItems = dataStore?.listISO?.() ?? []
        }

        if (!mounted) return
        setEntities(ents)
        setList(isoItems)

        const defaultEnt =
          (ents.find((e: any) => e.id === session?.entityId)?.id as string | undefined) ||
          (ents[0]?.id as string | undefined)
        if (defaultEnt && !form.ownerEntityId) {
          setForm((p) => ({ ...p, ownerEntityId: defaultEnt }))
        }
      } catch (e: any) {
        if (!mounted) return
        setErrMsg(e?.message || "تعذّر تحميل البيانات")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [session])

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
      setList([...(dataStore?.listISO?.() ?? [])])
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
      try {
        await api.createISO({
          code: form.code.trim(),
          title: form.title.trim(),
          status: form.status,
          ownerEntityId: form.ownerEntityId,
        })
      } catch {
        dataStore?.addISO?.({
          code: form.code.trim(),
          title: form.title.trim(),
          status: form.status,
          ownerEntityId: form.ownerEntityId,
        } as any)
      }
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
      try {
        await api.updateISO(id, { status: next, note })
      } catch {
        const cur = (dataStore?.listISO?.() ?? []).find((x: any) => x.id === id)
        if (cur) cur.status = next
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">نماذج ISO (إجراءات وسياسات)</h1>
            <p className="text-gray-600">مكتبة النماذج، سير الاعتماد، وسجل التدقيق</p>
          </div>
          <Badge variant="secondary" className="text-sm flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" />
            {list.length} نموذج
          </Badge>
        </div>

        {errMsg && (
          <div className="p-3 text-sm rounded border border-amber-300 bg-amber-50 text-amber-800">
            {errMsg}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FilePlus2 className="h-5 w-5 text-blue-600" />
              إنشاء نموذج ISO
            </CardTitle>
            <CardDescription>أدخل بيانات النموذج واضغط حفظ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">كود النموذج</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  disabled={!canManage(session.role) || loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">عنوان النموذج</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!canManage(session.role) || loading}
                />
              </div>

              <div className="space-y-2">
                <Label>الكيان المالك</Label>
                <Select
                  value={form.ownerEntityId}
                  onValueChange={(v) => setForm((p) => ({ ...p, ownerEntityId: v }))}
                  disabled={!canManage(session.role) || loading}
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
                <Label>الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: ISOStatus) => setForm((p) => ({ ...p, status: v }))}
                  disabled={!canManage(session.role) || loading}
                >
                  <SelectTrigger>
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
              </div>

              <div className="md:col-span-2 flex items-center gap-3 pt-2">
                <Button type="submit" disabled={!canManage(session.role) || saving || loading} className="gap-2">
                  {saving ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
                {!canManage(session.role) && (
                  <span className="text-xs text-gray-500">لا تملك صلاحية إنشاء نماذج</span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>قائمة النماذج</CardTitle>
            <CardDescription>فلترة حسب الكيان/الحالة أو البحث بالكود/العنوان</CardDescription>
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

              <div className="space-y-2">
                <Label>فلتر الحالة</Label>
                <Select value={filterStatus} onValueChange={(v: ISOStatus | "all") => setFilterStatus(v)}>
                  <SelectTrigger>
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
              </div>

              <div className="space-y-2">
                <Label>بحث</Label>
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ابحث بالكود/العنوان..."
                    className="pr-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-10 text-gray-500">{loading ? "جارٍ التحميل..." : "لا توجد نماذج بعد"}</div>
            ) : (
              <ul className="space-y-2">
                {filtered.map((f: any) => {
                  const ent = entities.find((e) => e.id === f.ownerEntityId)
                  const actions = nextActions(f.status as ISOStatus)
                  return (
                    <li key={f.id} className="p-3 rounded border bg-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-medium">{f.title}</div>
                          <div className="text-xs text-gray-500">الكود: {f.code}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{ent?.name || "بدون كيان"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColor[f.status as ISOStatus]}>{statusLabel[f.status as ISOStatus]}</Badge>

                          {canManage(session.role) && actions.length > 0 && (
                            <div className="flex gap-2">
                              {actions.map((a) => (
                                <Button
                                  key={a.key}
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => changeStatus(f.id, a.key as ISOStatus)}
                                >
                                  {a.icon}
                                  {a.label}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {Array.isArray(f.trail) && f.trail.length > 0 && (
                        <div className="mt-3 border-t pt-2">
                          <div className="text-xs text-gray-500 mb-1">سجل التدقيق:</div>
                          <div className="flex flex-wrap gap-2">
                            {f.trail.slice(-3).map((t: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[11px]">
                                {new Date(t.at).toLocaleString("ar-EG")} • {t.by} •{" "}
                                {statusLabel[t.action as ISOStatus] || t.action}
                              </Badge>
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
        </Card>

        <Separator className="opacity-0" />
      </div>
    </div>
  )
}
