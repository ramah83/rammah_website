// app/profile/page.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { Session } from "@/lib/types";
import { Cairo } from "next/font/google";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Pencil, Mail, Phone, MapPin, User, Hash, Layers, Tag, Clock, X } from "lucide-react";

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

type Me = {
  id: string;
  nationalId?: string | null;
  name: string;
  email: string;
  role: "unionSupervisor" | "entityManager" | "user";
  entityId?: string | null;
  interests?: string[];
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
  avatar?: string | null;
};

type EntityLite = { id: string; name: string };

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

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [currentEntityId, setCurrentEntityId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  // معاينة الصورة
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const openAvatarModal = useCallback(() => setShowAvatarModal(true), []);
  const closeAvatarModal = useCallback(() => setShowAvatarModal(false), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAvatarModal();
    }
    if (showAvatarModal) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [showAvatarModal, closeAvatarModal]);

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

  useEffect(() => {
    fetch("/api/entities", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any) => {
        const arr: EntityLite[] = Array.isArray(rows) ? rows : Array.isArray(rows?.entities) ? rows.entities : [];
        setEntities(arr.map((e: any) => ({ id: String(e.id), name: String(e.name || "") })));
      })
      .catch(() => setEntities([]));
  }, []);

  useEffect(() => {
    if (!me?.id || me.role !== "user") { setCurrentEntityId(null); return; }
    fetch("/api/membership/my", withSession())
      .then(r => (r.ok ? r.json() : null))
      .then((res: any) => {
        const eid = res?.entityId ? String(res.entityId) : null;
        setCurrentEntityId(eid);
      })
      .catch(() => setCurrentEntityId(null));
  }, [me?.id, me?.role]);

  const roleLabel: Record<string, string> = {
    unionSupervisor: "مسؤول اتحاد الكيانات",
    entityManager: "مسؤول كيان",
    user: "مستخدم",
  };

  const byId = useMemo(() => new Map(entities.map(e => [String(e.id), e.name])), [entities]);

  const leaveEntity = async () => {
    if (!currentEntityId || !me || me.role !== "user") return;
    if (!confirm("هل تريد الخروج من الكيان الحالي؟")) return;
    try {
      setLeaving(true);
      const r = await fetch("/api/membership/leave", withSession({ method: "POST" }));
      if (!r.ok) throw new Error(await r.text());
      setCurrentEntityId(null);
      alert("تم الخروج من الكيان بنجاح.");
    } catch (e: any) {
      alert("تعذر إتمام العملية: " + String(e?.message || e));
    } finally {
      setLeaving(false);
    }
  };

  const entityField: React.ReactNode = useMemo(() => {
    if (!me) return "غير منضم لكيان";
    if (me.role === "unionSupervisor") return <Chip>كل الكيانات</Chip>;
    if (me.role === "entityManager") {
      const name = (me.entityId && byId.get(String(me.entityId))) || (me.entityId ? String(me.entityId) : "غير منضم لكيان");
      return <Chip>{name}</Chip>;
    }
    if (me.role === "user") {
      if (!currentEntityId) return "غير منضم لكيان";
      const name = byId.get(currentEntityId) || currentEntityId;
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Chip>{name}</Chip>
          <button
            onClick={leaveEntity}
            disabled={leaving}
            className="h-8 px-3 rounded-full inline-flex items-center gap-2 font-semibold"
            style={{ background: COLORS.primary, color: "#FFFFFF" }}
          >
            {leaving ? "جارٍ التنفيذ..." : "الخروج من الكيان"}
          </button>
        </div>
      );
    }
    return "غير منضم لكيان";
  }, [me, byId, currentEntityId, leaving]);

  const shownNationalId = useMemo(() => me?.nationalId ?? "-", [me]);

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
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>الملف الشخصي</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>عرض بيانات حسابك</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/profile/edit")}
              className="h-9 px-3 rounded-full inline-flex items-center gap-2 font-semibold"
              style={{ background: COLORS.primary, color: "#FFFFFF" }}
            >
              <Pencil className="h-4 w-4" />
              تعديل
            </button>
          </div>
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
                <div className="rounded-2xl p-4 flex flex-col items-stretch" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <button
                    type="button"
                    onClick={me.avatar ? openAvatarModal : undefined}
                    className="w-28 h-28 rounded-2xl overflow-hidden grid place-items-center mx-auto focus:outline-none"
                    style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, cursor: me.avatar ? "zoom-in" : "default" }}
                    aria-label={me.avatar ? "تكبير الصورة الشخصية" : "الصورة الشخصية"}
                  >
                    {me.avatar ? (
                      <img src={me.avatar} alt={me.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl font-bold" style={{ color: COLORS.muted }}>
                        {me.name?.trim()?.charAt(0) || "?"}
                      </span>
                    )}
                  </button>

                  <div className="text-center mt-3">
                    <div className="font-semibold text-lg">{me.name}</div>
                    <div className="text-xs mt-1" style={{ color: COLORS.muted }}>
                      {roleLabel[me.role] || me.role}
                    </div>
                  </div>

                  {/* زر سجل العضوية يظهر فقط للمستخدم العادي */}
                  {me.role === "user" && (
                    <button
                      onClick={() => router.push("/profile/history")}
                      className="mt-4 h-9 px-3 rounded-xl inline-flex items-center justify-center gap-2 font-semibold"
                      style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                      title="عرض سجل الانضمام والخروج"
                    >
                      <Clock className="h-4 w-4" />
                      سجل العضوية
                    </button>
                  )}
                </div>

                <div className="rounded-2xl p-4 space-y-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                  <InfoRow icon={<User className="h-4 w-4" />} label="الاسم" value={me.name || "-"} />
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="البريد الإلكتروني" value={me.email || "-"} />
                  <InfoRow icon={<Hash className="h-4 w-4" />} label="الرقم القومي" value={shownNationalId || "-"} />
                  <InfoRow icon={<Phone className="h-4 w-4" />} label="الهاتف" value={me.phone || "-"} />
                  <InfoRow icon={<MapPin className="h-4 w-4" />} label="المدينة" value={me.city || "-"} />
                  <InfoRow icon={<Layers className="h-4 w-4" />} label="الكيان الحالي" custom={entityField} />
                  <InfoRow
                    icon={<Tag className="h-4 w-4" />}
                    label="الاهتمامات"
                    value={(me.interests && me.interests.length > 0) ? undefined : "لا توجد اهتمامات محددة"}
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

      {/* مودال معاينة الصورة */}
      {showAvatarModal && me?.avatar && (
        <div
          className="fixed inset-0 z-[999]"
          role="dialog"
          aria-modal="true"
          aria-label="معاينة الصورة الشخصية"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeAvatarModal}
          />
          <div className="absolute inset-0 p-4 grid place-items-center">
            <div
              className="relative max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden bg-white"
              style={{ border: `1px solid ${COLORS.border}` }}
            >
              <button
                type="button"
                onClick={closeAvatarModal}
                className="absolute top-2 left-2 z-10 h-9 w-9 rounded-full grid place-items-center bg-white/90 border hover:bg-white"
                title="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-[min(92vw,720px)] h-[min(80vh,720px)] grid place-items-center bg-black">
                <img
                  src={me.avatar}
                  alt={me.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <FooterBar />
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs rounded-full px-3 h-7 inline-flex items-center"
      style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
    >
      {children}
    </span>
  );
}

function InfoRow({
  icon, label, value, custom,
}: { icon: React.ReactNode; label: string; value?: string; custom?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="h-8 w-8 rounded-xl grid place-items-center" style={{ background: "#F6F6F6", border: "1px solid #E3E3E3" }}>
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-xs" style={{ color: "#6B6B6B" }}>{label}</div>
        {custom ? <div className="mt-1">{custom}</div> : <div className="mt-1 text-sm">{value ?? "غير منضم لكيان"}</div>}
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
        {/* أصلحت خطأ مطبعي "rounded-عي" */}
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
                  className={`px-3 py-1 rounded-lg transition ${active(l.href) ? "bg-[#EC1A24] text-white" : "text-[#1D1D1D]"}`}
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
