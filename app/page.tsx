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
      <div dir="rtl" className="relative min-h-screen overflow-hidden flex flex-col">
        <div className="absolute inset-0 -z-10">
          <div className="w-full h-full bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/LoginPage.png')" }} />
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d3c8f] via-[#1368d6] to-[#0a2e6a] opacity-90" />
        </div>

        <div className="pointer-events-none -z-0">
          <div className="absolute -top-10 right-14 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute top-28 left-1/3 h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
          <div className="absolute bottom-24 right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-72 w-72 -translate-x-1/4 translate-y-1/4 rounded-full bg-sky-300/10 blur-3xl" />
        </div>

        <HeaderBar />

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="relative z-10 w-full max-w-[420px]">
            <div className="text-center mb-7">
              <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur flex items-center justify-center">
                <Users className="h-8 w-8 text-white/95" />
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-wide">منصة الكيانات الشبابية</h1>
              <p className="text-white/80 mt-1 text-sm">منصة شاملة لإدارة وتنمية الكيانات الشبابية</p>
            </div>

            <Card className="rounded-[22px] bg-white/12 backdrop-blur-2xl border-white/25 text-white shadow-[0_28px_80px_-24px_rgba(0,0,0,0.55)]">
              <CardHeader className="text-center space-y-4 pb-3">
                <CardTitle className="text-2xl font-bold">{isLogin ? "مرحباً بعودتك" : "انضم إلينا"}</CardTitle>
                <CardDescription className="text-white/80">
                  {isLogin ? "سجل دخولك للوصول إلى حسابك" : "أنشئ حساباً جديداً وابدأ رحلتك معنا"}
                </CardDescription>

                <Tabs
                  value={isLogin ? "login" : "register"}
                  onValueChange={(v) => {
                    setIsLogin(v === "login");
                    setError("");
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 bg-white/10 rounded-full p-1">
                    <TabsTrigger
                      value="login"
                      className="h-10 rounded-full text-white/90 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow"
                    >
                      تسجيل الدخول
                    </TabsTrigger>
                    <TabsTrigger
                      value="register"
                      className="h-10 rounded-full text-white/90 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow"
                    >
                      إنشاء حساب
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent className="pt-0">
                {error && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-50 ring-1 ring-red-400/30 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/90 text-sm">الاسم الكامل</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="أدخل اسمك الكامل"
                        value={formData.name}
                        onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                        required
                        className="h-11 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 border-white/40 focus-visible:ring-white"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/90 text-sm">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="username@gmail.com"
                      value={formData.email}
                      onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      required
                      className="h-11 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 border-white/40 focus-visible:ring-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/90 text-sm">كلمة المرور</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                      required
                      className="h-11 rounded-xl bg-white/95 text-slate-900 placeholder:text-slate-400 border-white/40 focus-visible:ring-white"
                    />
                  </div>

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="role" className="text-white/90 text-sm">نوع المستخدم</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(v: UserRole) => setFormData((p) => ({ ...p, role: v }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl bg-white/95 text-slate-900 border-white/40 focus:ring-white">
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
                    className="w-full h-11 rounded-full bg-[#0e2e57] hover:bg-[#0b2546] text-white font-semibold border border-white/15"
                    disabled={isLoading}
                  >
                    {isLoading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
                  </Button>

                  <div className="mt-2">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 h-px bg-white/20" />
                      <span className="text-xs text-white/80">أو المتابعة بواسطة</span>
                      <span className="flex-1 h-px bg-white/20" />
                    </div>
                    <div className="mt-3 flex justify-center gap-4">
                      <IconButton src="/google.svg" alt="Google" />
                      <IconButton src="/github.svg" alt="GitHub" />
                      <IconButton src="/facebook.svg" alt="Facebook" />
                    </div>
                  </div>

                  <p className="text-center text-xs text-white/80 pt-1">
                    {isLogin ? (
                      <>
                        ليس لديك حساب؟{" "}
                        <button type="button" onClick={() => setIsLogin(false)} className="underline hover:opacity-90">
                          سجّل مجانًا
                        </button>
                      </>
                    ) : (
                      <>
                        لديك حساب بالفعل؟{" "}
                        <button type="button" onClick={() => setIsLogin(true)} className="underline hover:opacity-90">
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

        <FooterBar />
      </div>
    )
  );
}


function IconButton({ src, alt }: { src: string; alt: string }) {
  return (
    <button
      type="button"
      className="h-10 w-10 flex items-center justify-center rounded-full bg-white/95 hover:bg-white ring-1 ring-white/40 transition"
    >
      <img src={src} alt={alt} className="h-5 w-5" />
    </button>
  );
}

function HeaderBar() {
  const pathname = usePathname();

  const linkCls = (href: string) =>
    `px-3 py-1 rounded-lg transition ${
      pathname === href ? "bg-white/15 text-white" : "text-white/85 hover:text-white"
    }`;

  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-4 h-14 w-full rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-white/90" />
            </div>
            <Link href="/" className="text-white font-semibold">منصة الكيانات الشبابية</Link>
          </div>

          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/" className={linkCls("/")}>الرئيسية</Link>
            <Link href="/about" className={linkCls("/about")}>عن المنصة</Link>
            <Link href="/support" className={linkCls("/support")}>الدعم</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function FooterBar() {
  return (
    <footer className="relative z-10">
      <div className="mx-auto max-w-6xl px-4 pb-4">
        <div className="mt-6 h-12 w-full rounded-2xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 flex items-center justify-between px-4">
          <p className="text-white/80 text-xs">
            © {new Date().getFullYear()} منصة الكيانات الشبابية — كل الحقوق محفوظة
          </p>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/privacy" className="text-white/80 hover:text-white">الخصوصية</Link>
            <span className="text-white/30">•</span>
            <Link href="/terms" className="text-white/80 hover:text-white">الشروط</Link>
            <span className="text-white/30">•</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

