"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { Session } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Pencil, Mail, Phone, MapPin, User, Hash, Layers } from "lucide-react";

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

type Me = {
  id: string;
  name: string;
  email: string;
  role: string;
  entityId?: string | null;
  interests?: string[];
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
  avatar?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

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
    fetch(`/api/me?id=${encodeURIComponent(session.id)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((u: Me) => setMe(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.id]);

  const roleLabel: Record<string,string> = {
    systemAdmin: "مدير النظام",
    qualitySupervisor: "مشرف جودة",
    entityManager: "مسؤول كيان",
    youth: "مستخدم",
  };

  return (
    <div dir="rtl" className="min-h-screen flex flex-col" style={{ background: COLORS.bg, color: COLORS.text }}>
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
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>الملف الشخصي</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>عرض بيانات حسابك</p>
            </div>
          </div>

          <button
            onClick={() => router.push("/profile/edit")}
            className="h-9 px-3 rounded-full inline-flex items-center gap-2 font-semibold"
            style={{ background: COLORS.primary, color: "#FFFFFF" }}
          >
            <Pencil className="h-4 w-4" />
            تعديل
          </button>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10 flex-1">
        <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
          <CardHeader>
            <CardTitle>بيانات الحساب</CardTitle>
            <CardDescription className="text-[#6B6B6B]">معلوماتك الأساسية وطرق التواصل</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-28 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
            ) : !me ? (
              <div className="text-sm" style={{ color: COLORS.muted }}>لا يمكن تحميل البيانات حالياً.</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
                {/* Avatar + اسم مختصر */}
                <div className="rounded-2xl p-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <div className="w-28 h-28 rounded-2xl overflow-hidden grid place-items-center mx-auto"
                       style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                    {me.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={me.avatar} alt={me.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold" style={{ color: COLORS.muted }}>
                        {me.name?.trim()?.charAt(0) || "?"}
                      </span>
                    )}
                  </div>
                  <div className="text-center mt-3">
                    <div className="font-semibold text-lg">{me.name}</div>
                    <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                      {roleLabel[me.role] || me.role}
                    </div>
                  </div>
                </div>

                {/* تفاصيل */}
                <div className="rounded-2xl p-4 space-y-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <InfoRow icon={<User className="h-4 w-4" />} label="الاسم" value={me.name || "-"} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="البريد الإلكتروني" value={me.email || "-"} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="الهاتف" value={me.phone || "-"} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="المدينة" value={me.city || "-"} />
                  <InfoRow icon={<Layers className="h-4 w-4" />} label="الكيان الحالي" value={me.entityId ? String(me.entityId) : "-"} />
                  <InfoRow
                    icon={<Hash className="h-4 w-4" />}
                    label="الاهتمامات"
                    value={(me.interests && me.interests.length > 0) ? undefined : "-"}
                    custom={
                      (me.interests && me.interests.length > 0) ? (
                        <div className="flex flex-wrap gap-2">
                          {me.interests.map((t, i) => (
                            <span
                              key={i}
                              className="text-xs rounded-full px-3 h-7 inline-flex items-center"
                              style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : undefined
                    }
                  />
                  {me.bio && (
                    <div className="rounded-xl p-3" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                      <div className="text-xs" style={{ color: COLORS.muted }}>نبذة</div>
                      <div className="mt-1 text-sm">{me.bio}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <FooterBar />
    </div>
  );
}

function InfoRow({
  icon, label, value, custom,
}: { icon: React.ReactNode; label: string; value?: string; custom?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-8 w-8 rounded-xl grid place-items-center"
            style={{ background: "#F6F6F6", border: "1px solid #E3E3E3" }}>
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-xs" style={{ color: "#6B6B6B" }}>{label}</div>
        {custom ? (
          <div className="mt-1">{custom}</div>
        ) : (
          <div className="mt-1 text-sm">{value ?? "-"}</div>
        )}
      </div>
    </div>
  );
}

/* ================== Header & Footer (مطابقين للداشبورد) ================== */

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
            <Link href="/" className="font-semibold text-[#1D1D1D]">
              منصة الكيانات الشبابية
            </Link>
          </div>

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
    <footer className="mt-6">
      <div className="mx-auto max-w-6xl w-full px-4 pb-6">
        <div className="rounded-٢xl px-4 py-3 bg-white border border-[#E7E2DC] text-sm flex items-center justify-between">
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
