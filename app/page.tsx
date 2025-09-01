"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "dataUser" | "youth";
const ADMIN_EMAIL = "admin@youth-platform.com";

// لوحة ألوان الهوية
const PALETTE = {
  black: "#1D1D1D",
  red: "#EC1A24",
  white: "#F6F6F6",
  beige: "#EFE6DE",
};

function normalizeRole(role: unknown): Exclude<UserRole, "dataUser"> {
  const allowed: Array<Exclude<UserRole, "dataUser">> = [
    "systemAdmin",
    "qualitySupervisor",
    "entityManager",
    "youth",
  ];
  return allowed.includes(role as any) ? (role as any) : "youth";
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "youth" as UserRole,
    interests: [] as string[],
    entityId: null as string | null,
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!mounted) return;
    try {
      const s = localStorage.getItem("session");
      if (s) router.replace("/dashboard");
    } catch {}
  }, [mounted, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
          return;
        }
        if (formData.password.length < 3) {
          setError("كلمة المرور قصيرة جداً");
          return;
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
          return;
        }

        const finalRole = formData.email === ADMIN_EMAIL ? "systemAdmin" : normalizeRole(data?.role);

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
      } else {
        if (!formData.name.trim()) {
          setError("يرجى إدخال الاسم الكامل");
          return;
        }
        if (!formData.email) {
          setError("يرجى إدخال البريد الإلكتروني");
          return;
        }
        if (!formData.password || formData.password.length < 3) {
          setError("كلمة المرور قصيرة جداً");
          return;
        }

        const enforcedRole = formData.email === ADMIN_EMAIL ? "systemAdmin" : normalizeRole(formData.role);

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            role: enforcedRole,
            interests: formData.interests,
            entityId: formData.entityId,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error || "حدث خطأ أثناء إنشاء الحساب");
          return;
        }

        setIsLogin(true);
        setFormData({
          name: "",
          email: formData.email,
          password: "",
          role: "youth",
          interests: [],
          entityId: null,
        });
      }
    } catch {
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    mounted && (
      <div
        dir="rtl"
        className="relative min-h-screen overflow-hidden flex flex-col"
        style={{ backgroundColor: PALETTE.beige }}
      >
        {/* شريط علوي */}
        <HeaderBar />

        {/* مقدمة الهوية أعلى النموذج */}
        <div className="mx-auto max-w-6xl px-4 w-full mt-6">
          <BrandHeader />
        </div>

        {/* المحتوى */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="relative z-10 w-full max-w-[460px]">
            <Card
              className="rounded-[22px] border"
              style={{
                backgroundColor: "#FFFFFF",
                borderColor: "#E7E2DC",
                boxShadow:
                  "0 12px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.05)",
              }}
            >
              <CardHeader className="text-center space-y-3 pb-3">
                <div
                  className="mx-auto mb-2 h-14 w-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: PALETTE.white, border: `1px solid #E5E5E5` }}
                >
                  <Users className="h-8 w-8" color={PALETTE.black} />
                </div>
                <CardTitle
                  className="text-2xl font-extrabold tracking-wide"
                  style={{ color: PALETTE.black }}
                >
                  {isLogin ? "مرحباً بعودتك" : "إنشاء حساب جديد"}
                </CardTitle>
                <CardDescription style={{ color: "#6B6B6B" }}>
                  {isLogin
                    ? "سجل دخولك للوصول إلى حسابك"
                    : "أنشئ حساباً وابدأ رحلتك معنا"}
                </CardDescription>

                <Tabs
                  value={isLogin ? "login" : "register"}
                  onValueChange={(v) => {
                    setIsLogin(v === "login");
                    setError("");
                  }}
                  className="w-full"
                >
                  <TabsList
                    className="grid w-full grid-cols-2 rounded-full p-1"
                    style={{ backgroundColor: PALETTE.white }}
                  >
                    <TabsTrigger
                      value="login"
                      className="h-10 rounded-full data-[state=active]:shadow"
                      style={{
                        color: PALETTE.black,
                        backgroundColor: "transparent",
                      }}
                      data-state={isLogin ? "active" : undefined}
                    >
                      تسجيل الدخول
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="h-10 rounded-full data-[state=active]:shadow"
                      style={{
                        color: PALETTE.black,
                        backgroundColor: "transparent",
                      }}
                      data-state={!isLogin ? "active" : undefined}
                    >
                      إنشاء حساب
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="pt-0">
                {error && (
                  <div
                    className="mb-4 p-3 rounded-lg text-sm"
                    style={{
                      color: PALETTE.red,
                      background: "#FDEBEC",
                      border: `1px solid ${PALETTE.red}33`,
                    }}
                  >
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm" style={{ color: PALETTE.black }}>
                        الاسم الكامل
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="أدخل اسمك الكامل"
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        required
                        className="h-11 rounded-xl"
                        style={{
                          backgroundColor: PALETTE.white,
                          color: PALETTE.black,
                          borderColor: "#E3E3E3",
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm" style={{ color: PALETTE.black }}>
                      البريد الإلكتروني
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="username@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                      style={{
                        backgroundColor: PALETTE.white,
                        color: PALETTE.black,
                        borderColor: "#E3E3E3",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm" style={{ color: PALETTE.black }}>
                      كلمة المرور
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      required
                      className="h-11 rounded-xl"
                      style={{
                        backgroundColor: PALETTE.white,
                        color: PALETTE.black,
                        borderColor: "#E3E3E3",
                      }}
                    />
                  </div>

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-sm" style={{ color: PALETTE.black }}>
                        نوع المستخدم
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={(v: UserRole) => setFormData((p) => ({ ...p, role: v }))}
                      >
                        <SelectTrigger
                          className="h-11 rounded-xl"
                          style={{
                            backgroundColor: PALETTE.white,
                            color: PALETTE.black,
                            borderColor: "#E3E3E3",
                          }}
                        >
                          <SelectValue placeholder="اختر نوع المستخدم" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="systemAdmin">مدير النظام</SelectItem>
                          <SelectItem value="qualitySupervisor">مشرف جودة</SelectItem>
                          <SelectItem value="entityManager">مسؤول كيان</SelectItem>
                          <SelectItem value="youth">مستخدم</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-11 rounded-full font-semibold"
                    disabled={isLoading}
                    style={{
                      backgroundColor: PALETTE.red,
                      color: "#FFFFFF",
                    }}
                  >
                    {isLoading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
                  </Button>

                  <div className="mt-2">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 h-px" style={{ backgroundColor: "#DDD6CD" }} />
                      <span className="text-xs" style={{ color: "#6B6B6B" }}>
                        أو المتابعة بواسطة
                      </span>
                      <span className="flex-1 h-px" style={{ backgroundColor: "#DDD6CD" }} />
                    </div>
                    <div className="mt-3 flex justify-center gap-4">
                      <IconButton src="/google.svg" alt="Google" />
                      <IconButton src="/github.svg" alt="GitHub" />
                      <IconButton src="/facebook.svg" alt="Facebook" />
                    </div>
                  </div>

                  <p className="text-center text-xs pt-1" style={{ color: "#6B6B6B" }}>
                    {isLogin ? (
                      <>
                        ليس لديك حساب؟{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(false)}
                          className="underline"
                          style={{ color: PALETTE.black }}
                        >
                          سجّل مجانًا
                        </button>
                      </>
                    ) : (
                      <>
                        لديك حساب بالفعل؟{" "}
                        <button
                          type="button"
                          onClick={() => setIsLogin(true)}
                          className="underline"
                          style={{ color: PALETTE.black }}
                        >
                          سجّل الدخول
                        </button>
                      </>
                    )}
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* ذيل الصفحة */}
        <FooterBar />
      </div>
    )
  );
}

/* زر أيقونة الشبكات */
function IconButton({ src, alt }: { src: string; alt: string }) {
  return (
    <button
      type="button"
      className="h-10 w-10 flex items-center justify-center rounded-full transition ring-1"
      style={{ backgroundColor: "#FFFFFF", borderColor: "#E7E7E7" }}
    >
      <img src={src} alt={alt} className="h-5 w-5" />
    </button>
  );
}

/* ترويسة الموقع بالهوية الجديدة */
function HeaderBar() {
  const pathname = usePathname();
  const linkActive = (href: string) => pathname === href;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div
          className="mt-4 h-14 w-full rounded-2xl flex items-center justify-between px-4"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 6px 12px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center gap-3">
            {/* لو عندك شعار SVG/PNG حطه مكان الصورة التالية */}
            {/* مثال: <img src="/yeu-logo.svg" alt="YEU" className="h-8 w-auto" /> */}
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
                style={{
                  color: linkActive(l.href) ? "#FFFFFF" : PALETTE.black,
                  backgroundColor: linkActive(l.href) ? PALETTE.red : "transparent",
                }}
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

/* شريط تعريفي بالهوية (اختياري لكنه يبرز التصميم كما في الصورة) */
function BrandHeader() {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-start gap-4">
        {/* لوغو/صورة الهوية العامة – يمكنك استبدال src بالصورة لديك */}
        <img
          src="/yeu-logo.png"
          alt="YEU"
          className="h-14 w-14 rounded-md object-contain"
          onError={(e) => {
            // في حال عدم وجود الصورة، نخلي المربع فارغ
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div>
          <h2
            className="text-2xl font-extrabold leading-7"
            style={{ color: PALETTE.black }}
          >
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

function Swatch({
  label,
  value,
  bg,
  fg,
}: {
  label: string;
  value: string;
  bg: string;
  fg: string;
}) {
  return (
    <div
      className="px-4 py-2 rounded-xl text-sm border"
      style={{
        backgroundColor: bg,
        color: fg,
        borderColor: "#D9D4CD",
        minWidth: 120,
        textAlign: "center",
      }}
      title={value}
    >
      <div className="font-semibold">{label}</div>
      <div className="tracking-wide">{value}</div>
    </div>
  );
}

function FooterBar() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-6">
        <div
          className="mt-6 h-12 w-full rounded-2xl flex items-center justify-between px-4 text-xs"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E7E2DC",
            boxShadow: "0 6px 12px rgba(0,0,0,0.04)",
            color: "#595959",
          }}
        >
          <p>
            © {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة
          </p>
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
