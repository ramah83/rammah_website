"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ShieldCheck, CheckCircle2, XCircle, RefreshCw, Users } from "lucide-react";

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
  } catch {
    return fallback;
  }
}

function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
  } catch {
    return "";
  }
}

function buildHeaders(json = true): HeadersInit {
  const h: Record<string, string> = {};
  if (json) h["Content-Type"] = "application/json";
  const b64 = sessionHeaderB64();
  if (b64) h["x-session-b64"] = b64;
  return h;
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
  // كان بيتنادِي مباشرة على mount — عدّلناه:
  if (session?.role === "unionSupervisor") {
    // نحمّل لما نتأكد من الدور
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
  }
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

    // حدث القائمة مباشرة
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: decision === "approve" ? "approved" : "rejected" } : r));
  } catch (e: any) {
    setErrorMsg("حصل خطأ أثناء تنفيذ الطلب: " + String(e?.message || e));
  } finally {
    setActing(null);
  }
};
  return (
    <div
  dir="rtl"
  className="relative min-h-screen overflow-hidden flex flex-col bg-[#EFE6DE]"
  style={{ fontFamily: "'Cairo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, 'Noto Sans Arabic'" }}
>
      <HeaderBar />

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1D1D1D] flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> طلبات تعيين مديري الكيانات
          </h1>
          <Link href="/dashboard" className="text-sm underline">
            الرجوع للوحة التحكم
          </Link>
        </div>

        {!isAllowed && <div className="mb-4 rounded-md bg-yellow-100 p-4 text-yellow-900">هذه الصفحة مخصصة لمسؤول الاتحاد.</div>}
        {errorMsg && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700 border border-red-200">{errorMsg}</div>}

        <div className="rounded-[22px] border border-[#E7E2DC] bg-white p-4 shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
          {loading ? (
            <div className="flex items-center gap-2 text-[#6B6B6B]">
              <RefreshCw className="h-4 w-4 animate-spin" /> جاري التحميل...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-[#6B6B6B]">لا توجد طلبات حالياً.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="bg-[#EFE6DE] text-[#1D1D1D]">
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">الكيان</th>
                    <th className="p-3 text-right">مقدِّم الطلب</th>
                    <th className="p-3 text-right">السبب</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="p-3">{new Date(r.createdAt).toLocaleString("ar-EG")}</td>
                      <td className="p-3 font-medium">{r.entityName || entsMap[String(r.entityId)] || r.entityId}</td>
                      <td className="p-3">{r.applicantName || r.applicantEmail || r.applicantUserId}</td>
                      <td className="p-3 max-w-[360px]">{r.reason || "—"}</td>
                      <td className="p-3">
                        {r.status === "pending" && <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900">قيد المراجعة</span>}
                        {r.status === "approved" && <span className="rounded bg-green-100 px-2 py-1 text-green-900">مقبول</span>}
                        {r.status === "rejected" && <span className="rounded bg-red-100 px-2 py-1 text-red-900">مرفوض</span>}
                      </td>
                      <td className="p-3">
                        {isAllowed && r.status === "pending" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => act(r.id, "approve")}
                              disabled={acting === r.id}
                              className="rounded-md border px-3 py-1 hover:bg-green-50 disabled:opacity-50"
                            >
                              <span className="inline-flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> قبول
                              </span>
                            </button>
                            <button
                              onClick={() => act(r.id, "reject")}
                              disabled={acting === r.id}
                              className="rounded-md border px-3 py-1 hover:bg-red-50 disabled:opacity-50"
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
          )}
        </div>
      </main>

      <FooterBar />
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;

  return (
    <header className="relative z-10" style={{ fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
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
              { href: "/support", label: "الدعم" },
              { href: "/about", label: "عن المنصة" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}
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

function FooterBar() {
  return (
    <footer className="mt-auto relative z-10" style={{ fontFamily: "'Cairo', ui-sans-serif, system-ui" }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="my-6 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border border-[#E7E2DC] shadow-[0_6px_12px_rgba(0,0,0,0.04)] text-sm text-[#6B6B6B]">
          <span>© {new Date().getFullYear()} منصة الكيانات الشبابية</span>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline">الخصوصية</Link>
            <Link href="/terms" className="hover:underline">الشروط</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
