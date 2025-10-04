"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, ShieldCheck, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; role: UserRole };

type ManagerRequest = {
  id: string;
  entityId: string;
  applicantUserId: string;
  reason?: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  entityName?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
};

type EntityLite = { id: string; name: string };

async function safeJsonText<T>(res: Response, fallback: T): Promise<T> {
  try {
    const text = await res.text();
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch { return fallback; }
}

function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
  } catch { return ""; }
}

function buildHeaders(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const b64 = sessionHeaderB64();
  if (b64) h["x-session-b64"] = b64;
  return h;
}

/* نفس كارت السطح المستخدم في صفحة promotion-request */
function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl"
         style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      {children}
    </div>
  );
}

export default function ManagerRequestsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<ManagerRequest[]>([]);
  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isAllowed = useMemo(() => session?.role === "unionSupervisor", [session]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (session && !isAllowed) router.replace("/dashboard");
  }, [session, isAllowed, router]);

  useEffect(() => {
    if (session?.role !== "unionSupervisor") return;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [reqsRes, entsRes] = await Promise.all([
          fetch("/api/manager-requests?status=pending", { cache: "no-store", credentials: "include", headers: buildHeaders(false) }),
          fetch("/api/entities", { cache: "no-store" }),
        ]);

        if (reqsRes.status === 401) throw new Error("غير مصرح. الرجاء تسجيل الدخول.");
        if (reqsRes.status === 403) throw new Error("هذه الصفحة للمسؤول فقط (مسؤول الاتحاد).");

        const reqs = await safeJsonText<ManagerRequest[]>(reqsRes, []);
        const entsRaw = await safeJsonText<any>(entsRes, []);
        const ents: EntityLite[] = Array.isArray(entsRaw) ? entsRaw : Array.isArray(entsRaw?.entities) ? entsRaw.entities : [];

        setRows(Array.isArray(reqs) ? reqs : []);
        setEntities(ents.map((e: any) => ({ id: String(e.id), name: String(e.name || "") })));
      } catch (e: any) {
        setRows([]);
        setEntities([]);
        setErrorMsg(String(e?.message || "تعذر تحميل البيانات."));
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.role]);

  const entsMap = useMemo(() => Object.fromEntries(entities.map((e) => [String(e.id), e.name])), [entities]);

  const act = async (id: string, decision: "approve" | "reject") => {
    try {
      setActing(id);
      setErrorMsg(null);
      const res = await fetch("/api/manager-requests", {
        method: "PATCH",
        credentials: "include",
        headers: buildHeaders(true),
        body: JSON.stringify({ id, decision }),
      });
      if (res.status === 401) throw new Error("غير مصرح. الرجاء تسجيل الدخول.");
      if (res.status === 403) throw new Error("هذه الصفحة للمسؤول فقط (مسؤول الاتحاد).");
      const data = await safeJsonText<any>(res, {});
      if (!res.ok) throw new Error(data?.error || "FAILED");

      setRows(prev => prev.filter(r => r.id !== id)); // بعد القرار بنشيله من قائمة المعلّق
    } catch (e: any) {
      setErrorMsg("حصل خطأ أثناء تنفيذ الطلب: " + String(e?.message || e));
    } finally {
      setActing(null);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col"
         style={{ backgroundColor: "#EFE6DE", color: "#1D1D1D", fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      <HeaderBar />

      {/* هيدر الصفحة بنفس ستايل promotion-request */}
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div className="rounded-[22px] p-4 md:p-6 flex items-center justify-between"
             style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">طلبات تعيين مديري الكيانات</h1>
              <p className="text-sm" style={{ color: "#595959" }}>راجع وقرّر طلبات المديرين الجديدة.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 h-9 px-3 rounded-full font-semibold bg-[#EC1A24] text-white">
              الرجوع للوحة التحكم
            </Link>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        {!isAllowed && (
          <div className="mb-4 rounded-2xl p-3" style={{ backgroundColor: "#FFF5F5", border: "1px solid #FAD3D3", color: "#A82C2C" }}>
            هذه الصفحة مخصصة لمسؤول الاتحاد.
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 rounded-2xl p-3" style={{ backgroundColor: "#FFF5F5", border: "1px solid #FAD3D3", color: "#A82C2C" }}>
            {errorMsg}
          </div>
        )}

        <SurfaceCard>
          <div className="px-5 pt-5 flex items-center justify-between">
            <div className="text-sm" style={{ color: "#6B6B6B" }}>طلبات التعيين المعلقة</div>
            <button
              onClick={() => location.reload()}
              className="inline-flex items-center gap-2 h-8 px-3 rounded-full"
              style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <RefreshCw className="h-4 w-4" /> تحديث
            </button>
          </div>

          <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />

          <div className="px-5 pb-5">
            {loading ? (
              <div className="flex items-center gap-2" style={{ color: "#6B6B6B" }}>
                <RefreshCw className="h-4 w-4 animate-spin" /> جاري التحميل...
              </div>
            ) : rows.length === 0 ? (
              <div className="text-[#6B6B6B]">لا توجد طلبات حالياً.</div>
            ) : (
              <div className="space-y-3">
                {rows.map((r) => (
                  <div key={r.id} className="rounded-xl p-4 flex items-start justify-between gap-3"
                       style={{ backgroundColor: "#F9F9F9", border: "1px solid #EEE4DA" }}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {r.applicantName || r.applicantEmail || r.applicantUserId}
                        </span>
                        <span className="text-sm" style={{ color: "#6B6B6B" }}>
                          قدّم في {new Date(r.createdAt).toLocaleString("ar-EG")}
                        </span>
                        <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900 text-xs">قيد المراجعة</span>
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-semibold">الكيان:</span>{" "}
                        {r.entityName || entsMap[String(r.entityId)] || r.entityId}
                      </div>
                      {r.reason && (
                        <div className="text-sm mt-1" style={{ color: "#444" }}>
                          <span className="font-semibold">السبب:</span> {r.reason}
                        </div>
                      )}
                    </div>

                    {isAllowed ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => act(r.id, "approve")}
                          disabled={acting === r.id}
                          className="h-9 px-4 rounded-full font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: "#16A34A" }}>
                          <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> قبول</span>
                        </button>
                        <button
                          onClick={() => act(r.id, "reject")}
                          disabled={acting === r.id}
                          className="h-9 px-4 rounded-full font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: "#DC2626" }}>
                          <span className="inline-flex items-center gap-1"><XCircle className="h-4 w-4" /> رفض</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </SurfaceCard>
      </main>

      <FooterBar />
    </div>
  );
}

/* نفس الهيدر/الفوتر المستخدمين في صفحة promotion-request */
function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10" style={{ fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
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
    <footer className="mt-auto" style={{ fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
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
