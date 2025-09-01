"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session, JoinRequest } from "@/lib/types"
import { Building2, SendHorizontal, Search, Check, Clock, XCircle, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type Entity = {
  id: string
  name: string
  type?: string
  contactEmail?: string
  phone?: string
  location?: string
}

export default function JoinEntitiesPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false) // ← عشان ما نرجعش null
  const [entities, setEntities] = useState<Entity[]>([])
  const [search, setSearch] = useState("")
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [myRequests, setMyRequests] = useState<Record<string, JoinRequest>>({})

  // ✅ حمّل الجلسة بدون ما تعمل redirect بدري
  useEffect(() => {
    try {
      const s = localStorage.getItem("session")
      if (!s) {
        router.push("/")
        return
      }
      const parsed: Session = JSON.parse(s)
      setSession(parsed)
    } finally {
      setSessionLoaded(true)
    }
  }, [router])

  // ✅ تحميل الكيانات
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/entities", { cache: "no-store" })
      const data: Entity[] = await res.json()
      setEntities(Array.isArray(data) ? data : [])
    }
    load()
  }, [])

  // ✅ تحميل طلبات هذا المستخدم (لو المستخدم Youth فقط)
  useEffect(() => {
    const loadMine = async () => {
      if (!session) return
      // لو الدور إداري مش هنحتاج نجيب طلباته
      if (isAdmin(session.role)) return
      const res = await fetch(`/api/join-requests?userId=${encodeURIComponent(session.id)}`, { cache: "no-store" })
      const rows: JoinRequest[] = await res.json()
      const map: Record<string, JoinRequest> = {}
      for (const r of rows) map[r.entityId] = r
      setMyRequests(map)
    }
    loadMine()
  }, [session])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entities
    return entities.filter((e) =>
      [e.name, e.type, e.location, e.phone, e.contactEmail]
        .filter(Boolean).join(" ").toLowerCase().includes(q)
    )
  }, [entities, search])

  // 🚦 لسه بنحمّل الجلسة؟ اعرض Placeholder بدلاً من لا شيء
  if (!sessionLoaded) {
    return (
      <div dir="rtl" className="mx-auto max-w-5xl w-full px-4 py-8 text-white">
        <div className="h-20 rounded-2xl bg-white/10 animate-pulse" />
      </div>
    )
  }

  // لو مفيش Session بعد التحميل نرجّعه للهوم
  if (!session) return null

  const allowJoin = isYouth(session.role) // true لليوزر الشباب فقط

  const statusBadge = (req?: JoinRequest) => {
    if (!req) return null
    if (req.status === "pending") return <span className="inline-flex items-center gap-1 text-amber-300 text-xs"><Clock className="h-3 w-3" />قيد المراجعة</span>
    if (req.status === "approved") return <span className="inline-flex items-center gap-1 text-emerald-300 text-xs"><Check className="h-3 w-3" />مقبول</span>
    return <span className="inline-flex items-center gap-1 text-rose-300 text-xs"><XCircle className="h-3 w-3" />مرفوض</span>
  }

  const requestJoin = async (entity: Entity) => {
    if (!allowJoin) return
    if (submittingId) return
    setSubmittingId(entity.id)
    try {
      const payload = {
        userId: session.id,
        userName: session.name,
        userEmail: session.email,
        entityId: entity.id,
        entityName: entity.name,
      }
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data?.error || "تعذّر إرسال الطلب")
      } else {
        setMyRequests(prev => ({ ...prev, [entity.id]: data }))
        alert("تم إرسال طلب الانضمام، بانتظار موافقة المسؤول")
      }
    } catch (e: any) {
      alert(e?.message || "حدث خطأ")
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div dir="rtl" className="mx-auto max-w-5xl w-full px-4 py-8 text-white">
      <Card className="bg-white/5 text-white border-white/20 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            الانضمام إلى كيان
          </CardTitle>
          <CardDescription className="text-white/80">
            {allowJoin
              ? "اختر كيانًا وقدّم طلب انضمام. لن تُصبح عضوًا إلا بعد موافقة المسؤول."
              : "أنت تمتلك صلاحيات إدارية، لذلك عرض الانضمام مُعطَّل. يمكنك استعراض الكيانات فقط."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allowJoin && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
              <AlertTriangle className="h-4 w-4" />
              هذه الصفحة للانضمام مخصّصة لحسابات الشباب فقط.
            </div>
          )}

          <div className="mb-4 flex items-center gap-2">
            <div className="relative w-full md:w-80">
              <Search className="absolute top-1/2 -translate-y-1/2 right-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ابحث بالاسم/المدينة/النوع..."
                className="pr-9 h-11 rounded-xl bg-white text-slate-900 placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => setSearch("")} className="h-11 rounded-full">
              مسح
            </Button>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-10 text-white/70">لا توجد كيانات متاحة الآن</div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((e) => {
                const req = myRequests[e.id]
                const disabled = !allowJoin || (!!req && req.status === "pending")
                return (
                  <li key={e.id} className="rounded-2xl bg-white/10 ring-1 ring-white/15 p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-3">
                        {e.name} {allowJoin && statusBadge(req)}
                      </div>
                      <div className="text-xs text-white/80">
                        {e.type ? `${e.type} • ` : ""}{e.location || "-"} • {e.phone || "-"} • {e.contactEmail || "-"}
                      </div>
                    </div>
                    <Button
                      disabled={disabled || !!submittingId}
                      onClick={() => requestJoin(e)}
                      className="gap-2 rounded-full"
                    >
                      <SendHorizontal className="h-4 w-4" />
                      {!allowJoin ? "عرض فقط" : (req?.status === "pending" ? "طلب مُرسل" : "طلب انضمام")}
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helpers
function isAdmin(role: Session["role"]) {
  return role === "systemAdmin" || role === "entityManager" || role === "qualitySupervisor"
}
function isYouth(role: Session["role"]) {
  // بعض الأنظمة بتسمي الدور "user" بدل "youth"
  return role === "youth" || (role as any) === "user"
}
