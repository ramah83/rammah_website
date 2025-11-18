"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@/lib/types";
import { MembershipCard, type CardPerson } from "@/components/MembershipCard";
import { Cairo } from "next/font/google";
import Link from "next/link";
import { Users } from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700", "800"] });

const COLORS = {
  bg: "#EFE6DE",
  card: "#FFFFFF",
  border: "#E7E2DC",
  primary: "#EC1A24",
  text: "#1D1D1D",
  muted: "#6B6B6B",
};

function withSession(init: RequestInit = {}): RequestInit {
  const h = new Headers(init.headers || {});
  try {
    const raw = localStorage.getItem("session") || "";
    const b64 = raw ? btoa(unescape(encodeURIComponent(raw))) : "";
    if (b64) h.set("x-session-b64", b64);
  } catch {}
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData))
    h.set("Content-Type", "application/json");
  return { ...init, headers: h, credentials: "include", cache: "no-store" };
}

export default function CardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<CardPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.replace("/"); return; }
      setSession(JSON.parse(s));
    } catch { router.replace("/"); }
  }, [router]);

  useEffect(() => {
    if (!session?.id) return;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const r = await fetch("/api/card", withSession());
        if (!r.ok) {
          const body = await r.text().catch(() => "");
          throw new Error(`API /card failed (${r.status}): ${body}`);
        }
        const p = (await r.json()) as CardPerson;
        setData(p);
      } catch (e) {
        console.error("Card load error:", e);
        setError("فشل جلب بيانات الكارت. تأكد أن جلسة الدخول صالحة وأن مسار /api/card متاح.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [session?.id]);

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ background: COLORS.bg, color: COLORS.text }}>
      <HeaderBar />

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 pt-8 pb-10">
        {/* Header Section */}
        <div className="rounded-[22px] p-6 md:p-8 mb-6" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl grid place-items-center" style={{ background: "#F6F6F6", border: `1px solid ${COLORS.border}` }}>
                <Users className="h-7 w-7" style={{ color: COLORS.primary }} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: COLORS.text }}>كارت العضوية</h1>
                <p className="text-sm mt-1" style={{ color: COLORS.muted }}>
                  {loading ? "جاري التحميل..." : data ? `${data.name} - ${data.entityName || "غير منضم"}` : "معلومات العضوية"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push("/profile")}
                className="h-10 px-5 rounded-full font-semibold transition-all duration-200 hover:opacity-80"
                style={{ background: "#F6F6F6", border: `1px solid ${COLORS.border}`, color: COLORS.text }}>
                رجوع
              </button>
              <button 
                id="printCardBtn" 
                onClick={() => window.print()}
                disabled={loading || !!error || !data}
                className="h-10 px-5 rounded-full font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-50"
                style={{ background: COLORS.primary }}>
                طباعة / حفظ PDF
              </button>
            </div>
          </div>
        </div>

        {/* Card Display Section */}
        <div className="rounded-[22px] p-8" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          {loading ? (
            <div className="space-y-4">
              <div className="h-48 rounded-2xl animate-pulse" style={{ background: "#F6F6F6" }} />
              <div className="text-center text-sm" style={{ color: COLORS.muted }}>جاري تحميل بيانات الكارت...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full mx-auto grid place-items-center mb-4"
                   style={{ background: "#FFF0F0", border: "1px solid #F5C2C7" }}>
                <Users className="h-8 w-8" style={{ color: "#7A0010" }} />
              </div>
              <div className="font-semibold mb-2" style={{ color: "#7A0010" }}>فشل تحميل الكارت</div>
              <div className="text-sm max-w-md mx-auto" style={{ color: "#6B6B6B" }}>{error}</div>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 h-10 px-5 rounded-full font-semibold"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}>
                إعادة المحاولة
              </button>
            </div>
          ) : !data ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full mx-auto grid place-items-center mb-4"
                   style={{ background: "#F6F6F6", border: `1px solid ${COLORS.border}` }}>
                <Users className="h-8 w-8" style={{ color: COLORS.muted }} />
              </div>
              <div className="font-semibold mb-1" style={{ color: COLORS.text }}>لا توجد بيانات</div>
              <div className="text-sm" style={{ color: COLORS.muted }}>تعذر تحميل معلومات الكارت</div>
            </div>
          ) : (
            <div className="grid place-items-center">
              <MembershipCard person={data} />
            </div>
          )}
        </div>

        {/* Info Section */}
        {!loading && !error && data && (
          <div className="mt-6 rounded-[22px] p-6" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: COLORS.text }}>معلومات الطباعة</h3>
            <ul className="space-y-2 text-sm" style={{ color: COLORS.muted }}>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>اضغط على زر "طباعة / حفظ PDF" لحفظ الكارت أو طباعته</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>يمكنك اختيار "حفظ كـ PDF" من نافذة الطباعة لحفظ نسخة رقمية</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">•</span>
                <span>تأكد من ضبط إعدادات الطباعة على "Portrait" للحصول على أفضل نتيجة</span>
              </li>
            </ul>
          </div>
        )}
      </main>

      <FooterBar />
      {/* ملف الطباعة */}
      <link rel="stylesheet" href="/profile/card/print.css" />
    </div>
  );
}

function HeaderBar() {
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4 bg-white border border-[#E7E2DC] shadow-[0_6px_12px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-[#F6F6F6] border border-[#E5E5E5]">
              <Users className="h-5 w-5 text-[#1D1D1D]" />
            </div>
            <Link href="/" className="font-semibold text-[#1D1D1D]">
              منصة الكيانات الشبابية
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              {[
                { href: "/profile", label: "الملف الشخصي" },
                { href: "/dashboard", label: "لوحة التحكم" },
                { href: "/about", label: "عن المنصة" },
                { href: "/support", label: "الدعم" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`px-3 py-1 rounded-lg transition hover:bg-[#F5F5F5] ${
                    typeof window !== "undefined" && window.location.pathname === l.href
                      ? "bg-[#EC1A24] text-white"
                      : "text-[#1D1D1D]"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="mt-6">
      <div className="mx-auto max-w-6xl w-full px-4 pb-6">
        <div className="rounded-2xl px-4 py-3 bg-white border border-[#E7E2DC] text-sm flex items-center justify-between">
          <span className="text-[#6B6B6B]">© {new Date().getFullYear()} منصة الكيانات الشبابية</span>
          <div className="flex items-center gap-3 text-[#6B6B6B]">
            <Link href="/support" className="hover:text-[#1D1D1D]">الدعم</Link>
            <span className="opacity-30">•</span>
            <Link href="/about" className="hover:text-[#1D1D1D]">عن المنصة</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
