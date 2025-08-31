
"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { Users } from "lucide-react"

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "dataUser" | "youth"

const ADMIN_EMAIL = "admin@youth-platform.com"

// نحافظ على الأدوار المدعومة فقط
function normalizeRole(role: unknown): Exclude<UserRole, "dataUser"> {
  const allowed: Array<Exclude<UserRole, "dataUser">> = [
    "systemAdmin",
    "qualitySupervisor",
    "entityManager",
    "youth",
  ]
  return allowed.includes(role as any) ? (role as any) : "youth"
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "youth" as UserRole,
    interests: [] as string[],
    entityId: null as string | null,
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // لو فيه جلسة محفوظة، ادخل مباشرة
  useEffect(() => {
    if (!mounted) return
    try {
      const s = localStorage.getItem("session")
      if (s) router.replace("/dashboard")
    } catch {}
  }, [mounted, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          setError("يرجى إدخال البريد الإلكتروني وكلمة المرور")
          return
        }
        if (formData.password.length < 3) {
          setError("كلمة المرور قصيرة جداً")
          return
        }

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error || "البريد الإلكتروني أو كلمة المرور غير صحيحة")
          return
        }

        const finalRole =
          formData.email === ADMIN_EMAIL ? "systemAdmin" : normalizeRole(data?.role)

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
        )
        router.replace("/dashboard")
      } else {
        // تسجيل جديد
        if (!formData.name.trim()) {
          setError("يرجى إدخال الاسم الكامل")
          return
        }
        if (!formData.email) {
          setError("يرجى إدخال البريد الإلكتروني")
          return
        }
        if (!formData.password || formData.password.length < 3) {
          setError("كلمة المرور قصيرة جداً")
          return
        }

        const enforcedRole =
          formData.email === ADMIN_EMAIL ? "systemAdmin" : normalizeRole(formData.role)

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
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data?.error || "حدث خطأ أثناء إنشاء الحساب")
          return
        }

        // نجاح: رجّعه لعلامة تبويب تسجيل الدخول مع تهيئة الحقول
        setIsLogin(true)
        setFormData({
          name: "",
          email: formData.email,
          password: "",
          role: "youth",
          interests: [],
          entityId: null,
        })
      }
    } catch {
      setError("حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    mounted && (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">منصة الكيانات الشبابية</h1>
            <p className="text-gray-600">منصة شاملة لإدارة وتنمية الكيانات الشبابية</p>
          </div>

          <Card>
            <CardHeader className="text-center space-y-4">
              {isLogin ? (
                <>
                  <CardTitle className="text-2xl font-bold text-gray-900">مرحباً بعودتك</CardTitle>
                  <CardDescription className="text-gray-600">
                    سجل دخولك للوصول إلى حسابك
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl font-bold text-gray-900">انضم إلينا</CardTitle>
                  <CardDescription className="text-gray-600">
                    أنشئ حساباً جديداً وابدأ رحلتك معنا
                  </CardDescription>
                </>
              )}

              <Tabs
                value={isLogin ? "login" : "register"}
                onValueChange={(value) => {
                  setIsLogin(value === "login")
                  setError("")
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-gray-100 rounded-lg p-1">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                  >
                    تسجيل الدخول
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                  >
                    إنشاء حساب
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="أدخل اسمك الكامل"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    value={formData.password}
                    onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="role">نوع المستخدم</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(v: UserRole) => setFormData((p) => ({ ...p, role: v }))}
                    >
                      <SelectTrigger>
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  )
}

