"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const COLORS = {
  text: "#1D1D1D",
  muted: "#6B6B6B",
  bg: "#EFE6DE",
  card: "#FFFFFF",
  border: "#E7E2DC",
  line: "#E3E3E3",
  soft: "#F6F6F6",
  primary: "#EC1A24",
};

type Session = { id: string; role: "user" | "entityManager" | "unionSupervisor"; entityId?: string | null; name?: string | null; email?: string | null };
type EntityLite = { id: string; name: string };
type MyMembership = { entityId: string | null; entityName: string | null; status: string | null };

function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
  } catch { return ""; }
}
function withSession(init: RequestInit = {}): RequestInit {
  const h = new Headers(init.headers || {});
  const s = sessionHeaderB64();
  if (s) h.set("x-session-b64", s);
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData)) h.set("Content-Type", "application/json");
  return { ...init, headers: h, credentials: "include", cache: "no-store" };
}

export default function LeaveMembershipPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  const [membership, setMembership] = useState<MyMembership | null>(null);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingMine, setPendingMine] = useState<any[]>([]);
  const [sent, setSent] = useState<{ id?: string; approverRole?: string } | null>(null);

  // load session
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.replace("/"); return; }
      setSession(JSON.parse(s));
    } catch { router.replace("/"); }
  }, [router]);

  // load entities (names map)
  useEffect(() => {
    fetch("/api/entities", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any) => {
        const arr: EntityLite[] = Array.isArray(rows) ? rows : rows?.entities || [];
        setEntities(arr.map((e: any) => ({ id: String(e.id), name: String(e.name || "") })));
      })
      .catch(() => setEntities([]));
  }, []);

  // load my membership
  const reload = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      const m = await fetch("/api/membership/my", withSession()).then(r => r.ok ? r.json() : null);
      setMembership(m);
      // pending leave requests created by me
      const mine = await fetch(`/api/entities/requests?scope=mine&status=pending`, withSession())
        .then(r => (r.ok ? r.json() : []))
        .catch(() => []);
      setPendingMine(Array.isArray(mine) ? mine.filter((x:any)=> x?.action==='leave_membership') : []);
    } finally {
      setLoading(false);
    }
  }, [session?.id]);

  useEffect(() => { reload(); }, [reload]);

  const entityName = useMemo(() => {
    if (!membership?.entityId) return null;
    return membership?.entityName || entities.find(e => e.id === membership.entityId)?.name || membership.entityId;
  }, [membership, entities]);

  const hasPendingForCurrent = useMemo(() => {
    if (!membership?.entityId) return false;
    return pendingMine.some((r: any) => String(r.targetEntityId || r.entityId) === String(membership.entityId) && r.status === "pending");
  }, [pendingMine, membership?.entityId]);

  async function submitLeave() {
    if (!session?.id) return;
    if (session.role !== "user") {
      alert("هذه الصفحة مخصصة للمستخدمين فقط.");
      return;
    }
    if (!membership?.entityId) {
      alert("أنت غير منضم لأي كيان حاليًا.");
      return;
    }
    if (hasPendingForCurrent) {
      alert("لديك طلب مغادرة قيد المراجعة لهذا الكيان بالفعل.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/membership/leave-requests", withSession({
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() || null })
      }));
      const data = await r.json().catch(() => ({}));
      if (r.status === 202) {
        setSent({ id: data?.requestId, approverRole: data?.approverRole });
        alert(
          (data?.message || "تم إرسال طلب المغادرة.") +
          (data?.requestId ? `\nرقم الطلب: ${data.requestId}` : "")
        );
        await reload();
      } else if (!r.ok) {
        throw new Error(data?.error || "تعذر إرسال الطلب");
      } else {
        setSent({ id: data?.requestId, approverRole: data?.approverRole });
        await reload();
      }
    } catch (e: any) {
      alert(e?.message || "حدث خطأ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" style={{ background: COLORS.bg, color: COLORS.text, minHeight: "100vh", fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      <div className="mx-auto max-w-3xl w-full px-4 py-8">
        <div className="rounded-[22px] p-5 md:p-6"
             style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <h1 className="text-2xl md:text-3xl font-extrabold">طلب مغادرة الكيان</h1>
          <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
            سيتم إرسال طلبك للمراجعة من مدير الكيان ثم مسؤول الاتحاد (حسب الإعداد).
          </p>

          <div className="mt-5 p-4 rounded-2xl"
               style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
            {loading ? (
              <div className="h-20 rounded-xl animate-pulse" style={{ background: "#0000000A" }} />
            ) : !membership?.entityId ? (
              <div className="text-sm" style={{ color: COLORS.muted }}>
                أنت غير منضم لأي كيان حاليًا.
              </div>
            ) : (
              <>
                <div className="text-sm">كيانك الحالي: <strong>{entityName}</strong></div>

                {/* حالة الطلب الحالي إن وُجد */}
                {hasPendingForCurrent && (
                  <div className="mt-2 text-sm"
                       style={{ color: "#7A7A7A" }}>
                    لديك طلب مغادرة <strong>قيد المراجعة</strong> لهذا الكيان.
                  </div>
                )}

                <label className="block text-sm mt-4 mb-1">سبب المغادرة (اختياري)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl p-3 text-sm outline-none"
                  placeholder="اكتب سببك إن رغبت..."
                  rows={4}
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}
                />

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={submitLeave}
                    disabled={submitting || hasPendingForCurrent}
                    className="h-10 px-4 rounded-full font-semibold disabled:opacity-60"
                    style={{ background: COLORS.primary, color: "#FFFFFF" }}
                    title={hasPendingForCurrent ? "عندك طلب قيد المراجعة بالفعل" : undefined}
                  >
                    {submitting ? "جارٍ الإرسال..." : "إرسال طلب مغادرة"}
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/requests")}
                    className="h-10 px-4 rounded-full"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}
                  >
                    الذهاب لطلبات العضوية
                  </button>
                </div>

                {/* ملخص سريع للطلبات المعلّقة الخاصة بي */}
                {pendingMine.length > 0 && (
                  <div className="mt-5">
                    <div className="text-sm font-semibold mb-2">طلباتي المعلّقة:</div>
                    <ul className="space-y-2">
                      {pendingMine.map((r:any) => (
                        <li key={r.id} className="rounded-xl p-3"
                            style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
                          <div className="text-sm">
                            طلب مغادرة • الكيان: {r.entityName || r.targetEntityId} •
                            المرحلة: {r.approverRole === "entityManager" ? "موافقة مدير الكيان" : "موافقة مسؤول الاتحاد"} •
                            بتاريخ: {new Date(r.createdAt).toLocaleString("ar-EG")}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sent?.id && (
                  <div className="mt-4 text-xs" style={{ color: COLORS.muted }}>
                    رقم الطلب: {sent.id} — المرحلة الحالية: {sent.approverRole === "entityManager" ? "مدير الكيان" : "مسؤول الاتحاد"}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
