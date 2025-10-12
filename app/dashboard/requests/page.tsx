"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Session, JoinRequest } from "@/lib/types";
import { BadgeCheck, XCircle, RefreshCw, Users } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

/* ===== Theme ===== */
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

type EntityLite = { id: string; name: string };

/* ===== Helpers ===== */
function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = { "Cache-Control": "no-store" };
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

export default function JoinRequestsOnlyPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // طلبات الانضمام
  const [rows, setRows] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // الكيانات + اختيار المستخدم العادي للتقديم
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");

  // عضوية المستخدم الحالية + إرسال طلب جديد
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* ===== Session ===== */
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      setSession(JSON.parse(s));
    } catch {
      router.push("/");
    }
  }, [router]);

  const canDecide    = !!session && (session.role === "entityManager" || session.role === "unionSupervisor");
  const isSupervisor = session?.role === "unionSupervisor";
  const isManager    = session?.role === "entityManager";

  /* ===== Loaders ===== */

  // جميع الكيانات (لعرض الأسماء والتقديم)
  const loadEntities = useCallback(async () => {
    const res = await fetch("/api/entities", {
      cache: "no-store",
      headers: buildSessionHeaders(false),
      credentials: "include",
    });
    const data = await res.json().catch(() => []);
    const list: EntityLite[] = (Array.isArray(data) ? data : data?.entities || [])
      .filter((e: any) => e?.id && e?.name)
      .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
    setEntities(list);
    if (!selectedEntity && list[0]?.id) setSelectedEntity(list[0].id);
  }, [selectedEntity]);

  // تحميل طلبات الانضمام
  const loadJoinRequests = useCallback(async () => {
    if (!session?.id) return;
    setLoading(true);
    try {
      let q = "";
      if (session.role === "unionSupervisor") {
        // يطلع كل المعلّق (وتقدر توسعها حسب احتياجك)
        q = `?status=pending`;
      } else if (session.role === "entityManager" && session.entityId) {
        q = `?entityId=${encodeURIComponent(String(session.entityId))}`;
      } else {
        // المستخدم العادي — طلباته هو فقط
        q = `?userId=${encodeURIComponent(session.id)}`;
      }

      const res = await fetch(`/api/join-requests${q}`, {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      const data: JoinRequest[] = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [session?.id, session?.role, session?.entityId]);

  // عضوية المستخدم الحاليّة (لتعطيل التقديم لو داخل كيان)
  const loadMembership = useCallback(async () => {
    if (session?.role !== "user") { setCurrentEntityId(null); return; }
    try {
      const r = await fetch("/api/membership/my", {
        cache: "no-store",
        headers: buildSessionHeaders(false),
        credentials: "include",
      });
      const j = await r.json().catch(() => null);
      setCurrentEntityId(j?.entityId ? String(j.entityId) : null);
    } catch { setCurrentEntityId(null); }
  }, [session?.role]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadJoinRequests(), loadEntities(), loadMembership()]);
  }, [loadJoinRequests, loadEntities, loadMembership]);

  useEffect(() => { if (session?.id) reloadAll(); }, [session?.id, reloadAll]);

  // تحديث تلقائي عند الرجوع للتاب
  useEffect(() => {
    const onFocus = () => reloadAll();
    const onVis = () => { if (document.visibilityState === "visible") reloadAll(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [reloadAll]);

  /* ===== Derivations ===== */

  // تجميع المعلّق حسب الكيان لمسؤول الاتحاد
  const pendingJoinByEntity = useMemo(() => {
    if (!isSupervisor) return {} as Record<string, JoinRequest[]>;
    const m: Record<string, JoinRequest[]> = {};
    for (const r of rows) {
      if (r?.status !== "pending") continue;
      const k = String(r.entityId);
      (m[k] ||= []).push(r);
    }
    return m;
  }, [rows, isSupervisor]);

  // تجميع حسب الحالة لعرض المستخدم
  const groupedForUser = useMemo(() => {
    const g: Record<"pending" | "approved" | "rejected", JoinRequest[]> = {
      pending: [], approved: [], rejected: [],
    };
    for (const r of rows) {
      if (r.status === "pending" || r.status === "approved" || r.status === "rejected") g[r.status].push(r);
    }
    return g;
  }, [rows]);

  const isMemberNow = !!currentEntityId;
  const hasPendingForSelected = useMemo(
    () => !!rows.find(r => r.entityId === selectedEntity && r.status === "pending"),
    [rows, selectedEntity]
  );

  /* ===== Actions ===== */

  const actJoin = async (id: string, action: "approve" | "reject") => {
    if (!canDecide || acting) return;
    setActing(id);
    try {
      const res = await fetch(`/api/join-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "تعذّر تنفيذ الإجراء"); return; }
      await loadJoinRequests();
    } catch (e: any) {
      alert(e?.message || "حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  const submitJoin = async () => {
    if (!session) return;
    if (isMemberNow) { alert("أنت عضو حالياً في كيان. يجب الخروج أولاً قبل تقديم طلب جديد."); return; }
    if (!selectedEntity) { alert("اختر كيانًا أولاً"); return; }
    if (hasPendingForSelected) { alert("لديك طلب قيد المراجعة لهذا الكيان"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: buildSessionHeaders(true),
        credentials: "include",
        body: JSON.stringify({ entityId: selectedEntity }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "تعذّر إرسال الطلب"); return; }
      alert("تم إرسال طلب الانضمام. بانتظار الموافقة.");
      await loadJoinRequests();
    } catch (e: any) {
      alert(e?.message || "تعذّر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  /* ===== UI ===== */
  return (
    <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      <HeaderBar />

      {/* Header */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
             style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <Users className="h-5 w-5" color={COLORS.text} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">طلبات الانضمام</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {canDecide
                  ? (isSupervisor ? "استعراض واعتماد الطلبات المعلّقة لكل الكيانات" : "مراجعة طلبات الانضمام إلى كيانك")
                  : "اختر كيانًا لتقديم طلب الانضمام، وتابع حالة طلباتك"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 px-3 rounded-full grid place-items-center"
                 style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
              {rows.length} طلب
            </div>
            <button
              onClick={() => { loadJoinRequests(); loadEntities(); loadMembership(); }}
              className="h-9 px-3 rounded-full inline-flex items-center gap-2"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
            >
              <RefreshCw className="h-4 w-4" /> تحديث
            </button>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        {/* ========== لوحة المشرف/المدير ========== */}
        {canDecide ? (
          <SurfaceCard className="mb-6">
            <div className="px-5 pt-5">
              <div className="text-sm" style={{ color: COLORS.muted }}>طلبات الانضمام المعلّقة</div>
            </div>
            <div className="mx-5 my-4 h-px" style={{ background: COLORS.line }} />
            <div className="px-5 pb-5">
              {loading ? (
                <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
              ) : (
                <>
                  {/* مسؤول الاتحاد: تجميع حسب الكيان */}
                  {isSupervisor ? (
                    Object.keys(pendingJoinByEntity).length === 0 ? (
                      <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات معلّقة.</div>
                    ) : (
                      Object.entries(pendingJoinByEntity).map(([eid, list]) => {
                        const ename = entities.find(e => e.id === eid)?.name || list[0]?.entityName || eid;
                        return (
                          <div key={eid} className="mb-6">
                            <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>{ename}</h3>
                            <ul className="space-y-3">
                              {list.map((r) => (
                                <JoinCard
                                  key={r.id}
                                  title={`${r.userName || "-"}`}
                                  subtitle={`قدّم في ${new Date(r.createdAt).toLocaleString("ar-EG")}`}
                                  onApprove={() => actJoin(r.id, "approve")}
                                  onReject={() => actJoin(r.id, "reject")}
                                  disabled={!!acting}
                                />
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    )
                  ) : (
                    // مدير الكيان: قائمة واحدة
                    (rows.filter(r => r.status === "pending").length === 0 ? (
                      <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات معلّقة.</div>
                    ) : (
                      <ul className="space-y-3">
                        {rows.filter(r => r.status === "pending").map((r) => (
                          <JoinCard
                            key={r.id}
                            title={`${r.userName || "-"}`}
                            subtitle={`كيان: ${r.entityName} • قدّم في ${new Date(r.createdAt).toLocaleString("ar-EG")}`}
                            onApprove={() => actJoin(r.id, "approve")}
                            onReject={() => actJoin(r.id, "reject")}
                            disabled={!!acting}
                          />
                        ))}
                      </ul>
                    ))
                  )}
                </>
              )}
            </div>
          </SurfaceCard>
        ) : (
          /* ========== واجهة المستخدم العادي لتقديم طلب ========== */
          <SurfaceCard className="mb-6">
            <div className="p-5 space-y-4">
              {isMemberNow && (
                <div className="rounded-xl p-3 text-sm" style={{ background: "#FFF8E8", border: "1px solid #F2E7C6", color: "#7A7A7A" }}>
                  أنت عضو حاليًا في:
                  {" "}<strong>{entities.find(e => e.id === currentEntityId)?.name || currentEntityId}</strong>.
                  لا يمكنك تقديم طلب جديد إلا بعد الخروج من الكيان.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-sm mb-1" style={{ color: COLORS.text }}>اختر الكيان</label>
                  <Select value={selectedEntity} onValueChange={setSelectedEntity} disabled={isMemberNow}>
                    <SelectTrigger className="h-11 rounded-xl"
                                   style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                      <SelectValue placeholder="اختر الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitJoin}
                    disabled={Boolean(isMemberNow || !selectedEntity || submitting || hasPendingForSelected)}
                    className="h-11 px-5 rounded-full font-semibold"
                    style={{ background: COLORS.primary, color: "#FFFFFF",
                            opacity: (isMemberNow || !selectedEntity || submitting || hasPendingForSelected) ? 0.6 : 1 }}
                  >
                    {submitting ? "جارٍ الإرسال..." : "تقديم طلب انضمام"}
                  </button>
                  <button
                    onClick={() => { loadJoinRequests(); loadEntities(); loadMembership(); }}
                    className="h-11 px-4 rounded-full"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </SurfaceCard>
        )}

        {/* ========== المستخدم: عرض طلباته (نفس الاستايل) ========== */}
        {!canDecide && (
          <SurfaceCard>
            <div className="p-5">
              {loading ? (
                <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
              ) : (
                (["pending","approved","rejected"] as const).map((k) => (
                  <div key={k} className="mb-6">
                    <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
                      {k === "pending" ? "طلبات الانضمام قيد المراجعة" : k === "approved" ? "طلبات الانضمام المقبولة" : "طلبات الانضمام المرفوضة"}
                    </h3>

                    {groupedForUser[k].length === 0 ? (
                      <div className="text-sm" style={{ color: COLORS.muted }}>لا يوجد</div>
                    ) : (
                      <ul className="space-y-3">
                        {groupedForUser[k].map((r) => (
                          <CardRow
                            key={r.id}
                            title={`${r.entityName}`}
                            subtitle={`الحالة: ${r.status} • بتاريخ: ${new Date(r.createdAt).toLocaleString("ar-EG")}${r.decidedAt ? ` • قرار: ${new Date(r.decidedAt!).toLocaleString("ar-EG")} بواسطة ${r.decidedBy || "-"}` : ""}`}
                            right={<StatusPill status={r.status as any} />}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              )}
            </div>
          </SurfaceCard>
        )}
      </main>
    </div>
  );
}

/* ===== Reusable bits (نفس استايل كروت المغادرة) ===== */
function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10" style={{ fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
             style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <Users className="h-5 w-5" color={COLORS.text} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: COLORS.text }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/entities", label: "الكيانات" },
              { href: "/dashboard/requests", label: "طلبات الانضمام" }
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{ color: active(l.href) ? "#FFFFFF" : COLORS.text, backgroundColor: active(l.href) ? COLORS.primary : "transparent" }}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function SurfaceCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl ${className}`}
         style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}

/* كارت قياسي بنفس استايل المغادرة، مع أزرار اعتماد/رفض */
function JoinCard({
  title,
  subtitle,
  onApprove,
  onReject,
  disabled,
}: {
  title: string;
  subtitle: string;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
}) {
  return (
    <li className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
      <div>
        <div className="font-semibold" style={{ color: COLORS.text }}>{title}</div>
        <div className="text-sm" style={{ color: COLORS.muted }}>{subtitle}</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={!!disabled}
          onClick={onApprove}
          className="h-9 px-3 rounded-full flex items-center gap-2 font-medium"
          style={{ background: COLORS.primary, color: "#FFFFFF", opacity: disabled ? 0.6 : 1 }}>
          <BadgeCheck className="h-4 w-4" /> قبول الانضمام
        </button>
        <button
          disabled={!!disabled}
          onClick={onReject}
          className="h-9 px-3 rounded-full flex items-center gap-2"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text, opacity: disabled ? 0.6 : 1 }}>
          <XCircle className="h-4 w-4" /> رفض الانضمام
        </button>
      </div>
    </li>
  );
}

/* صف بسيط لعرض حالة المستخدم */
function CardRow({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <li className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
      <div>
        <div className="font-semibold" style={{ color: COLORS.text }}>{title}</div>
        <div className="text-sm" style={{ color: COLORS.muted }}>{subtitle}</div>
      </div>
      {right}
    </li>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  let bg = "#FFF8E8", bd = "#F2E7C6", txt = "#7A7A7A";
  if (status === "approved") { bg = "#EAF8F0"; bd = "#CBEBDD"; txt = "#0F5132"; }
  if (status === "rejected") { bg = "#FEEDEF"; bd = "#F5C9CF"; txt = "#842029"; }
  return (
    <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium"
          style={{ background: bg, border: `1px solid ${bd}`, color: txt }}>
      {status === "pending" ? "قيد المراجعة" : status === "approved" ? "مقبول" : "مرفوض"}
    </span>
  );
}
