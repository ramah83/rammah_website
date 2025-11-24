"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, ShieldCheck, RefreshCw, Clock, CheckCircle2, AlertCircle, FileText, Building2 } from "lucide-react";

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
  const [allRows, setAllRows] = useState<EntityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("all");
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

  // فلترة الطلبات حسب الحالة المختارة
  const rows = useMemo(() => {
    if (filter === "all") return allRows;
    return allRows.filter(r => r.status === filter);
  }, [allRows, filter]);

  // حساب عدد الطلبات لكل حالة
  const counts = useMemo(() => {
    return {
      all: allRows.length,
      pending: allRows.filter(r => r.status === "pending").length,
      approved: allRows.filter(r => r.status === "approved").length,
      rejected: allRows.filter(r => r.status === "rejected").length,
    };
  }, [allRows]);

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // جلب كل الطلبات
      const url = `/api/entities/requests?status=all`;
      const res = await fetch(url, { cache: "no-store", headers: buildSessionHeaders(false) });
      const data: EntityRequest[] = await res.json().catch(() => []);
      setAllRows(Array.isArray(data) ? data : []);
    } catch {
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { 
    load(); 
  }, [session?.id]);

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
      setAllRows(prev => prev.map(r => r.id === id ? { ...r, status: decision === "approve" ? "approved" : "rejected", note: notes[id] || r.note, decidedAt: new Date().toISOString() } : r));
    } catch (e: any) {
      alert(e?.message || "حدث خطأ");
    } finally {
      setActing(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Cairo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Noto Sans Arabic'" }}>
      <HeaderBar />

      <section className="relative z-[1] mx-auto max-w-6xl w-full px-4 pt-8">
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

      <main className="relative z-[1] mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        <SurfaceCard className="mb-6">
          <div className="p-5 flex flex-wrap items-center gap-3">
            {(["all", "pending", "approved", "rejected"] as const).map(s => {
              const label = s === "all" ? "الكل" : s === "pending" ? "قيد المراجعة" : s === "approved" ? "المقبولة" : "المرفوضة";
              const count = counts[s];
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="h-10 px-4 rounded-full text-sm font-semibold transition-all hover:opacity-80 flex items-center gap-2"
                  style={{
                    background: filter === s ? COLORS.primary : COLORS.card,
                    color: filter === s ? "#FFFFFF" : COLORS.text,
                    border: `1px solid ${filter === s ? COLORS.primary : COLORS.line}`
                  }}
                >
                  <span>{label}</span>
                  <span className="h-5 w-5 rounded-full grid place-items-center text-xs font-bold"
                        style={{ 
                          background: filter === s ? "rgba(255,255,255,0.2)" : COLORS.soft,
                          color: filter === s ? "#FFFFFF" : COLORS.text
                        }}>
                    {count}
                  </span>
                </button>
              );
            })}
            <button
              onClick={load}
              className="h-9 px-3 rounded-full ms-auto transition-all hover:bg-opacity-80"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <Link
              href="/entities"
              className="h-9 px-3 rounded-full text-sm font-medium transition-all hover:bg-opacity-80"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
            >
              فتح قائمة الكيانات
            </Link>
          </div>
        </SurfaceCard>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: COLORS.soft }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <SurfaceCard>
            <div className="p-12 text-center">
              <div className="h-16 w-16 rounded-2xl mx-auto mb-4 grid place-items-center" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                <FileText className="h-8 w-8" style={{ color: COLORS.muted }} />
              </div>
              <div className="font-semibold text-lg mb-2" style={{ color: COLORS.text }}>لا توجد طلبات</div>
              <div className="text-sm" style={{ color: COLORS.muted }}>
                {filter === "pending" ? "لا توجد طلبات قيد المراجعة حالياً" : 
                 filter === "approved" ? "لا توجد طلبات مقبولة" :
                 filter === "rejected" ? "لا توجد طلبات مرفوضة" : "لا توجد أي طلبات"}
              </div>
            </div>
          </SurfaceCard>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => {
              const p = r.payload ? (typeof r.payload === "string" ? safeParse(r.payload) : r.payload) : {};
              const actionIcon = r.action === "create" ? <Building2 className="h-5 w-5" /> : 
                                 r.action === "update" ? <FileText className="h-5 w-5" /> : 
                                 <AlertCircle className="h-5 w-5" />;
              const actionLabel = r.action === "create" ? "إنشاء كيان جديد" : 
                                  r.action === "update" ? "تعديل كيان" : "حذف كيان";
              const actionColor = r.action === "create" ? "#0F5132" : 
                                  r.action === "update" ? "#055160" : "#7A0010";

              return (
                <SurfaceCard key={r.id}>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-xl grid place-items-center shrink-0" 
                             style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: actionColor }}>
                          {actionIcon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="inline-flex items-center h-6 px-2 rounded-full text-xs font-medium"
                                  style={{ background: `${actionColor}15`, color: actionColor, border: `1px solid ${actionColor}30` }}>
                              {actionLabel}
                            </span>
                            <StatusPill status={r.status} />
                          </div>
                          <h3 className="font-bold text-lg" style={{ color: COLORS.text }}>
                            {p?.name || r.targetEntityId || "—"}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: COLORS.muted }}>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(r.createdAt).toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {r.action !== "delete" && (
                      <div className="rounded-xl p-4 mb-4" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="font-medium mb-1" style={{ color: COLORS.muted }}>نوع الكيان</div>
                            <div style={{ color: COLORS.text }}>{p?.type || "—"}</div>
                          </div>
                          <div>
                            <div className="font-medium mb-1" style={{ color: COLORS.muted }}>الموقع</div>
                            <div style={{ color: COLORS.text }}>{p?.location || "—"}</div>
                          </div>
                          <div>
                            <div className="font-medium mb-1" style={{ color: COLORS.muted }}>البريد الإلكتروني</div>
                            <div style={{ color: COLORS.text }}>{p?.contactEmail || "—"}</div>
                          </div>
                          <div>
                            <div className="font-medium mb-1" style={{ color: COLORS.muted }}>الهاتف</div>
                            <div style={{ color: COLORS.text }}>{p?.phone || "—"}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: COLORS.muted }}>
                      <Users className="h-4 w-4" />
                      <span>مقدم الطلب: <strong style={{ color: COLORS.text }}>{r.createdByName || "—"}</strong></span>
                      {r.createdByEmail && <span>({r.createdByEmail})</span>}
                    </div>

                    {r.note && r.status !== "pending" && (
                      <div className="rounded-xl p-3 mb-4" style={{ background: "#FFF8E8", border: "1px solid #F2E7C6" }}>
                        <div className="text-xs font-medium mb-1" style={{ color: "#6B5400" }}>ملاحظة القرار</div>
                        <div className="text-sm" style={{ color: "#8B7000" }}>{r.note}</div>
                      </div>
                    )}

                    {isUnion && r.status === "pending" && (
                      <div className="pt-4 border-t" style={{ borderColor: COLORS.line }}>
                        <textarea
                          value={notes[r.id] || ""}
                          onChange={(e) => setNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="أضف ملاحظة (اختياري)..."
                          className="w-full mb-3 rounded-xl px-4 py-3 text-sm resize-none"
                          style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                          rows={2}
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            disabled={!!acting}
                            onClick={() => approveOrReject(r.id, "approve")}
                            className="h-10 px-4 rounded-full flex items-center gap-2 font-semibold transition-opacity disabled:opacity-50"
                            style={{ background: "#0F5132", color: "#FFFFFF" }}
                          >
                            <CheckCircle2 className="h-4 w-4" /> الموافقة على الطلب
                          </button>
                          <button
                            disabled={!!acting}
                            onClick={() => approveOrReject(r.id, "reject")}
                            className="h-10 px-4 rounded-full flex items-center gap-2 font-semibold transition-opacity disabled:opacity-50"
                            style={{ background: "#7A0010", color: "#FFFFFF" }}
                          >
                            <AlertCircle className="h-4 w-4" /> رفض الطلب
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </SurfaceCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-[100001]">
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
              { href: "/profile", label: "الملف الشخصى" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
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
  let bg = "#FFF8E8", bd = "#F2E7C6", txt = "#6B5400", icon = <Clock className="h-3 w-3" />;
  if (status === "approved") { 
    bg = "#E8F7EE"; 
    bd = "#CBE9D6"; 
    txt = "#0F5132";
    icon = <CheckCircle2 className="h-3 w-3" />;
  }
  if (status === "rejected") { 
    bg = "#FFF0F0"; 
    bd = "#F5C2C7"; 
    txt = "#7A0010";
    icon = <AlertCircle className="h-3 w-3" />;
  }
  return (
    <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full text-xs font-semibold"
          style={{ background: bg, border: `1px solid ${bd}`, color: txt, fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      {icon}
      {status === "pending" ? "قيد المراجعة" : status === "approved" ? "مقبول ✓" : "مرفوض ✗"}
    </span>
  );
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return {}; }
}
