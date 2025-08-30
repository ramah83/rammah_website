"use client"

import {
  useCurrentUser,
  useStatistics,
  useActivities,
  useUserActivities,
  useAchievements,
  useEvents,
} from "@/hooks/use-data-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Trophy, Palette, Calculator, Music, BookOpen,
  Calendar, Award, TrendingUp, Activity, Users, Plus,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const ADMIN_EMAIL = "admin@youth-platform.com"
const ADMIN_ONLY = false

export default function Dashboard() {
  // 1) أول hook
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 2) نعلن باقي الـ hooks دايمًا بنفس الترتيب (بدون early return)
  const user = useCurrentUser()
  const statistics = useStatistics()
  const allActivities = useActivities()
  const userActivities = useUserActivities(user?.id || "")
  const userAchievements = useAchievements(user?.id)
  const events = useEvents()
  const router = useRouter()

  const effectiveRole: "admin" | "youth" | undefined = useMemo(() => {
    if (!user) return undefined
    return user.email === ADMIN_EMAIL ? "admin" : (user.role as "admin" | "youth")
  }, [user])

  // 3) التحويلات بعد mounted فقط
  useEffect(() => {
    if (!mounted) return
    if (!user) {
      router.push("/")
      return
    }
    if (ADMIN_ONLY && effectiveRole !== "admin") {
      router.push("/")
    }
  }, [mounted, user, effectiveRole, router])

  const interestIcons = {
    "كرة القدم": Trophy,
    الرسم: Palette,
    "ريادة الأعمال": Calculator,
    الموسيقى: Music,
    الأدب: BookOpen,
  } as const

  // 4) منغيرش ترتيب hooks — نتحكم في العرض بس
  return mounted ? (
    !user ? null : effectiveRole === "admin" ? (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">مرحباً {user.name}</h2>
            <p className="text-gray-600">إحصائيات المنصة والأنشطة</p>
          </div>
          <Button onClick={() => router.push("/dashboard/activities")}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة نشاط جديد
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الشباب</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.usersByRole.youth}</div>
              <p className="text-xs text-muted-foreground">شاب نشط</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الأنشطة النشطة</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeActivities}</div>
              <p className="text-xs text-muted-foreground">من أصل {statistics.totalActivities}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{statistics.activeUsers} نشط</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">الإنجازات</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalAchievements}</div>
              <p className="text-xs text-muted-foreground">إنجاز محقق</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>الأنشطة حسب الفئة</CardTitle>
              <CardDescription>توزيع الأنشطة حسب النوع</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(statistics.activitiesByCategory).map(([category, count]) => {
                const Icon = (interestIcons as any)[category] || Activity
                const percentage = statistics.totalActivities ? (count / statistics.totalActivities) * 100 : 0
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Icon className="h-5 w-5 text-blue-600 mr-2" />
                      <span>{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="w-20" />
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الأحداث القادمة</CardTitle>
              <CardDescription>الفعاليات والأنشطة المجدولة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {events
                .filter((e) => e.status === "upcoming")
                .slice(0, 3)
                .map((event) => {
                  const Icon = (interestIcons as any)[event.category] || Calendar
                  return (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{event.date}</p>
                        </div>
                      </div>
                      <Badge>{event.status === "upcoming" ? "قريباً" : event.status}</Badge>
                    </div>
                  )
                })}
            </CardContent>
          </Card>
        </div>
      </div>
    ) : (
      // لوحة المستخدم العادي
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">مرحباً بك، {user.name}</h2>
            <p className="text-gray-600">تابع أنشطتك وإنجازاتك</p>
          </div>
          <Button onClick={() => router.push("/dashboard/activities")}>
            <Plus className="h-4 w-4 mr-2" />
            انضم لنشاط جديد
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>اهتماماتي</CardTitle>
                <CardDescription>المجالات التي تهتم بها</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {user.interests.map((interest) => {
                    const Icon = (interestIcons as any)[interest] || Activity
                    return (
                      <div
                        key={interest}
                        className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                        onClick={() => router.push(`/dashboard/${interest === "كرة القدم" ? "sports" : "arts"}`)}
                      >
                        <Icon className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium">{interest}</p>
                          <p className="text-sm text-muted-foreground">اضغط للاستكشاف</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الأنشطة الحالية</CardTitle>
                <CardDescription>الأنشطة التي تشارك فيها حالياً</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {userActivities.slice(0, 3).map((activity) => {
                  const Icon = (interestIcons as any)[activity.category] || Activity
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <Icon className="h-6 w-6 text-blue-600 mr-3" />
                        <div>
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground">{activity.schedule}</p>
                        </div>
                      </div>
                      <Badge variant={activity.status === "active" ? "default" : "secondary"}>
                        {activity.status === "active" ? "نشط" : activity.status}
                      </Badge>
                    </div>
                  )
                })}
                {userActivities.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لم تنضم لأي أنشطة بعد</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>إحصائياتي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">الأنشطة المشارك بها</span>
                  <span className="font-bold">{userActivities.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">الإنجازات المحققة</span>
                  <span className="font-bold">{userAchievements.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">النقاط المكتسبة</span>
                  <span className="font-bold">{userAchievements.reduce((sum, a) => sum + a.points, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">التقييم العام</span>
                  <Badge variant="default">
                    {userAchievements.length >= 3 ? "ممتاز" : userAchievements.length >= 1 ? "جيد" : "مبتدئ"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>الإنجازات الأخيرة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userAchievements.slice(0, 3).map((achievement) => (
                  <div key={achievement.id} className="flex items-center">
                    <span className="text-lg mr-2">{achievement.badge}</span>
                    <div>
                      <p className="text-sm font-medium">{achievement.title}</p>
                      <p className="text-xs text-muted-foreground">{achievement.earnedDate}</p>
                    </div>
                  </div>
                ))}
                {userAchievements.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">لا توجد إنجازات بعد</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  ) : null
}
