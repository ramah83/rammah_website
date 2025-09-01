"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import type { Session, JoinRequest } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BadgeCheck, XCircle, RefreshCw } from "lucide-react"

export default function RequestsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [rows, setRows] = useState<JoinRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    const s = localStorage.getItem("session")
    if (!s) { router.push("/"); return }
    const parsed: Session = JSON.parse(s)
    if (!["systemAdmin","entityManager"].includes(parsed.role)) { router.push("/dashboard"); return }
    setSession(parsed)
  }, [router])

  const load = async () => {
    setLoading(true)
    try {
      // ممكن تفلتر بـ entityId لو المدير مربوط بكيان واحد
      const res = await fetch(`/api/join-requests`, { cache: "no-store" })
      const data: JoinRequest[] = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  if (!session) return null

  const act = async (id: string, action: "approve" | "reject") => {
    if (acting) return
    setActing(id)
    try {
      const res = await fetch("/api/join-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, decidedBy: session.name }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data?.error || "تعذّر تنفيذ الإجراء"); return }

      // ✳️ هنا المكان المناسب لربط العضوية فعليًا في DB لما تكون "approve"
      // await fetch("/api/users/assign-entity", { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ userId: data.userId, entityId: data.entityId }) })

      // انعكاس اختياري لو القرار يخص المستخدم الحالي
      const s = localStorage.getItem("session")
      if (s) {
        const me = JSON.parse(s)
        if (me.id === data.userId && action === "approve") {
          me.entityId = data.entityId
          localStorage.setItem("session", JSON.stringify(me))
        }
      }
      await load()
    } catch(e:any) {
      alert(e?.message || "حدث خطأ")
    } finally {
      setActing(null)
    }
  }

  const grouped = useMemo(() => {
    const g: Record<string, JoinRequest[]> = { pending: [], approved: [], rejected: [] }
    for (const r of rows) g[r.status].push(r)
    return g
  }, [rows])

  return (
    <div dir="rtl" className="mx-auto max-w-6xl w-full px-4 py-8">
      <Card className="bg-white/5 text-white border-white/20 backdrop-blur">
        <CardHeader>
          <CardTitle>طلبات الانضمام</CardTitle>
          <CardDescription className="text-white/80">مراجعة الطلبات واتخاذ قرار</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" onClick={load} className="gap-2">
              <RefreshCw className="h-4 w-4" /> تحديث
            </Button>
          </div>

          {loading ? (
            <div className="h-24 rounded-2xl bg-white/10 animate-pulse" />
          ) : (
            <>
              {(["pending","approved","rejected"] as const).map((k) => (
                <div key={k} className="mb-6">
                  <h3 className="font-semibold mb-2">
                    {k === "pending" ? "قيد المراجعة" : k === "approved" ? "المقبولة" : "المرفوضة"}
                  </h3>
                  {grouped[k].length === 0 ? (
                    <div className="text-white/60 text-sm">لا يوجد</div>
                  ) : (
                    <ul className="space-y-3">
                      {grouped[k].map(r => (
                        <li key={r.id} className="rounded-2xl bg-white/10 p-4 flex items-center justify-between">
                          <div>
                            <div className="font-semibold">{r.userName} <span className="text-white/70 text-sm">({r.userEmail})</span></div>
                            <div className="text-white/80 text-sm">
                              كيان: {r.entityName} • الحالة: {r.status} • بتاريخ: {new Date(r.createdAt).toLocaleString("ar-EG")}
                              {r.decidedAt ? ` • قرار: ${new Date(r.decidedAt).toLocaleString("ar-EG")} بواسطة ${r.decidedBy || "-"}` : ""}
                            </div>
                          </div>
                          {r.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <Button disabled={!!acting} onClick={() => act(r.id, "approve")} className="gap-2">
                                <BadgeCheck className="h-4 w-4" /> موافقة
                              </Button>
                              <Button variant="destructive" disabled={!!acting} onClick={() => act(r.id, "reject")} className="gap-2">
                                <XCircle className="h-4 w-4" /> رفض
                              </Button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
