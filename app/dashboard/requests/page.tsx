"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import type { Session, JoinRequest } from "@/lib/types";
import { BadgeCheck, XCircle, RefreshCw, Users } from "lucide-react";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
} from "@/components/ui/select";

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

export default function RequestsPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);

  const [rows, setRows] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      const parsed: Session = JSON.parse(s);
      setSession(parsed);
    } catch {
      router.push("/");
    }
  }, [router]);

  const isAdmin = !!session && ["systemAdmin", "entityManager"].includes(session.role);

  const loadRequests = async (me: Session) => {
    setLoading(true);
    try {
      const url = isAdmin
        ? `/api/join-requests`
        : `/api/join-requests?userId=${encodeURIComponent(me.id)}`;
      const res = await fetch(url, { cache: "no-store" });
      const data: JoinRequest[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const loadEntities = async () => {
    try {
      const res = await fetch("/api/entities", { cache: "no-store" });
      const data = await res.json();
      const list: EntityLite[] = (Array.isArray(data) ? data : data?.entities || [])
        .filter((e: any) => e?.id && e?.name)
        .map((e: any) => ({ id: String(e.id), name: String(e.name) }));
      setEntities(list);
      if (!selectedEntity && list[0]?.id) setSelectedEntity(list[0].id);
    } catch {
      setEntities([]);
    }
  };

  useEffect(() => {
    if (!session) return;
    loadRequests(session);
    if (!isAdmin) loadEntities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // جرّب تجمع الطلبات حسب الحالة
  const grouped = useMemo(() => {
    const g: Record<"pending" | "approved" | "rejected", JoinRequest[]> = {
      pending: [], approved: [], rejected: []
    };
    for (const r of rows) g[r.status].push(r);
    return g;
  }, [rows]);

  // تحقق لو فيه طلب pending لنفس الكيان المختار
  const hasPendingForSelected = useMemo(() => {
    if (!selectedEntity) return false;
    return rows.some(r => r.entityId === selectedEntity && r.status === "pending");
  }, [rows, selectedEntity]);

  // ✅ جديد: تحقق لو المستخدم "مقبول" بالفعل في الكيان المختار
  const hasApprovedForSelected = useMemo(() => {
    if (!selectedEntity) return false;
    return rows.some(r => r.entityId === selectedEntity && r.status === "approved");
  }, [rows, selectedEntity]);

  // ✅ (اختياري ومفعّل): اخفي الكيانات اللي المستخدم عضو فيها بالفعل من الـ Select
  const filteredEntities = useMemo(() => {
    if (isAdmin) return entities;
    const approvedIds = new Set(rows.filter(r => r.status === "approved").map(r => r.entityId));
    const list = entities.filter(e => !approvedIds.has(e.id));
    // لو الكيان المختار اتشال من القائمة بعد الفلترة، اختار أول متاح
    if (selectedEntity && !list.find(e => e.id === selectedEntity)) {
      if (list[0]?.id) setSelectedEntity(list[0].id);
      else setSelectedEntity("");
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, rows, isAdmin]);

  const act = async (id: string, action: "approve" | "reject") => {
    if (!isAdmin || acting) return;
    setActing(id);
    try {
      const res = await fetch("/api/join-requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, decidedBy: session?.name || "admin" }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data?.error || "تعذّر تنفيذ الإجراء"); return; }

      const s = localStorage.getItem("session");
      if (s) {
        const me = JSON.parse(s);
        if (me.id === data.userId && action === "approve") {
          me.entityId = data.entityId;
          localStorage.setItem("session", JSON.stringify(me));
        }
      }
      if (session) await loadRequests(session);
    } catch (e: any) {
      alert(e?.message || "حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  const submitJoin = async () => {
    if (!session) return;
    if (!selectedEntity) { alert("اختر كيانًا أولاً"); return; }
    if (hasPendingForSelected) { alert("لديك طلب قيد المراجعة لهذا الكيان"); return; }
    if (hasApprovedForSelected) { alert("أنت عضو بالفعل في هذا الكيان"); return; }

    const ent = filteredEntities.find(e => e.id === selectedEntity) || entities.find(e => e.id === selectedEntity);
    if (!ent) { alert("الكيان غير موجود"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/join-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.id,
          userName: session.name,
          userEmail: session.email,
          entityId: ent.id,
          entityName: ent.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // هيعرض رسالة السيرفر (مثلاً: أنت بالفعل عضو في هذا الكيان / عندك طلب قيد المراجعة)
        alert(data?.error || "تعذّر إرسال الطلب");
        return;
      }
      alert("تم إرسال طلب الانضمام");
      await loadRequests(session);
    } catch (e: any) {
      alert(e?.message || "تعذّر إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return (
      <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
        <HeaderBar />
        <div className="mx-auto max-w-6xl w-full px-4 py-8">
          <SurfaceCard>
            <div className="p-5">
              <h2 className="text-lg font-semibold" style={{ color: COLORS.text }}>طلبات الانضمام</h2>
              <p className="text-sm mt-1" style={{ color: COLORS.muted }}>جاري التحقق من الجلسة…</p>
              <div className="h-24 mt-4 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text }}>
      <HeaderBar />

      {/* الهيدر */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <Users className="h-5 w-5" color={COLORS.text} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>طلبات الانضمام</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {isAdmin ? "مراجعة الطلبات واتخاذ القرار" : "اختر كيانًا لتقديم طلب الانضمام، وتابع حالة طلباتك"}
              </p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full grid place-items-center"
               style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
            {rows.length} طلب
          </div>
        </div>
      </section>

      {/* المحتوى */}
      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        {/* تقديم طلب (لغير الأدمن فقط) */}
        {!isAdmin && (
          <SurfaceCard className="mb-6">
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                <div>
                  <label className="block text-sm mb-1" style={{ color: COLORS.text }}>اختر الكيان</label>
                  <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                    <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                      <SelectValue placeholder="اختر الكيان" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEntities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={submitJoin}
                    disabled={
                      !selectedEntity ||
                      submitting ||
                      hasPendingForSelected ||
                      hasApprovedForSelected
                    }
                    className="h-11 px-5 rounded-full font-semibold"
                    style={{ background: COLORS.primary, color: "#FFFFFF", opacity: (!selectedEntity || submitting || hasPendingForSelected || hasApprovedForSelected) ? 0.6 : 1 }}
                  >
                    {submitting ? "جارٍ الإرسال..." : "تقديم طلب انضمام"}
                  </button>
                  <button
                    onClick={() => session && loadRequests(session)}
                    className="h-11 px-4 rounded-full"
                    style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {hasPendingForSelected && (
                <div className="text-sm" style={{ color: COLORS.muted }}>
                  لديك طلب قيد المراجعة لهذا الكيان بالفعل.
                </div>
              )}
              {hasApprovedForSelected && (
                <div className="text-sm" style={{ color: COLORS.muted }}>
                  أنت عضو بالفعل في هذا الكيان.
                </div>
              )}
            </div>
          </SurfaceCard>
        )}

        {/* قائمة الطلبات */}
        <SurfaceCard>
          <div className="p-5">
            {loading ? (
              <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
            ) : (
              <>
                {(["pending", "approved", "rejected"] as const).map((k) => (
                  <div key={k} className="mb-6">
                    <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
                      {k === "pending" ? "قيد المراجعة" : k === "approved" ? "المقبولة" : "المرفوضة"}
                    </h3>

                    {grouped[k].length === 0 ? (
                      <div className="text-sm" style={{ color: COLORS.muted }}>لا يوجد</div>
                    ) : (
                      <ul className="space-y-3">
                        {grouped[k].map((r) => (
                          <li
                            key={r.id}
                            className="rounded-2xl p-4 flex items-center justify-between"
                            style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
                          >
                            <div>
                              <div className="font-semibold" style={{ color: COLORS.text }}>
                                {r.userName}{" "}
                                <span className="text-sm" style={{ color: COLORS.muted }}>({r.userEmail})</span>
                              </div>
                              <div className="text-sm" style={{ color: COLORS.muted }}>
                                كيان: {r.entityName} • الحالة: {r.status} • بتاريخ: {new Date(r.createdAt).toLocaleString("ar-EG")}
                                {r.decidedAt ? ` • قرار: ${new Date(r.decidedAt!).toLocaleString("ar-EG")} بواسطة ${r.decidedBy || "-"}` : ""}
                              </div>
                            </div>

                            {/* أزرار القرار للمسؤول */}
                            {isAdmin && r.status === "pending" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={!!acting}
                                  onClick={() => act(r.id, "approve")}
                                  className="h-9 px-3 rounded-full flex items-center gap-2 font-medium"
                                  style={{ background: COLORS.primary, color: "#FFFFFF" }}
                                >
                                  <BadgeCheck className="h-4 w-4" /> موافقة
                                </button>
                                <button
                                  disabled={!!acting}
                                  onClick={() => act(r.id, "reject")}
                                  className="h-9 px-3 rounded-full flex items-center gap-2"
                                  style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                                >
                                  <XCircle className="h-4 w-4" /> رفض
                                </button>
                              </div>
                            ) : (
                              <StatusPill status={r.status} />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </SurfaceCard>
      </main>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
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
              { href: "/dashboard/requests", label: "طلبات الانضمام" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{
                  color: active(l.href) ? "#FFFFFF" : COLORS.text,
                  backgroundColor: active(l.href) ? COLORS.primary : "transparent",
                }}
              >
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
    <div
      className={`rounded-2xl ${className}`}
      style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
    >
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  let bg = "#FFF8E8", bd = "#F2E7C6", txt = COLORS.text;
  if (status === "approved") { bg = "#EAF8F0"; bd = "#CBEBDD"; }
  if (status === "rejected") { bg = "#FEEDEF"; bd = "#F5C9CF"; }
  return (
    <span
      className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium"
      style={{ background: bg, border: `1px solid ${bd}`, color: txt }}
    >
      {status === "pending" ? "قيد المراجعة" : status === "approved" ? "مقبول" : "مرفوض"}
    </span>
  );
}
