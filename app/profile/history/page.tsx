"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Cairo } from "next/font/google";
import type { Session } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Clock, CheckCircle2, XCircle, LogOut, UserMinus, ArrowRight } from "lucide-react";

const cairo = Cairo({ subsets: ["arabic"], weight: ["400", "600", "700", "800"] });

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

type TimelineItem =
  | { type: 'join_request' | 'join_approved' | 'join_rejected'; id: string; userId: string; entityId: string; entityName: string; at: string; status: string; note: string | null }
  | { type: 'left' | 'removed'; id: string; userId: string; entityId: string; entityName: string; at: string; status: string; note: string | null };

type MembershipMy = { entityId?: string | null; entityName?: string | null; status?: string | null };

function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    return raw ? btoa(unescape(encodeURIComponent(raw))) : "";
  } catch { return ""; }
}
function withSession(init: RequestInit = {}): RequestInit {
  const h = new Headers(init.headers || {});
  const s = sessionHeaderB64();
  if (s) h.set("x-session-b64", s);
  if (!h.has("Content-Type") && init.body && !(init.body instanceof FormData)) h.set("Content-Type", "application/json");
  return { ...init, headers: h, credentials: "include", cache: "no-store" };
}

export default function HistoryPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<MembershipMy | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.replace("/"); return; }
      setSession(JSON.parse(s));
    } catch {
      router.replace("/");
    }
  }, [router]);

  useEffect(() => {
    if (!session?.id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/membership/history?id=${encodeURIComponent(session.id)}`, withSession()).then(r => r.json()).catch(() => null),
      fetch(`/api/membership/my`, withSession()).then(r => r.json()).catch(() => null),
    ])
      .then(([hist, my]) => {
        setTimeline(Array.isArray(hist?.timeline) ? hist.timeline : []);
        setCurrent(my && typeof my === 'object' ? my : null);
      })
      .finally(() => setLoading(false));
  }, [session?.id]);

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ background: COLORS.bg, color: COLORS.text }}>
      <HeaderBar />
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
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>سجل العضوية</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>تاريخ الانضمام والخروج وحالة عضويتك</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/profile")}
            className="h-9 px-3 rounded-full inline-flex items-center gap-2 font-semibold"
            style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
          >
            رجوع
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* الحالة الحالية */}
          <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <CardTitle>الحالة الحالية</CardTitle>
              <CardDescription className="text-[#6B6B6B]">كيانك الحالي (إن وجد)</CardDescription>
            </CardHeader>
            <CardContent>
              {current?.entityId ? (
                <div className="space-y-2">
                  <div className="text-sm">الكيان: <strong>{current.entityName || current.entityId}</strong></div>
                  <div className="text-sm">الحالة: <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                    {current.status || "فعّال"}
                  </span></div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: COLORS.muted }}>غير منضم لأي كيان حالياً.</div>
              )}
            </CardContent>
          </Card>

          {/* التايملاين */}
          <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
            <CardHeader>
              <CardTitle>الخط الزمني</CardTitle>
              <CardDescription className="text-[#6B6B6B]">جميع الأحداث مرتبة زمنياً</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-28 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
              ) : timeline.length === 0 ? (
                <div className="text-sm" style={{ color: COLORS.muted }}>لا توجد أحداث حتى الآن.</div>
              ) : (
                <ul className="space-y-4">
                  {timeline.map(item => (
                    <li key={item.id} className="flex gap-3">
                      <span className="h-9 w-9 rounded-xl grid place-items-center shrink-0"
                            style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                        {iconFor(item.type)}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm">
                          {renderTitle(item)}
                        </div>
                        <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                          {formatDate(item.at)} • {item.entityName}
                        </div>
                        {item.note && (
                          <div className="mt-2 text-xs rounded-lg p-2" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                            ملاحظة: {item.note}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <FooterBar />
    </div>
  );
}

function iconFor(t: TimelineItem["type"]) {
  switch (t) {
    case "join_request":   return <Clock className="h-4 w-4" />;
    case "join_approved":  return <CheckCircle2 className="h-4 w-4" />;
    case "join_rejected":  return <XCircle className="h-4 w-4" />;
    case "left":           return <LogOut className="h-4 w-4" />;
    case "removed":        return <UserMinus className="h-4 w-4" />;
  }
}
function renderTitle(i: TimelineItem) {
  switch (i.type) {
    case "join_request":  return <>تم إرسال طلب انضمام</>;
    case "join_approved": return <>تمت الموافقة على الانضمام</>;
    case "join_rejected": return <>تم رفض طلب الانضمام</>;
    case "left":          return <>قمت بالخروج من الكيان</>;
    case "removed":       return <>تمت إزالتك من الكيان</>;
  }
}
function formatDate(s: string) {
  try { return new Date(s + "Z").toLocaleString(); } catch { return s; }
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
              { href: "/profile", label: "الملف الشخصي" },
              { href: "/profile/history", label: "سجل العضوية" },
              { href: "/dashboard", label: "لوحة التحكم" },
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
