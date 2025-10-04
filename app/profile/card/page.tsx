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

      <main className="flex-1 mx-auto max-w-6xl w-full px-4 pt-6 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">كارت العضوية</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/profile")}
              className="h-9 px-3 rounded-full font-semibold"
              style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              رجوع
            </button>
            <button id="printCardBtn" onClick={() => window.print()}
              className="h-9 px-3 rounded-full font-semibold text-white"
              style={{ background: COLORS.primary }}>
              طباعة / حفظ PDF
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-40 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
        ) : error ? (
          <div className="rounded-xl p-3 text-sm" style={{ background: "#FFF0F0", border: "1px solid #F5C2C7", color: "#7A0010" }}>
            {error}
          </div>
        ) : !data ? (
          <div className="text-sm text-[#6B6B6B]">تعذر تحميل البيانات.</div>
        ) : (
          <div className="grid place-items-center">
            <MembershipCard person={data} />
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
