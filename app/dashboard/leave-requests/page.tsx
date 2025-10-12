"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Cairo } from "next/font/google";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import {
  Users, ShieldCheck, LogOut, Check, X, Filter, Clock, Layers, User as UserIcon, Search, RefreshCcw, Inbox,
} from "lucide-react";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400","500","600","700","800"], display: "swap" });
const COLORS = {
  text: "#1D1D1D",
  muted: "#6B6B6B",
  bg: "#F7F5F2",
  card: "#FFFFFF",
  border: "#E7E2DC",
  line: "#E3E3E3",
  soft: "#F6F6F6",
  primary: "#EC1A24",
  danger: "#B42318",
  success: "#0F5132",
  amber: "#E8B000",
};

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  entityId?: string | null;
};
type LeaveRequestRow = {
  id: string;
  action: "leave_membership";
  targetEntityId: string;
  entityName: string | null;
  payload: { userId?: string; reason?: string | null; ccRoles?: string[] } | null;
  status: "pending" | "approved" | "rejected";
  createdBy: string;
  userName: string | null;
  userEmail: string | null;
  approverRole: "entityManager" | "unionSupervisor" | "";
  createdAt: string;
  note: string | null;
};

const roleLabel: Record<UserRole, string> = {
  unionSupervisor: "مسؤول اتحاد الكيانات",
  entityManager: "مدير كيان",
  user: "مستخدم",
};

async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  const txt = await res.text();
  if (!res.ok) {
    console.error("Response Error:", txt || res.statusText);  // Logging the error
    throw new Error(txt || res.statusText);  // Throw error to handle it in catch block
  }
  if (!txt) return fallback;
  try {
    return JSON.parse(txt) as T;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return fallback;  // Return fallback if JSON parsing fails
  }
}

async function safeFetch(url: string, init: RequestInit = {}) {
  const h = new Headers(init.headers || {});
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    h.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers: h, credentials: "include", cache: "no-store" });
}

export default function LeaveRequestsPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<LeaveRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"all"|"pending"|"approved"|"rejected">("all");
  const [query, setQuery] = useState("");
  const [entityIdFilter, setEntityIdFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => setHydrated(true), []);
  useEffect(() => { if (hydrated) setMounted(true); }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const s = localStorage.getItem("session");
    if (!s) { router.replace("/"); return; }
    try { 
      setSession(JSON.parse(s)); 
    } catch { 
      router.replace("/"); 
    }
  }, [hydrated, router]);

  const loadData = useCallback(async () => {
    if (!session?.id || !session.role || session.role === "user") {
      setRows([]); 
      setLoading(false); 
      return;
    }

    try {
      setLoading(true);
      const q = new URLSearchParams();
      q.set("status", status);

      const r = await safeFetch(`/api/membership/leave-requests?${q.toString()}`);
      if (!r.ok) {
        console.error("Failed to fetch leave requests:", r.status, r.statusText);  // Log error when fetch fails
        setRows([]);
        setLoading(false);
        return;
      }

      const data = await safeJson<LeaveRequestRow[]>(r, []);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading leave requests:", err);  // Log error in catch block
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [session?.id, session?.role, status]);

  useEffect(() => { 
    if (session?.role && session.role !== "user") {
      loadData(); 
    }
  }, [session?.role, status, loadData]);

  const canUse = session?.role === "entityManager" || session?.role === "unionSupervisor";
  const isManager = session?.role === "entityManager";
  const isUnion = session?.role === "unionSupervisor";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = rows;

    // فلترة بالبحث النصي
    if (q) {
      result = result.filter(r => {
        const e = (r.entityName || r.targetEntityId || "").toLowerCase();
        const u = (r.userName || "").toLowerCase();
        const m = (r.userEmail || "").toLowerCase();
        const reason = (r?.payload?.reason || r.note || "").toLowerCase();
        return e.includes(q) || u.includes(q) || m.includes(q) || reason.includes(q) || r.id.toLowerCase().includes(q);
      });
    }

    // فلترة بالكيان
    const f = entityIdFilter.trim().toLowerCase();
    if (f) {
      result = result.filter(r => {
        const e = (r.entityName || r.targetEntityId || "").toLowerCase();
        return e.includes(f);
      });
    }

    return result;
  }, [rows, query, entityIdFilter]);

  const counts = useMemo(() => {
    const cAll = rows.length;
    const cP = rows.filter(r => r.status === "pending").length;
    const cA = rows.filter(r => r.status === "approved").length;
    const cR = rows.filter(r => r.status === "rejected").length;
    return { all: cAll, pending: cP, approved: cA, rejected: cR };
  }, [rows]);

  const approve = async (row: LeaveRequestRow) => {
    if (!confirm(`تأكيد الموافقة على مغادرة العضو${row.userName ? " " + row.userName : ""}؟\nسيُزال فورًا من الكيان.`)) return;
    try {
      setBusyId(row.id);
      const r = await safeFetch("/api/membership/leave-requests", { 
        method: "PATCH", 
        body: JSON.stringify({ id: row.id, decision: "approve" }) 
      });
      const d = await safeJson<any>(r, {});
      if (!r.ok) throw new Error(d?.error || "تعذر الموافقة");
      await loadData();
    } catch (e: any) {
      alert(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (row: LeaveRequestRow) => {
    const note = prompt("سبب الرفض (اختياري):") || null;
    if (!confirm(`تأكيد رفض طلب المغادرة${row.userName ? " للعضو " + row.userName : ""}؟`)) return;
    try {
      setBusyId(row.id);
      const r = await safeFetch("/api/membership/leave-requests", { 
        method: "PATCH", 
        body: JSON.stringify({ id: row.id, decision: "reject", note }) 
      });
      const d = await safeJson<any>(r, {});
      if (!r.ok) throw new Error(d?.error || "تعذر الرفض");
      await loadData();
    } catch (e: any) {
      alert(String(e?.message || e));
    } finally {
      setBusyId(null);
    }
  };

  const StatusChip = ({label, value, active, onClick}: {label: string; value: number; active: boolean; onClick: () => void}) => (
    <button
      onClick={onClick}
      className={`h-10 px-4 rounded-full text-sm font-medium transition-all ${active ? "text-white" : "text-[#1D1D1D]"} hover:shadow-sm active:scale-[0.98]`}
      style={{ background: active ? COLORS.primary : "#fff", border: `1px solid ${active ? COLORS.primary : COLORS.line}` }}
    >
      {label} • {value}
    </button>
  );

  const emptyMsg = useMemo(() => {
    if (loading) return "جارٍ التحميل...";
    if (!filtered.length && rows.length > 0) return "لا توجد نتائج مطابقة للبحث.";
    if (!filtered.length) return "لا توجد طلبات مغادرة حتى الآن.";
    return "";
  }, [loading, filtered.length, rows.length]);

  return (
    <div className={`${cairo.className} min-h-screen flex flex-col`} style={{ background: COLORS.bg, color: COLORS.text }}>
      <HeaderBar />
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div
          className="rounded-[22px] p-4 md:p-6 flex items-center justify-between transition-all duration-500"
          style={{
            background: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
            transform: mounted ? "none" : "translateY(8px)",
            opacity: mounted ? 1 : 0,
          }}
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">طلبات مغادرة العضوية</h1>
            <p className="text-sm md:text-base" style={{ color: COLORS.muted }}>
              {session ? <>واجهة مخصصة لـ {roleLabel[session.role]}</> : " "}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <span className="inline-flex items-center rounded-full px-3 h-8 text-sm" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                <ShieldCheck className="h-4 w-4 me-1" />
                {roleLabel[session.role]}
              </span>
            )}
            <button 
              onClick={() => { 
                try { localStorage.removeItem("session"); } catch {} 
                router.replace("/"); 
              }} 
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full font-semibold" 
              style={{ background: COLORS.primary, color: "#FFFFFF" }}
            >
              <LogOut className="h-4 w-4" /> خروج
            </button>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10 flex-1">
        {!canUse ? (
          <Card className="rounded-[22px] bg-white border border-[#E7E2DC]">
            <CardHeader>
              <CardTitle>غير مصرح</CardTitle>
              <CardDescription>هذه الصفحة متاحة لمديري الكيانات ومسؤولي الاتحاد فقط.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard title="الكل" value={counts.all} />
              <MetricCard title="معلّق" value={counts.pending} tone="amber" />
              <MetricCard title="مقبول" value={counts.approved} tone="green" />
              <MetricCard title="مرفوض" value={counts.rejected} tone="red" />
            </div>

            <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
              <CardHeader className="pb-0">
                <CardTitle className="text-lg">قائمة الطلبات</CardTitle>
                <CardDescription className="text-sm" style={{ color: COLORS.muted }}>
                  يمكنك الموافقة (خروج فوري) أو الرفض
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between transition-all duration-300">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-2 text-sm px-3 h-10 rounded-xl" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                      <Filter className="h-4 w-4" /> فِلتر
                    </span>
                    <StatusChip label="الكل" value={counts.all} active={status === "all"} onClick={() => setStatus("all")} />
                    <StatusChip label="معلّق" value={counts.pending} active={status === "pending"} onClick={() => setStatus("pending")} />
                    <StatusChip label="مقبول" value={counts.approved} active={status === "approved"} onClick={() => setStatus("approved")} />
                    <StatusChip label="مرفوض" value={counts.rejected} active={status === "rejected"} onClick={() => setStatus("rejected")} />
                  </div>
                  <div className="flex items-center gap-2">
                    {(isUnion || isManager) && (
                      <input
                        value={entityIdFilter}
                        onChange={e => setEntityIdFilter(e.target.value)}
                        placeholder="فلترة بالكيان"
                        className="h-10 px-3 rounded-xl text-sm outline-none"
                        style={{ background: "#fff", border: `1px solid ${COLORS.line}`, color: COLORS.text, minWidth: 180 }}
                      />
                    )}
                    <div className="relative">
                      <Search className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="ابحث بالعضو/البريد/السبب"
                        className="h-10 pe-9 ps-3 rounded-xl text-sm outline-none"
                        style={{ background: "#fff", border: `1px solid ${COLORS.line}`, color: COLORS.text, minWidth: 240 }}
                      />
                    </div>
                    <button 
                      onClick={loadData} 
                      className="h-10 px-3 rounded-xl text-sm inline-flex items-center gap-2 transition-colors hover:bg-gray-50" 
                      style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}
                    >
                      <RefreshCcw className="h-4 w-4" /> تحديث
                    </button>
                  </div>
                </div>

                <div className="mt-4 overflow-auto rounded-xl border" style={{ borderColor: COLORS.line }}>
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#FAFAFA]" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                        <Th>العضو</Th>
                        <Th>البريد</Th>
                        <Th>الكيان</Th>
                        <Th>السبب</Th>
                        <Th>الحالة</Th>
                        <Th>أنشئ في</Th>
                        <Th className="text-center">إجراءات</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && Array.from({length: 6}).map((_, i) => (
                        <tr key={`sk-${i}`} className="animate-pulse" style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                          <Td><div className="h-4 w-32 bg-[#F0F0F0] rounded" /></Td>
                          <Td><div className="h-4 w-40 bg-[#F0F0F0] rounded" /></Td>
                          <Td><div className="h-4 w-40 bg-[#F0F0F0] rounded" /></Td>
                          <Td><div className="h-4 w-64 bg-[#F0F0F0] rounded" /></Td>
                          <Td><div className="h-7 w-20 bg-[#F0F0F0] rounded-full" /></Td>
                          <Td><div className="h-4 w-36 bg-[#F0F0F0] rounded" /></Td>
                          <Td><div className="h-9 w-40 bg-[#F0F0F0] rounded-full mx-auto" /></Td>
                        </tr>
                      ))}

                      {!loading && filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-10 text-center">
                            <div className="flex flex-col items-center gap-3 text-[#6B6B6B]">
                              <div
                                className="h-12 w-12 rounded-2xl flex items-center justify-center"
                                style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}
                              >
                                <Inbox className="h-6 w-6" />
                              </div>
                              <div className="text-sm">{emptyMsg}</div>
                            </div>
                          </td>
                        </tr>
                      )}

                      {!loading && filtered.map((r, idx) => {
                        const reason = r?.payload?.reason || r.note || "—";
                        const eName = r.entityName || r.targetEntityId || "—";
                        const badge = r.status === "pending"
                          ? { t: "معلّق", bg: "#FFF7E6", fg: COLORS.amber }
                          : r.status === "approved"
                          ? { t: "مقبول", bg: "#E8F7EE", fg: COLORS.success }
                          : { t: "مرفوض", bg: "#FFF0F0", fg: "#7A0010" };
                        const disabled = busyId === r.id || r.status !== "pending";
                        
                        return (
                          <tr
                            key={r.id}
                            className="hover:bg-[#FAFAFA] transition-all"
                            style={{
                              borderBottom: `1px solid ${COLORS.line}`,
                              opacity: mounted ? 1 : 0,
                              transform: mounted ? "none" : "translateY(6px)",
                              transitionDelay: `${Math.min(idx, 10) * 40}ms`,
                            }}
                          >
                            <Td>
                              <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                {r.userName || "—"}
                              </div>
                            </Td>
                            <Td>{r.userEmail || "—"}</Td>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                {eName}
                              </div>
                            </Td>
                            <Td style={{ maxWidth: 320 }}>
                              <div className="truncate" title={String(reason)}>{String(reason)}</div>
                            </Td>
                            <Td>
                              <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs" style={{ background: badge.bg, color: badge.fg }}>
                                {r.status === "pending" ? <Clock className="h-3.5 w-3.5" /> : r.status === "approved" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                                {badge.t}
                              </span>
                            </Td>
                            <Td>{new Date(r.createdAt).toLocaleString("ar-EG")}</Td>
                            <Td>
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => approve(r)} 
                                  disabled={disabled} 
                                  className="h-9 px-3 rounded-full text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-[0.98]" 
                                  style={{ background: COLORS.primary, color: "#fff" }}
                                >
                                  موافقة
                                </button>
                                <button 
                                  onClick={() => reject(r)} 
                                  disabled={disabled} 
                                  className="h-9 px-3 rounded-full text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-[0.98]" 
                                  style={{ background: "#FFFFFF", color: COLORS.danger, border: `1px solid ${COLORS.line}` }}
                                >
                                  رفض
                                </button>
                              </div>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs" style={{ color: COLORS.muted }}>
                  عند الموافقة يتم خروج العضو فورًا من الكيان. عند الرفض يُغلق الطلب نهائيًا.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({ title, value, tone }: { title: string; value: number; tone?: "green"|"red"|"amber" }) {
  const bg = tone === "green" ? "#E8F7EE" : tone === "red" ? "#FFF0F0" : tone === "amber" ? "#FFF7E6" : "#F6F6F6";
  const fg = tone === "green" ? "#0F5132" : tone === "red" ? "#7A0010" : tone === "amber" ? "#E8B000" : "#1D1D1D";
  return (
    <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid ${COLORS.border}`, boxShadow: "0 6px 14px rgba(0,0,0,0.04)" }}>
      <div className="text-xs mb-1" style={{ color: COLORS.muted }}>{title}</div>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="mt-3 inline-flex items-center gap-2 px-2.5 h-7 rounded-full text-xs" style={{ background: bg, color: fg, border: `1px solid ${COLORS.line}` }}>
        {title}
      </div>
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border border-[#E7E2DC] shadow-[0_6px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#F6F6F6] border border-[#E5E5E5]">
              <Users className="h-5 w-5 text-[#1D1D1D]" />
            </div>
            <Link href="/" className="font-semibold text-[#1D1D1D]">منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[ 
              { href: "/profile", label: "الملف الشخصى" }, 
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/dashboard/requests", label: "طلبات الانضمام" },
              { href: "/dashboard/leave-requests", label: "طلبات المغادرة" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D] hover:bg-gray-100"}`}
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

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-right text-xs font-semibold p-3 ${className || ""}`} style={{ color: COLORS.muted }}>
      {children}
    </th>
  );
}

function Td({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <td className={`p-3 align-middle ${className || ""}`} style={style}>
      {children}
    </td>
  );
}
