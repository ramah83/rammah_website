"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { Session } from "@/lib/types";
import { Cairo } from "next/font/google";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Pencil, Mail, Phone, MapPin, User, Hash, Layers, Tag, Clock, X, AlertTriangle, IdCard } from "lucide-react";

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

type EntityLite = { id: string; name: string; status?: string };

/* ---------- جلسة: Base64URL بدون padding ---------- */
function sessionHeaderB64() {
  try {
    const raw = localStorage.getItem("session") || "";
    if (!raw) return "";
    return btoa(unescape(encodeURIComponent(raw)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,"");
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

  // حالة زر الطلب
  const [leaving, setLeaving] = useState(false);

  const [managedEntities, setManagedEntities] = useState<EntityLite[]>([]);
  const managedEntity = managedEntities[0] || null;
  const managerSuspended = me?.role === "entityManager" && managedEntity?.status === "suspended";

  const [myEntityMine, setMyEntityMine] = useState<EntityLite | null>(null);
  const userSuspended = me?.role === "user" && myEntityMine?.status === "suspended";

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const openAvatarModal = useCallback(() => setShowAvatarModal(true), []);
  const closeAvatarModal = useCallback(() => setShowAvatarModal(false), []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") closeAvatarModal(); }
    if (showAvatarModal) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [showAvatarModal, closeAvatarModal]);

  // load session from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem("session");
      if (!s) { router.replace("/"); return; }
      setSession(JSON.parse(s));
    } catch {
      router.replace("/");
    }
  }, [router]);

  // fetch /api/me
  useEffect(() => {
    if (!session?.id) return;
    setLoading(true);
    fetch(`/api/me?id=${encodeURIComponent(session.id)}`, withSession())
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((u: Me) => setMe(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.id]);

  // load entities list (names map)
  useEffect(() => {
    fetch("/api/entities", withSession())
      .then(r => (r.ok ? r.json() : []))
      .then((rows: any) => {
        const arr: EntityLite[] = Array.isArray(rows) ? rows : Array.isArray(rows?.entities) ? rows.entities : [];
        setEntities(arr.map((e: any) => ({ id: String(e.id), name: String(e.name || ""), status: String(e.status || "") })));
      })
      .catch(() => setEntities([]));
  }, []);

  // current membership (user)
  useEffect(() => {
    if (!me?.id || me.role !== "user") { setCurrentEntityId(null); return; }
    fetch("/api/membership/my", withSession())
      .then(r => (r.ok ? r.json() : null))
      .then((res: any) => setCurrentEntityId(res?.entityId ? String(res.entityId) : null))
      .catch(() => setCurrentEntityId(null));
  }, [me?.id, me?.role]);

  // my entity (user scope=mine)
  useEffect(() => {
    if (!session?.id || me?.role !== "user") { setMyEntityMine(null); return; }
    const url = `/api/entities?viewerId=${encodeURIComponent(session.id)}&scope=mine`;
    fetch(url, withSession())
      .then(r => (r.ok ? r.json() : []))
      .then((list: any[]) => setMyEntityMine(Array.isArray(list) && list.length ? list[0] : null))
      .catch(() => setMyEntityMine(null));
  }, [session?.id, me?.role]);

  // managed entity (manager scope=mine)
  useEffect(() => {
    if (!session?.id || me?.role !== "entityManager") { setManagedEntities([]); return; }
    const url = `/api/entities?viewerId=${encodeURIComponent(session.id)}&role=entityManager&scope=mine`;
    fetch(url, withSession())
      .then(r => (r.ok ? r.json() : []))
      .then((list: any[]) => setManagedEntities(Array.isArray(list) ? list : []))
      .catch(() => setManagedEntities([]));
  }, [session?.id, me?.role]);

  const roleLabel: Record<string, string> = {
    unionSupervisor: "مسؤول اتحاد الكيانات",
    entityManager: "مسؤول كيان",
    user: "مستخدم",
  };

  const byId = useMemo(() => new Map(entities.map(e => [String(e.id), e.name])), [entities]);

  /* ---------- إرسال طلب مغادرة ---------- */
  const requestLeave = async () => {
    if (!currentEntityId || !me || me.role !== "user") return;

    const reason = prompt("يمكنك كتابة سبب المغادرة (اختياري):") || null;
    if (!confirm("هل تريد إرسال طلب مغادرة الكيان؟ سيقوم بمراجعته مدير الكيان أو مسؤول الاتحاد.")) return;

    try {
      setLeaving(true);
      const r = await fetch("/api/entities/requests", withSession({
        method: "POST",
        body: JSON.stringify({ reason }),
      }));
      const data = await r.json().catch(() => ({} as any));

      if (r.status === 202) {
        alert(
          (data?.message || "تم إرسال طلب المغادرة.") +
          (data?.requestId ? `\nرقم الطلب: ${data.requestId}` : "")
        );
        // ممكن توجهه لمتابعة الطلبات:
        // router.push("/dashboard/leave-requests-pro");
      } else if (!r.ok) {
        alert(data?.error || "تعذر إرسال الطلب");
      } else {
        alert("تم إرسال الطلب.");
      }
    } catch (e: any) {
      alert(String(e?.message || e || "تعذر إرسال الطلب"));
    } finally {
      setLeaving(false);
    }
  };

  const entityField: React.ReactNode = useMemo(() => {
    if (!me) return "غير منضم لكيان";

    if (me.role === "unionSupervisor") return <Chip>كل الكيانات</Chip>;

    if (me.role === "entityManager") {
      const name =
        managedEntity?.name ||
        (me.entityId && byId.get(String(me.entityId))) ||
        (me.entityId ? String(me.entityId) : "غير منضم لكيان");
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <Chip>{name}</Chip>
          {managerSuspended && (
            <span className="text-xs rounded-full px-3 h-7 inline-flex items-center"
                  style={{ background: "#FFF0F0", border: "1px solid #F5C2C7", color: "#7A0010" }}>
              موقوف مؤقتًا
            </span>
          )}
        </div>
      );
    }

    if (!currentEntityId) return "غير منضم لكيان";
    const name =
      myEntityMine?.name ||
      byId.get(currentEntityId) ||
      currentEntityId;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Chip>{name}</Chip>
        {userSuspended && (
          <span className="text-xs rounded-full px-3 h-7 inline-flex items-center"
                style={{ background: "#FFF0F0", border: "1px solid #F5C2C7", color: "#7A0010" }}>
            موقوف مؤقتًا
          </span>
        )}
        <button
          onClick={requestLeave}
          disabled={leaving}
          className="h-8 px-3 rounded-full inline-flex items-center gap-2 font-semibold disabled:opacity-60"
          style={{ background: COLORS.primary, color: "#FFFFFF" }}
          title="إرسال طلب مغادرة للكيان"
        >
          {leaving ? "جارٍ الإرسال..." : "طلب مغادرة"}
        </button>
      </div>
    );
  }, [me, byId, currentEntityId, leaving, managedEntity?.name, managerSuspended, myEntityMine?.name, userSuspended]);

  const shownNationalId = useMemo(() => me?.nationalId ?? "-", [me]);
  const suspendedBanner = managerSuspended || userSuspended;

  const [suspendActors, setSuspendActors] = useState<string[]>([]);
  useEffect(() => {
    const entityId =
      me?.role === "entityManager" ? managedEntity?.id :
      me?.role === "user" ? myEntityMine?.id :
      null;

    if (!suspendedBanner || !entityId) { setSuspendActors([]); return; }

    const fetchActors = async () => {
      try {
        let res = await fetch(`/api/entities/${entityId}/events?type=suspended&limit=5`, withSession());
        if (!res.ok) {
          res = await fetch(`/api/entities/${entityId}?events=1&type=suspended&limit=5`, withSession());
        }
        const data = await res.json().catch(() => ({}));
        const names = Array.isArray(data?.events)
          ? data.events.map((e: any) => e?.actorName || e?.actorRole || "مسؤول").filter(Boolean)
          : [];
        setSuspendActors(Array.from(new Set(names)));
      } catch {
        setSuspendActors([]);
      }
    };

    fetchActors();
  }, [suspendedBanner, managedEntity?.id, myEntityMine?.id, me?.role]);

  return (
    <div dir="rtl" className={`${cairo.className} min-h-screen flex flex-col`} style={{ background: COLORS.bg, color: COLORS.text }}>
      <HeaderBar />

      {/* شارة الإيقاف */}
      {suspendedBanner && (
        <div className="mx-auto max-w-6xl w-full px-4 mt-4">
          <div className="rounded-xl p-3 md:p-4 flex items-start gap-3" style={{ background: "#FFF7E6", border: "1px solid #FFE2B5" }}>
            <span className="h-8 w-8 mt-0.5 rounded-lg grid place-items-center" style={{ background: "#FFFFFF", border: "1px solid #FFE2B5" }}>
              <AlertTriangle className="h-5 w-5" color="#B26B00" />
            </span>
            <div className="text-sm" style={{ color: "#6B4E00" }}>
              <div className="font-semibold mb-0.5">الكيان موقوف مؤقتًا</div>
              <div>
                {me?.role === "user"
                  ? "لا يمكن تنفيذ إجراءات داخل الكيان الآن. يمكنك إرسال طلب مغادرة أو الانتظار حتى يتم استئنافه."
                  : "لن تتمكن من تنفيذ إجراءات على الكيان الآن. غيّر الكيان أو انتظر حتى يتم استئنافه."}
              </div>
              {suspendActors.length > 0 && (
                <div className="mt-1 text-xs">تم التعليق بواسطة: {suspendActors.join("، ")}</div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="relative z-10 mx-auto max-w-6xl w-full px-4 pt-8">
        <div
          className="rounded-[22px] p-6 md:p-8"
          style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl grid place-items-center" style={{ backgroundColor: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                <User className="h-7 w-7" color={COLORS.primary} />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold" style={{ color: COLORS.text }}>الملف الشخصي</h1>
                <p className="text-sm mt-1" style={{ color: COLORS.muted }}>إدارة معلوماتك الشخصية وإعدادات حسابك</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {(managerSuspended || userSuspended) && (
                <span className="inline-flex items-center gap-2 rounded-full px-4 h-10 text-sm font-medium"
                      style={{ background: "#FFF0F0", border: "1px solid #F5C2C7", color: "#7A0010" }}>
                  <AlertTriangle className="h-4 w-4" />
                  موقوف مؤقتًا
                </span>
              )}

              <button
                onClick={() => {
                  if (managerSuspended) {
                    alert("الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا");
                    return;
                  }
                  router.push("/profile/edit");
                }}
                className="h-10 px-5 rounded-full inline-flex items-center gap-2 font-semibold disabled:opacity-60 transition-all duration-200 hover:opacity-90"
                style={{ background: COLORS.primary, color: "#FFFFFF" }}
                disabled={managerSuspended}
                title={managerSuspended ? "الكيان متوقف — لا يمكن تنفيذ الإجراء حاليًا" : undefined}
              >
                <Pencil className="h-4 w-4" />
                تعديل البيانات
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl w-full px-4 mt-6 pb-10 flex-1">
        <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">بيانات الحساب</CardTitle>
                <CardDescription className="text-[#6B6B6B] mt-1">معلوماتك الأساسية وطرق التواصل</CardDescription>
              </div>
              {!loading && me && (
                <div className="h-10 px-4 rounded-full grid place-items-center text-sm font-medium"
                     style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                  {roleLabel[me.role] || me.role}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: COLORS.soft }} />
                ))}
              </div>
            ) : !me ? (
              <div className="text-center py-12">
                <div className="text-sm font-medium mb-1" style={{ color: COLORS.text }}>لا يمكن تحميل البيانات</div>
                <div className="text-sm" style={{ color: COLORS.muted }}>حاول مرة أخرى لاحقاً</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
                {/* العمود الأيسر: الصورة + الأزرار */}
                <div className="rounded-2xl p-6 flex flex-col items-stretch"
                     style={{ background: COLORS.soft, border: `1px solid ${COLORS.border}` }}>
                  <button
                    type="button"
                    onClick={me.avatar ? openAvatarModal : undefined}
                    className="w-32 h-32 rounded-2xl overflow-hidden grid place-items-center mx-auto focus:outline-none transition-all duration-200 hover:scale-105"
                    style={{ background: COLORS.card, border: `2px solid ${COLORS.border}`, cursor: me.avatar ? "zoom-in" : "default", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    aria-label={me.avatar ? "تكبير الصورة الشخصية" : "الصورة الشخصية"}
                  >
                    {me.avatar ? (
                      <img src={me.avatar} alt={me.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl font-bold" style={{ color: COLORS.primary }}>
                        {me.name?.trim()?.charAt(0) || "?"}
                      </span>
                    )}
                  </button>

                  <div className="text-center mt-4">
                    <div className="font-bold text-xl" style={{ color: COLORS.text }}>{me.name}</div>
                    <div className="text-sm mt-1.5 px-3 py-1 rounded-full inline-block" style={{ background: COLORS.card, color: COLORS.muted }}>
                      {me.role === "entityManager" && managerSuspended ? "مسؤول كيان — (موقوف)" : (roleLabel[me.role] || me.role)}
                    </div>
                  </div>

                  {/* الأزرار الجانبية */}
                  {["user", "entityManager", "unionSupervisor"].includes(me.role) && (
                    <div className="mt-6 space-y-2">
                      <button
                        onClick={() => router.push("/profile/history")}
                        className="w-full h-11 px-4 rounded-xl inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 hover:bg-opacity-80"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                        title="عرض سجل المنصة والعضوية"
                      >
                        <Clock className="h-5 w-5" />
                        سجل المنصّة
                      </button>

                      <button
                        onClick={() => router.push("/profile/card")}
                        className="w-full h-11 px-4 rounded-xl inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 hover:bg-opacity-80"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.text }}
                        title="عرض كارت العضوية"
                      >
                        <IdCard className="h-5 w-5" />
                        كارت العضوية
                      </button>
                    </div>
                  )}
                </div>

                {/* العمود الأيمن: معلومات */}
                <div className="space-y-4">
                  {/* Personal Information Card */}
                  <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
                      <User className="h-5 w-5" style={{ color: COLORS.primary }} />
                      المعلومات الشخصية
                    </h3>
                    <div className="space-y-3">
                      <InfoRow icon={<User className="h-4 w-4" />} label="الاسم" value={me.name || "-"} />
                      <InfoRow icon={<Mail className="h-4 w-4" />} label="البريد الإلكتروني" value={me.email || "-"} />
                      <InfoRow icon={<Hash className="h-4 w-4" />} label="الرقم القومي" value={shownNationalId || "-"} />
                    </div>
                  </div>

                  {/* Contact Information Card */}
                  <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
                      <Phone className="h-5 w-5" style={{ color: COLORS.primary }} />
                      معلومات الاتصال
                    </h3>
                    <div className="space-y-3">
                      <InfoRow icon={<Phone className="h-4 w-4" />} label="الهاتف" value={me.phone || "-"} />
                      <InfoRow icon={<MapPin className="h-4 w-4" />} label="المدينة" value={me.city || "-"} />
                    </div>
                  </div>

                  {/* Entity Information Card */}
                  <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                    <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
                      <Layers className="h-5 w-5" style={{ color: COLORS.primary }} />
                      معلومات الكيان
                    </h3>
                    <InfoRow icon={<Layers className="h-4 w-4" />} label="الكيان الحالي" custom={entityField} />
                  </div>

                  {/* Interests Card */}
                  {((me.interests && me.interests.length > 0) || me.bio) && (
                    <div className="rounded-2xl p-5" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
                      <h3 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: COLORS.text }}>
                        <Tag className="h-5 w-5" style={{ color: COLORS.primary }} />
                        الاهتمامات والنبذة
                      </h3>
                      {me.interests && me.interests.length > 0 && (
                        <div className="mb-4">
                          <div className="text-sm mb-2" style={{ color: COLORS.muted }}>الاهتمامات</div>
                          <div className="flex flex-wrap gap-2">
                            {me.interests.map((t, i) => (
                              <span key={i} className="text-sm rounded-full px-4 h-8 inline-flex items-center font-medium"
                                    style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}`, color: COLORS.text }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {me.bio && (
                        <div className="rounded-xl p-4" style={{ background: COLORS.soft, border: `1px solid ${COLORS.line}` }}>
                          <div className="text-sm font-medium mb-2" style={{ color: COLORS.muted }}>نبذة شخصية</div>
                          <div className="text-sm leading-relaxed" style={{ color: COLORS.text }}>{me.bio}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* مودال الصورة */}
      {showAvatarModal && me?.avatar && (
        <div className="fixed inset-0 z-[999]" role="dialog" aria-modal="true" aria-label="معاينة الصورة الشخصية">
          <div className="absolute inset-0 bg-black/60" onClick={closeAvatarModal} />
          <div className="absolute inset-0 p-4 grid place-items-center">
            <div className="relative max-w-[90vw] max-h-[85vh] rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${COLORS.border}` }}>
              <button
                type="button"
                onClick={closeAvatarModal}
                className="absolute top-2 left-2 z-10 h-9 w-9 rounded-full grid place-items-center bg-white/90 border hover:bg-white"
                title="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="w-[min(92vw,720px)] h-[min(80vh,720px)] grid place-items-center bg-black">
                <img src={me.avatar} alt={me.name} className="max-w/full max-h-full object-contain" />
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
        <div className="mt-4 h-14 w-full rounded-٢xl flex items-center justify-between px-4 bg-white border border-[#E7E2DC] shadow-[0_6px_12px_rgba(0,0,0,0.04)]">
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
