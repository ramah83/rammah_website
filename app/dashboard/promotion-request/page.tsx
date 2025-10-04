"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, ShieldCheck, RefreshCw, ArrowRight, Send } from "lucide-react";

type UserRole = "unionSupervisor" | "entityManager" | "user";
type Session = { id: string; role: UserRole };

type PromotionRequest = {
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

function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
  } catch { return ""; }
}
async function safeJson<T>(res: Response, fallback: T): Promise<T> {
  const t = await res.text();
  if (!res.ok) throw new Error(t || res.statusText);
  if (!t) return fallback;
  try { return JSON.parse(t) as T; } catch { return fallback; }
}
function withSession(init: RequestInit = {}): RequestInit {
  const h = new Headers(init.headers || {});
  const s = sessionHeaderB64();
  if (s) h.set("x-session-b64", s);
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData)) h.set("Content-Type", "application/json");
  return { ...init, headers: h, credentials: "include", cache: "no-store" };
}

export default function PromotionRequestPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [reqRow, setReqRow] = useState<PromotionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const isAlreadyAdmin = useMemo(() => session?.role === "unionSupervisor", [session]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("session");
      if (raw) setSession(JSON.parse(raw));
    } catch {}
  }, []);

  const loadMine = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/promotion-request", withSession());
      const data = await safeJson<PromotionRequest | null>(res, null);
      setReqRow(data);
    } catch (e: any) {
      setReqRow(null);
      setErrorMsg(String(e?.message || "تعذر تحميل البيانات."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (session?.id) loadMine(); }, [session?.id]);

  const submit = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await fetch("/api/promotion-request", withSession({ method: "POST", body: JSON.stringify({ note }) }));
      const data = await safeJson<PromotionRequest>(res, null as any);
      setReqRow(data);
      setNote("");
    } catch (e: any) {
      setErrorMsg(String(e?.message || "تعذر إرسال الطلب."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col" style={{ backgroundColor: "#EFE6DE", color: "#1D1D1D", fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      <HeaderBar />
      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-6">
        <div className="rounded-[22px] p-4 md:p-6 flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F6F6F6", border: "1px solid #E5E5E5" }}>
              <ShieldCheck className="h-5 w-5" color="#1D1D1D" />
            </span>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold">طلب ترقية إلى مسؤول اتحاد كيانات</h1>
              <p className="text-sm" style={{ color: "#595959" }}>أرسل طلبك ليراجعه مسؤولو الاتحاد.</p>
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
      {isAlreadyAdmin ? (
  <div className="mb-4 space-y-4">
    <div className="rounded-2xl p-3" style={{ backgroundColor: "#E8FFF1", border: "1px solid #BDE8CE", color: "#126B3A" }}>
      أنت بالفعل مسؤول اتحاد.
    </div>
    <AdminRequestsPanel />
  </div>
) : null}

        {errorMsg && (
          <div className="mb-4 rounded-2xl p-3" style={{ backgroundColor: "#FFF5F5", border: "1px solid #FAD3D3", color: "#A82C2C" }}>
            {errorMsg}
            <button onClick={loadMine} className="ms-2 underline">إعادة المحاولة</button>
          </div>
        )}

        <SurfaceCard>
          <div className="px-5 pt-5">
            <div className="text-sm" style={{ color: "#6B6B6B" }}>حالة الطلب</div>
          </div>
          <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />
          <div className="px-5 pb-5 space-y-4">
            {loading ? (
              <div className="flex items-center gap-2" style={{ color: "#6B6B6B" }}>
                <RefreshCw className="h-4 w-4 animate-spin" /> جاري التحميل...
              </div>
            ) : (
              <>
                {reqRow ? (
                  <div className="rounded-xl p-4" style={{ backgroundColor: "#F9F9F9", border: "1px solid #EEE4DA" }}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-sm">آخر حالة:</div>
                      {reqRow.status === "pending" && <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-900 text-sm">قيد المراجعة</span>}
                      {reqRow.status === "approved" && <span className="rounded bg-green-100 px-2 py-1 text-green-900 text-sm">مقبول</span>}
                      {reqRow.status === "rejected" && <span className="rounded bg-red-100 px-2 py-1 text-red-900 text-sm">مرفوض</span>}
                      <span className="text-sm text-[#6B6B6B]">بتاريخ {new Date(reqRow.createdAt).toLocaleString("ar-EG")}</span>
                    </div>
                    {reqRow.note ? <div className="mt-2 text-sm text-[#444]">ملاحظتك: {reqRow.note}</div> : null}
                  </div>
                ) : (
                  <div className="text-[#6B6B6B]">لا يوجد لديك طلب سابق.</div>
                )}

                {!isAlreadyAdmin && (!reqRow || reqRow.status !== "pending") && (
                  <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC" }}>
                    <label className="block text-sm">أكتب سبب طلبك (اختياري)</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border p-3 text-sm outline-none"
                      placeholder="مثال: لدي خبرة في إدارة الكيانات وأرغب بالمساهمة.."
                    />
                    <button
                      onClick={submit}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold bg-[#EC1A24] text-white disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" /> إرسال الطلب
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </SurfaceCard>
      </main>

      <FooterBar />
    </div>
  );
}
function AdminRequestsPanel() {
  const [rows, setRows] = useState<PromotionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<string|null>(null);
  const [error, setError] = useState<string|null>(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/promotion-request?scope=all&status=pending&limit=200", withSession());
      const data = await safeJson<PromotionRequest[]>(res, []);
      setRows(data);
    } catch (e:any) {
      setError(String(e?.message || "تعذر تحميل الطلبات"));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "approve"|"reject") => {
    setSubmittingId(id);
    setError(null);
    try {
      await fetch(`/api/promotion-request/${id}`, withSession({
        method: "PATCH",
        body: JSON.stringify({ action })
      })).then(r => safeJson<PromotionRequest>(r, null as any));
      // شيل الطلب من القائمة (اتحدّث لغير معلق)
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (e:any) {
      setError(String(e?.message || "تعذر تنفيذ العملية"));
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <SurfaceCard>
      <div className="px-5 pt-5 flex items-center justify-between">
        <h3 className="font-bold">طلبات الترقية المعلقة</h3>
        <button onClick={load} className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-[#F6F6F6] border">
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </div>
      <div className="mx-5 my-4 h-px" style={{ backgroundColor: "#EDE8E1" }} />
      <div className="px-5 pb-5">
        {loading && <div className="text-sm text-[#6B6B6B]"><RefreshCw className="h-4 w-4 inline animate-spin" /> جاري التحميل...</div>}
        {error && <div className="rounded p-3 text-sm" style={{ background:"#FFF5F5", border:"1px solid #FAD3D3", color:"#A82C2C" }}>{error}</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-[#6B6B6B]">لا توجد طلبات معلّقة.</div>}
        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.id} className="rounded-xl p-3 flex items-start justify-between gap-3"
                   style={{ background:"#F9F9F9", border:"1px solid #EEE4DA" }}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{r.applicantName || r.applicantEmail || r.applicantUserId}</span>
                    <span className="text-xs text-[#6B6B6B]">قدّم في {new Date(r.createdAt).toLocaleString("ar-EG")}</span>
                    <span className="text-xs rounded bg-yellow-100 px-2 py-0.5 text-yellow-900">قيد المراجعة</span>
                  </div>
                  {r.note && <div className="text-sm mt-1">ملاحظة: {r.note}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => act(r.id, "approve")}
                    disabled={!!submittingId}
                    className="h-8 px-3 rounded-full text-sm font-semibold bg-green-600 text-white disabled:opacity-50">
                    قبول
                  </button>
                  <button
                    onClick={() => act(r.id, "reject")}
                    disabled={!!submittingId}
                    className="h-8 px-3 rounded-full text-sm font-semibold bg-red-600 text-white disabled:opacity-50">
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
function HeaderBar() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href;
  return (
    <header className="relative z-10" style={{ fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}>
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
              <Link key={l.href} href={l.href} className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}>
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
        <div className="rounded-2xl px-4 py-3 text-sm flex items-center justify-between" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#6B6B6B" }}>
          <span>© {new Date().getFullYear()} منصة الكيانات الشبابية</span>
          <span><Link href="/support" className="underline">الدعم</Link> • <Link href="/about" className="underline">عن المنصة</Link></span>
        </div>
      </div>
    </footer>
  );
}

function SurfaceCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 8px 18px rgba(0,0,0,0.05)", fontFamily: '"Cairo", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif' }}>
      {children}
    </div>
  );
}