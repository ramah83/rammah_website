
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, ShieldCheck, CheckCircle2, XCircle, RefreshCw, ArrowRight } from "lucide-react";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; role: UserRole };

type AdminPromotionRequest = {
  id: string;
  applicantUserId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
  note?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
};

async function safeJsonText<T>(res: Response, fallback: T): Promise<T> {
  try {
    const text = await res.text();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function buildHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const raw = localStorage.getItem("session") || "";
    if (raw) h["x-session-b64"] = btoa(unescape(encodeURIComponent(raw)));
  } catch {}
  return h;
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<AdminPromotionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isUnion = useMemo(() => session?.role === "unionSupervisor", [session]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (session && session.role !== "unionSupervisor") router.replace("/dashboard");
  }, [session, router]);

  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin-promotion-requests?status=pending", {
        cache: "no-store",
        credentials: "include",
        headers: buildHeaders(),
      });

      if (res.status === 401) throw new Error("غير مصرح. الرجاء تسجيل الدخول.");
      if (res.status === 403) throw new Error("هذه الصفحة للمسؤول فقط (مسؤول اتحاد الكيانات).");

      if (!res.ok) {
        const data = await safeJsonText<any>(res, {});
        throw new Error(data?.error || "FAILED");
      }

      const data = await safeJsonText<AdminPromotionRequest[]>(res, []);
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setRows([]);
      setErrorMsg(String(e?.message || "تعذر تحميل البيانات."));
    } finally {
      setLoading(false);
    }
  };

  
  useEffect(() => {
    if (session?.role === "unionSupervisor") load();
  }, [session?.role]);

  const act = async (id: string, decision: "approve" | "reject") => {
    try {
      setActing(id);
      setErrorMsg(null);

      const res = await fetch("/api/admin-promotion-requests", {
        method: "PATCH",
        credentials: "include",
        headers: buildHeaders(),
        body: JSON.stringify({ id, decision }),
      });

      if (res.status === 401) throw new Error("غير مصرح. الرجاء تسجيل الدخول.");
      if (res.status === 403) throw new Error("هذه الصفحة للمسؤول فقط (مسؤول اتحاد الكيانات).");

      const data = await safeJsonText<any>(res, {});
      if (!res.ok) throw new Error(data?.error || "FAILED");

      await load();
    } catch (e: any) {
      setErrorMsg("تعذر تنفيذ العملية: " + String(e?.message || e));
    } finally {
      setActing(null);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col"
         style={{ backgroundColor: "#EFE6DE", color: "#1D1D1D", fontFamily: '"Cairo", system-ui' }}>
      <HeaderBar />

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div className="rounded-[22px] p-4 md:p-6 flex items-center justify-between"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">طلبات ترقية “مسؤول اتحاد كيانات”</h1>
              <p className="text-sm" style={{ color: "#595959" }}>مراجعة وقبول/رفض طلبات الترقية إلى مسؤول الاتحاد.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 h-9 px-3 rounded-full font-semibold bg-[#EC1A24] text-white">
              الرجوع للوحة التحكم
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        {errorMsg && (
          <div className="mb-4 rounded-2xl p-3"
               style={{ backgroundColor: "#FFF5F5", border: "1px solid #FAD3D3", color: "#A82C2C" }}>
            {errorMsg}
            <button onClick={load} className="ms-2 underline">إعادة المحاولة</button>
          </div>
        )}

        <SurfaceCard>
          <div className="px-5 pt-5">
            <div className="text-sm" style={{ color: "#6B6B6B" }}>قائمة الطلبات قيد المراجعة</div>
          </div>
          <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />
          <div className="px-5 pb-5">
            {loading ? (
              <div className="flex items-center gap-2" style={{ color: "#6B6B6B" }}>
                <RefreshCw className="h-4 w-4 animate-spin" /> جاري التحميل...
              </div>
            ) : !errorMsg && rows.length === 0 ? (
              <div className="text-[#6B6B6B]">لا توجد طلبات حالياً.</div>
            ) : !errorMsg ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="text-[#1D1D1D]" style={{ backgroundColor: "#EFE6DE" }}>
                      <th className="p-3 text-right">التاريخ</th>
                      <th className="p-3 text-right">المتقدّم</th>
                      <th className="p-3 text-right">الحالة</th>
                      <th className="p-3 text-right">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b">
                        <td className="p-3">{new Date(r.createdAt).toLocaleString("ar-EG")}</td>
                        <td className="p-3 font-medium">{r.applicantName || r.applicantUserId} — {r.applicantEmail}</td>
                        <td className="p-3">
                          {r.status === "pending" && <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900">قيد المراجعة</span>}
                          {r.status === "approved" && <span className="rounded bg-green-100 px-2 py-1 text-green-900">مقبول</span>}
                          {r.status === "rejected" && <span className="rounded bg-red-100 px-2 py-1 text-red-900">مرفوض</span>}
                        </td>
                        <td className="p-3">
                          {r.status === "pending" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => act(r.id, "approve")}
                                disabled={acting === r.id}
                                className="rounded-md px-3 py-1 font-semibold bg-[#EC1A24] text-white disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4" /> قبول
                                </span>
                              </button>
                              <button
                                onClick={() => act(r.id, "reject")}
                                disabled={acting === r.id}
                                className="rounded-md px-3 py-1 font-semibold bg-[#EC1A24] text-white disabled:opacity-50"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <XCircle className="h-4 w-4" /> رفض
                                </span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#6B6B6B]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </SurfaceCard>
      </main>

      <FooterBar />
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10" style={{ fontFamily: '"Cairo", system-ui' }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <Users className="h-5 w-5" color="#1D1D1D" />
            </div>
            <Link href="/" className="font-semibold" style={{ color: "#1D1D1D" }}>منصة الكيانات الشبابية</Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/profile", label: "الملف الشخصى" },
              { href: "/dashboard", label: "لوحة التحكم" },
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                    className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="mt-auto" style={{ fontFamily: '"Cairo", system-ui' }}>
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-2xl px-4 py-3 text-sm flex items-center justify-between"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#6B6B6B" }}>
          <span>© {new Date().getFullYear()} منصة الكيانات الشبابية</span>
          <span><Link href="/support" className="underline">الدعم</Link> • <Link href="/about" className="underline">عن المنصة</Link></span>
        </div>
      </div>
    </footer>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl"
         style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", fontFamily: '"Cairo", system-ui' }}>
      {children}
    </div>
  );
}
