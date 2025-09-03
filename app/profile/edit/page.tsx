"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { Session } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, Save, ArrowRight } from "lucide-react";

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
  id: string; name: string; email: string; role: string;
  entityId?: string | null; interests?: string[];
  phone?: string | null; city?: string | null; bio?: string | null; avatar?: string | null;
};

export default function ProfileEditPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [interestsStr, setInterestsStr] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

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
    fetch(`/api/me?id=${encodeURIComponent(session.id)}`, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then((u: Me) => {
        setMe(u);
        setName(u.name || "");
        setPhone(u.phone || "");
        setCity(u.city || "");
        setBio(u.bio || "");
        setInterestsStr((u.interests || []).join(", "));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.id]);

  const disabledSave = useMemo(() => !me || !name.trim() || saving, [me, name, saving]);

  const onSave = async () => {
    if (!me) return;
    setSaving(true);
    try {
      const interests = interestsStr.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: me.id,
          name: name.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
          interests,
          oldPassword: oldPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "تعذّر حفظ التعديلات");
        return;
      }
      setMe(data);
      try {
        const s = JSON.parse(localStorage.getItem("session") || "{}");
        localStorage.setItem("session", JSON.stringify({ ...s, name: data.name, email: data.email, role: data.role, entityId: data.entityId }));
      } catch {}
      alert("تم حفظ التعديلات بنجاح");
      router.push("/profile");
    } catch (e: any) {
      alert(e?.message || "خطأ غير متوقع");
    } finally {
      setSaving(false);
    }
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
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: COLORS.text }}>تعديل الملف الشخصي</h1>
              <p className="text-sm" style={{ color: COLORS.muted }}>قم بتحديث بيانات حسابك</p>
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
        <Card className="rounded-[22px] bg-white border border-[#E7E2DC] text-[#1D1D1D] shadow-[0_8px_18px_rgba(0,0,0,0.05)]">
          <CardHeader>
            <CardTitle>بيانات الحساب</CardTitle>
            <CardDescription className="text-[#6B6B6B]">عدّل اسمك وطرق التواصل والاهتمامات</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-24 rounded-2xl animate-pulse" style={{ background: "#0000000A" }} />
            ) : !me ? (
              <div className="text-sm" style={{ color: COLORS.muted }}>لا يمكن تحميل البيانات حالياً.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">الاسم</label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="h-11 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm mb-1">البريد الإلكتروني</label>
                  <Input value={me.email} readOnly className="h-11 rounded-xl opacity-80" />
                </div>
                <div>
                  <label className="block text-sm mb-1">رقم الهاتف</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-11 rounded-xl" placeholder="مثال: 01012345678" />
                </div>
                <div>
                  <label className="block text-sm mb-1">المدينة</label>
                  <Input value={city} onChange={e => setCity(e.target.value)} className="h-11 rounded-xl" placeholder="مثال: القاهرة" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">نبذة مختصرة</label>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} className="min-h-[100px] rounded-xl" placeholder="اكتب نبذة قصيرة عنك..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">الاهتمامات (افصل بينها بفواصل , )</label>
                  <Input value={interestsStr} onChange={e => setInterestsStr(e.target.value)} className="h-11 rounded-xl" placeholder="تطوع, برمجة, تصوير" />
                </div>

                <div className="md:col-span-2 mt-2 border-t pt-3">
                  <div className="text-sm mb-2 text-[#6B6B6B]">تغيير كلمة السر (اختياري)</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">كلمة السر الحالية</label>
                      <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">كلمة السر الجديدة</label>
                      <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="h-11 rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end mt-3">
                  <button
                    disabled={disabledSave}
                    onClick={onSave}
                    className="h-11 px-5 rounded-full font-semibold inline-flex items-center gap-2"
                    style={{ background: COLORS.primary, color: "#FFFFFF", opacity: disabledSave ? 0.6 : 1 }}
                  >
                    <Save className="h-4 w-4" />
                    حفظ التعديلات
                  </button>
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

/* ================== Header & Footer (مطابق للداشبورد) ================== */

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
