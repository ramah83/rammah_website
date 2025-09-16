// /app/dashboard/entity-requests/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, ShieldCheck, RefreshCw, BadgeCheck, XCircle } from "lucide-react";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; email: string; name: string; role: UserRole | string };

type EntityRequest = {
  id: string;
  action: "create" | "update" | "delete";
  targetEntityId?: string | null;
  payload?: any;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  createdBy: string;
  createdByRole: "entityManager" | "unionSupervisor";
  approverRole: "unionSupervisor";
  createdByName?: string | null;
  createdByEmail?: string | null;
  decidedAt?: string | null;
  decidedBy?: string | null;
  note?: string | null;
};

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

function buildSessionHeaders(contentType = true): HeadersInit {
  const h: Record<string, string> = {};
  if (contentType) h["Content-Type"] = "application/json";
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

export default function EntityRequestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<EntityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.push("/"); return; }
      setSession(JSON.parse(s));
    } catch {
      router.push("/");
    }
  }, [router]);

  const isUnion = session?.role === "unionSupervisor";

  const load = async () => {
    setLoading(true);
    try {
      const url = `/api/entities/requests?status=${filter}`;
      const res = await fetch(url, { cache: "no-store", headers: buildSessionHeaders(false) });
      const data: EntityRequest[] = await res.json().catch(() => []);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (session) load(); }, [session, filter]);

  const grouped = useMemo(() => {
    const g: Record<"pending" | "approved" | "rejected", EntityRequest[]> = { pending: [], approved: [], rejected: [] };
    for (const r of rows) g[r.status].push(r);
    return g;
  }, [rows]);

  const approveOrReject = async (id: string, decision: "approve" | "reject") => {
    if (!isUnion || acting) return;
    setActing(id);
    try {
      const res = await fetch("/api/entities/requests", {
        method: "PATCH",
        headers: buildSessionHeaders(true),
        body: JSON.stringify({ id, decision, note: notes[id] || "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data?.error || "تعذّر تنفيذ الإجراء"); return; }
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: decision === "approve" ? "approved" : "rejected", note: notes[id] || r.note, decidedAt: new Date().toISOString() } : r));
    } catch (e: any) {
      alert(e?.message || "حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Cairo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Noto Sans Arabic'" }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[22px] p-5 md:p-6 flex items-center justify-between"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
              <ShieldCheck className="h-5 w-5" color={COLORS.text} />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>طلبات الكيانات</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>
                {isUnion ? "مراجعة واعتماد / رفض طلبات إنشاء/تعديل/حذف الكيانات" : "عرض فقط — الاعتماد من صلاحيات مسؤول اتحاد الكيانات"}
              </p>
            </div>
          </div>
          <div className="h-9 px-3 rounded-full grid place-items-center"
               style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
            {rows.length} طلب
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        <SurfaceCard className="mb-6">
          <div className="p-5 flex flex-wrap items-center gap-2">
            {(["pending","approved","rejected","all"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className="h-9 px-3 rounded-full text-sm"
                style={{
                  background: filter === s ? COLORS.primary : COLORS.card,
                  color: filter === s ? "#FFFFFF" : COLORS.text,
                  border: `1px solid ${filter === s ? COLORS.primary : COLORS.line}`
                }}
              >
                {s === "pending" ? "قيد المراجعة" : s === "approved" ? "المقبولة" : s === "rejected" ? "المرفوضة" : "الكل"}
              </button>
            ))}
            <button
              onClick={load}
              className="h-9 px-3 rounded-full ms-auto"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <Link
              href="/entities"
              className="h-9 px-3 rounded-full text-sm"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
            >
              فتح قائمة الكيانات
            </Link>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <div className="p-5">
            {loading ? (
              <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
            ) : rows.length === 0 ? (
              <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد طلبات</div>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => {
                  const p = r.payload ? (typeof r.payload === "string" ? safeParse(r.payload) : r.payload) : {};
                  const title =
                    r.action === "create" ? `طلب إنشاء كيان: ${p?.name || "—"}`
                    : r.action === "update" ? `طلب تعديل كيان: ${p?.name || r.targetEntityId || "—"}`
                    : `طلب حذف كيان: ${p?.name || r.targetEntityId || "—"}`;

                  return (
                    <li key={r.id}
                        className="rounded-2xl p-4"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold" style={{ color: COLORS.text }}>{title}</div>
                          <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                            مقدَّم بواسطة: {r.createdByName || "—"} ({r.createdByEmail || "—"}) • {new Date(r.createdAt).toLocaleString("ar-EG")}
                          </div>
                          <div className="text-sm mt-2" style={{ color: COLORS.text }}>
                            {r.action !== "delete" && (
                              <>
                                <div>نوع الكيان: {p?.type || "—"}</div>
                                <div>هاتف: {p?.phone || "—"} • بريد: {p?.contactEmail || "—"}</div>
                                <div>الموقع: {p?.location || "—"}</div>
                              </>
                            )}
                          </div>
                          {r.note && r.status !== "pending" && (
                            <div className="mt-2 text-xs" style={{ color: COLORS.muted }}>
                              ملاحظة القرار: {r.note}
                            </div>
                          )}
                        </div>

                        {isUnion && r.status === "pending" ? (
                          <div className="shrink-0 w-full md:w-[280px]">
                            <textarea
                              value={notes[r.id] || ""}
                              onChange={(e) => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="ملاحظة (اختياري)"
                              className="w-full mb-2 rounded-xl px-3 py-2 text-sm"
                              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                              rows={2}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                disabled={!!acting}
                                onClick={() => approveOrReject(r.id, "approve")}
                                className="h-9 px-3 rounded-full flex items-center gap-2 font-medium"
                                style={{ background: COLORS.primary, color: "#FFFFFF" }}
                              >
                                <BadgeCheck className="h-4 w-4" /> موافقة
                              </button>
                              <button
                                disabled={!!acting}
                                onClick={() => approveOrReject(r.id, "reject")}
                                className="h-9 px-3 rounded-full flex items-center gap-2"
                                style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                              >
                                <XCircle className="h-4 w-4" /> رفض
                              </button>
                            </div>
                          </div>
                        ) : (
                          <StatusPill status={r.status} />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
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
            <Link href="/" className="font-semibold" style={{ color: COLORS.text, fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
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
              { href: "/dashboard/entity-requests", label: "طلبات الكيانات" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{
                  color: active(l.href) ? "#FFFFFF" : COLORS.text,
                  backgroundColor: active(l.href) ? COLORS.primary : "transparent",
                  fontFamily: "'Cairo', ui-sans-serif, system-ui",
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
    <div className={`rounded-2xl ${className}`} style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  let bg = "#FFF8E8", bd = "#F2E7C6", txt = COLORS.text;
  if (status === "approved") { bg = "#EAF8F0"; bd = "#CBEBDD"; }
  if (status === "rejected") { bg = "#FEEDEF"; bd = "#F5C9CF"; }
  return (
    <span className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium"
          style={{ background: bg, border: `1px solid ${bd}`, color: txt, fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      {status === "pending" ? "قيد المراجعة" : status === "approved" ? "مقبول" : "مرفوض"}
    </span>
  );
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
