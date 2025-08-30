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
import { Users, Trophy, Palette, Calculator, Music, BookOpen } from "lucide-react"
import { dataStore } from "@/lib/data-store"

export default function HomePage() {
  // mounted guard لمنع مشاكل hydration
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // الحالة
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    userType: "youth" as "youth" | "admin",
    interests: [] as string[],
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const interests = [
    { id: "كرة القدم", label: "كرة القدم", icon: Trophy },
    { id: "الرسم", label: "الرسم", icon: Palette },
    { id: "ريادة الأعمال", label: "ريادة الأعمال", icon: Calculator },
    { id: "الموسيقى", label: "الموسيقى", icon: Music },
    { id: "الأدب", label: "الأدب", icon: BookOpen },
    { id: "الاقتصاد", label: "الاقتصاد", icon: Calculator },
    { id: "التكنولوجيا", label: "التكنولوجيا", icon: Users },
    { id: "أخرى", label: "أخرى", icon: Users },
  ]

  const ADMIN_EMAIL = "admin@youth-platform.com"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (isLogin) {
        const user = dataStore.login(formData.email, formData.password)

        if (user) {
          // ترقية الأدمن
          if (formData.email === ADMIN_EMAIL) user.role = "admin"

          // حفظ الجلسة ليستعملها الداشبورد/الصفحات الداخلية
          localStorage.setItem(
            "session",
            JSON.stringify({ email: user.email, role: user.role, name: user.name })
          )

          router.push("/dashboard")
        } else {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة")
        }
      } else {
        // التسجيل
        if (!formData.name.trim()) {
          setError("يرجى إدخال الاسم الكامل")
          return
        }

        const existingUsers = dataStore.getUsers()
        if (existingUsers.some((u) => u.email === formData.email)) {
          setError("هذا البريد الإلكتروني مستخدم بالفعل")
          return
        }

        const enforcedRole = formData.email === ADMIN_EMAIL ? "admin" : formData.userType

        const newUser = dataStore.register({
          name: formData.name,
          email: formData.email,
          role: enforcedRole,
          interests: formData.interests,
        })

        if (newUser) {
          setError("")
          alert("تم إنشاء الحساب بنجاح! يرجى تسجيل الدخول الآن.")
          setIsLogin(true)
          setFormData({ name: "", email: "", password: "", userType: "youth", interests: [] })
        } else {
          setError("حدث خطأ أثناء إنشاء الحساب")
        }
      }
    } catch {
      setError("حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleInterest = (interestId: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }))
  }

  // التحكم في العرض لتفادي hydration
  return (
    mounted && (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">منصة الكيانات الشبابية</h1>
            <p className="text-gray-600">منصة شاملة لإدارة وتنمية المواهب الشبابية</p>
          </div>

          <Card>
            <CardHeader>
              <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                  <TabsTrigger value="register">إنشاء حساب</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <CardTitle>مرحباً بعودتك</CardTitle>
                  <CardDescription>سجل دخولك للوصول إلى حسابك</CardDescription>
                </TabsContent>

                <TabsContent value="register">
                  <CardTitle>انضم إلينا</CardTitle>
                  <CardDescription>أنشئ حساباً جديداً وابدأ رحلتك معنا</CardDescription>
                </TabsContent>
              </Tabs>
            </CardHeader>

            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>

                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="userType">نوع المستخدم</Label>
                      <Select
                        value={formData.userType}
                        onValueChange={(value: "youth" | "admin") =>
                          setFormData((prev) => ({ ...prev, userType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المستخدم" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="youth">شاب</SelectItem>
                          <SelectItem value="admin">مدير</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.userType === "youth" && (
                      <div className="space-y-2">
                        <Label>اهتماماتك</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {interests.map((interest) => {
                            const Icon = interest.icon
                            const isSelected = formData.interests.includes(interest.id)
                            return (
                              <Button
                                key={interest.id}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleInterest(interest.id)}
                                className="justify-start"
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                {interest.label}
                              </Button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء الحساب"}
                </Button>
              </form>

              {isLogin && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <p className="font-medium mb-1">حسابات تجريبية:</p>
                  <p>• المدير العام: admin@youth-platform.com (كلمة المرور: admin123)</p>
                  <p>• الشاب: sara@example.com (أي كلمة مرور)</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  )
}
