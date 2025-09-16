"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Cairo } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";

type UserRole = "unionSupervisor" | "entityManager" | "user";

const cairo = Cairo({ subsets: ["arabic", "latin"], weight: ["400", "700", "800"] });
const PALETTE = { black: "#1D1D1D", red: "#EC1A24", white: "#F6F6F6", beige: "#EFE6DE" };

type EntityLite = { id: string; name: string };
type SupervisorContact = { id: string; name: string; email: string };

export default function HomePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tab, setTab] = useState<"login" | "register">("login");
  const [login, setLogin] = useState({ email: "", password: "" });
  const [uploading, setUploading] = useState(false);

  async function handleAvatarChange(file?: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "upload failed");
      setRegisterForm((p) => ({ ...p, avatarUrl: data.url }));
    } catch (e: any) {
      alert(e?.message || "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  const [registerForm, setRegisterForm] = useState<{
    name: string;
    email: string;
    password: string;
    nationalId: string;
    role: UserRole | "";
    entityId?: string | null;
    phone?: string;
    city?: string;
    bio?: string;
    interestsText?: string;
    avatarUrl?: string;
  }>({
    name: "",
    email: "",
    password: "",
    nationalId: "",
    role: "",
    entityId: null,
    phone: "",
    city: "",
    bio: "",
    interestsText: "",
    avatarUrl: "",
  });

  const [entities, setEntities] = useState<EntityLite[]>([]);
  const [supervisors, setSupervisors] = useState<SupervisorContact[]>([]);
  const [supervisorErr, setSupervisorErr] = useState("");

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    try {
      const s = localStorage.getItem("session");
      if (s) router.replace("/dashboard");
    } catch {}
  }, [mounted, router]);

  useEffect(() => {
    fetch("/api/entities", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows: any[]) => {
        const list = (rows || []).slice(0, 42).map((r) => ({ id: r.id, name: r.name })) as EntityLite[];
        setEntities(list);
        setRegisterForm((p) => ({
          ...p,
          entityId: p.role === "entityManager" ? (p.entityId || list[0]?.id || null) : null,
        }));
      })
      .catch(() => setEntities([]));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setSupervisorErr("");
        const r = await fetch("/api/admin/current-admins", { cache: "no-store" });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "تعذر التحميل");
        setSupervisors(Array.isArray(data?.admins) ? data.admins : []);
      } catch (e: any) {
        setSupervisors([]);
        setSupervisorErr(e?.message || "تعذر التحميل");
      }
    })();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (!login.email || !login.password) {
        setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
        return;
      }
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: login.email, password: login.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "بيانات الدخول غير صحيحة");
        return;
      }
      const finalRole: UserRole = data?.role || "user";
      localStorage.setItem(
        "session",
        JSON.stringify({
          id: data?.id,
          email: data?.email,
          role: finalRole,
          name: data?.name ?? "مستخدم",
          entityId: data?.entityId ?? null,
          permissions: data?.permissions ?? [],
        })
      );
      router.replace("/dashboard");
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { name, email, password, nationalId, role, entityId } = registerForm;
      if (!name.trim()) return setError("من فضلك أدخل الاسم");
      if (!email.trim()) return setError("من فضلك أدخل البريد الإلكتروني");
      if (!password) return setError("من فضلك أدخل كلمة المرور");
      if (!nationalId.trim() || !/^\d{14}$/.test(nationalId)) return setError("أدخل الرقم القومي (14 رقمًا صحيحًا)");
      if (!role) return setError("من فضلك اختر الدور");
      const payloadEntityId = role === "entityManager" ? (entityId || entities[0]?.id || null) : null;
      if (role === "entityManager" && !payloadEntityId) return setError("اختر كيانك للدور المحدد");
      const interests = (registerForm.interestsText || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name,
        email,
        password,
        nationalId,
        role,
        entityId: payloadEntityId,
        phone: registerForm.phone || null,
        city: registerForm.city || null,
        bio: registerForm.bio || null,
        interests,
        avatar: registerForm.avatarUrl || null,
      };
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "تعذر إنشاء الحساب");
        return;
      }
      alert("تم التسجيل بنجاح. يمكنك الآن تسجيل الدخول.");
      setTab("login");
      setRegisterForm({
        name: "",
        email: "",
        password: "",
        nationalId: "",
        role: "",
        entityId: null,
        phone: "",
        city: "",
        bio: "",
        interestsText: "",
        avatarUrl: "",
      });
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setRegisterForm((p) => ({
      ...p,
      entityId: p.role === "entityManager" ? (p.entityId || entities[0]?.id || null) : null,
    }));
  }, [registerForm.role, entities]);

  if (!mounted) return null;

  return (
    <div dir="rtl" className={`${cairo.className} relative min-h-screen overflow-hidden flex flex-col`} style={{ backgroundColor: PALETTE.beige }}>
      <HeaderBar />

      <div className="mx-auto max-w-6xl px-4 w-full mt-6">
        <BrandHeader />
      </div>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="relative z-10 w-full max-w-[580px]">
          <Card
            className="rounded-[22px] border"
            style={{ backgroundColor: "#FFFFFF", borderColor: "#E7E2DC", boxShadow: "0 12px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.05)" }}
          >
            <CardHeader className="text-center space-y-3 pb-3">
              <div className="mx-auto mb-2 h-14 w-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: PALETTE.white, border: `1px solid #E5E5E5` }}>
                <Users className="h-8 w-8" color={PALETTE.black} />
              </div>

              <Tabs
                value={tab}
                onValueChange={(v) => {
                  setTab(v as any);
                  setError("");
                }}
              >
                <TabsList className="grid w-full grid-cols-2 rounded-full p-1" style={{ backgroundColor: PALETTE.white }}>
                  <TabsTrigger value="login" className="h-10 rounded-full data-[state=active]:shadow" style={{ color: PALETTE.black, backgroundColor: "transparent" }}>
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger value="register" className="h-10 rounded-full data-[state=active]:shadow" style={{ color: PALETTE.black, backgroundColor: "transparent" }}>
                    تسجيل عضو
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <CardTitle className="text-2xl font-extrabold tracking-wide" style={{ color: PALETTE.black }}>
                {tab === "login" ? "مرحباً بعودتك" : "أنشئ حسابك"}
              </CardTitle>
              <CardDescription style={{ color: "#6B6B6B" }}>
                {tab === "login" ? "ادخل للوصول إلى لوحة التحكم" : "اختر دورك المناسب وأكمل بياناتك"}
              </CardDescription>

              {tab === "register" && (
                <div className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: "#FFF7E6", border: "1px solid #FFE7BA", color: "#8B5E00" }}>
                  {supervisorErr ? (
                    <span>تعذر جلب بيانات مسؤول اتحاد الكيانات.</span>
                  ) : supervisors.length === 0 ? (
                    <span>لا يوجد مسؤول اتحاد مُعلن حاليًا.</span>
                  ) : supervisors.length === 1 ? (
                    <span>
                      مسؤول الاتحاد الحالي: <strong style={{ direction: "ltr" }}>{supervisors[0].email}</strong>
                      {supervisors[0].name ? ` — ${supervisors[0].name}` : null}
                    </span>
                  ) : (
                    <span>
                      مسؤولو الاتحاد الحاليون:{" "}
                      {supervisors.map((a, i) => (
                        <span key={a.id}>
                          <strong style={{ direction: "ltr" }}>{a.email}</strong>
                          {a.name ? ` — ${a.name}` : null}
                          {i < supervisors.length - 1 ? "، " : ""}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>

            <CardContent className="pt-0">
              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm" style={{ color: PALETTE.red, background: "#FDEBEC", border: `1px solid ${PALETTE.red}33` }}>
                  {error}
                </div>
              )}

              {tab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      البريد الإلكتروني
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={login.email}
                      onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))}
                      placeholder="username@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      كلمة المرور
                    </Label>
                    <Input
                      type="password"
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={login.password}
                      onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 rounded-full font-semibold" disabled={isLoading} style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                    {isLoading ? "جاري التحميل..." : "تسجيل الدخول"}
                  </Button>
                </form>
              )}

              {tab === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      الاسم الكامل
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.name}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="اكتب اسمك"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      البريد الإلكتروني
                    </Label>
                    <Input
                      type="email"
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="username@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      كلمة المرور
                    </Label>
                    <Input
                      type="password"
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      الرقم القومي (14 رقم)
                    </Label>
                    <Input
                      inputMode="numeric"
                      pattern="\d{14}"
                      maxLength={14}
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.nationalId}
                      onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D+/g, "").slice(0, 14);
                        setRegisterForm((p) => ({ ...p, nationalId: onlyDigits }));
                      }}
                      placeholder="مثال: 2980XXXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      الصورة الشخصية
                    </Label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="image/*" onChange={(e) => handleAvatarChange(e.target.files?.[0] || null)} />
                      {uploading && <span className="text-xs" style={{ color: "#6B6B6B" }}>جاري الرفع…</span>}
                      {registerForm.avatarUrl && <img src={registerForm.avatarUrl} alt="avatar" className="h-10 w-10 rounded-md object-cover border" />}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      الهاتف
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.phone}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      المدينة
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.city}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, city: e.target.value }))}
                      placeholder="القاهرة"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      الاهتمامات
                    </Label>
                    <Input
                      className="h-11 rounded-xl"
                      style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}
                      value={registerForm.interestsText}
                      onChange={(e) => setRegisterForm((p) => ({ ...p, interestsText: e.target.value }))}
                      placeholder="تطوع, تدريب, مناظرات"
                    />
                    <p className="text-xs" style={{ color: "#6B6B6B" }}>اكتب الاهتمامات مفصولة بفواصل.</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" style={{ color: PALETTE.black }}>
                      اختر الدور
                    </Label>
                    <Select value={registerForm.role} onValueChange={(v) => setRegisterForm((p) => ({ ...p, role: v as UserRole }))}>
                      <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}>
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">مستخدم</SelectItem>
                        <SelectItem value="entityManager">مدير كيان</SelectItem>
                        <SelectItem value="unionSupervisor">مسؤول اتحاد الكيانات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {registerForm.role === "entityManager" && (
                    <div className="space-y-2">
                      <Label className="text-sm" style={{ color: PALETTE.black }}>
                        اختر الكيان (لمدير الكيان)
                      </Label>
                      <Select value={registerForm.entityId || ""} onValueChange={(v) => setRegisterForm((p) => ({ ...p, entityId: v }))}>
                        <SelectTrigger className="h-11 rounded-xl" style={{ backgroundColor: PALETTE.white, color: PALETTE.black, borderColor: "#E3E3E3" }}>
                          <SelectValue placeholder="اختر كيانًا" />
                        </SelectTrigger>
                        <SelectContent>
                          {entities.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-11 rounded-full font-semibold" disabled={isLoading} style={{ backgroundColor: PALETTE.red, color: "#FFFFFF" }}>
                    {isLoading ? "جاري إنشاء الحساب..." : "تسجيل الحساب"}
                  </Button>

                  <p className="text-xs text-center" style={{ color: "#6B6B6B" }}>
                    في حالة اختيار "مسؤول اتحاد الكيانات" قد نحتاج لموافقة مسؤول قائم قبل التفعيل.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <FooterBar />
    </div>
  );
}

function HeaderBar() {
  const pathname = usePathname();
  const linkActive = (href: string) => pathname === href;
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: PALETTE.white }}>
              <Users className="h-5 w-5" color={PALETTE.black} />
            </div>
            <Link href="/" className="font-semibold" style={{ color: PALETTE.black }}>
              منصة الكيانات الشبابية
            </Link>
          </div>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            {[
              { href: "/", label: "الرئيسية" },
              { href: "/about", label: "عن المنصة" },
              { href: "/support", label: "الدعم" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-1 rounded-lg transition"
                style={{ color: linkActive(l.href) ? "#FFFFFF" : PALETTE.black, backgroundColor: linkActive(l.href) ? PALETTE.red : "transparent" }}
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

function BrandHeader() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 rounded-md flex items-center justify-center" style={{ background: PALETTE.white, border: "1px solid #E5E5E5" }}>
          <Users className="h-8 w-8" color={PALETTE.black} />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold leading-7" style={{ color: PALETTE.black }}>
            الكيانات الشبابية
          </h2>
          <p className="mt-1" style={{ color: PALETTE.black }}>
            إتحاد تنظيم الكيانات الشبابية
          </p>
          <p className="mt-1 text-xs tracking-wide">
            <span style={{ color: PALETTE.red, fontWeight: 700 }}>YEU</span>{" "}
            <span style={{ color: "#6B6B6B" }}>| Youth Entities Union</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FooterBar() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div
          className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E7E2DC", boxShadow: "0 6px 12px rgba(0,0,0,0.04)", color: "#595959" }}
        >
          <p>© {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة</p>
          <div className="flex items-center gap-3">
            <Link href="/privacy" className="hover:underline" style={{ color: PALETTE.black }}>
              الخصوصية
            </Link>
            <span style={{ color: "#B9B9B9" }}>•</span>
            <Link href="/terms" className="hover:underline" style={{ color: PALETTE.black }}>
              الشروط
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
