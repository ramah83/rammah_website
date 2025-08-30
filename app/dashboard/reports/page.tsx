"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Award,
  Download,
  PieChart,
  LineChart,
} from "lucide-react"
import { dataStore } from "@/lib/data-store"

type Role = "youth" | "admin"
interface ViewUser {
  name: string
  email: string
  userType: Role
  interests: string[]
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<ViewUser | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  // mounted guard
  useEffect(() => setMounted(true), [])

  // تحميل المستخدم من الجلسة + متابعة تغييرات الـ dataStore
  useEffect(() => {
    if (!mounted) return

    const loadUser = () => {
      try {
        const sessionRaw = localStorage.getItem("session")
        let current =
          (sessionRaw &&
            (() => {
              const s = JSON.parse(sessionRaw) as { email?: string }
              if (!s?.email) return null
              const full = dataStore.getUsers().find((u) => u.email === s.email) || dataStore.getCurrentUser()
              return full
            })()) || dataStore.getCurrentUser()

        if (current) {
          setUser({
            name: current.name,
            email: current.email,
            userType: current.role as Role,
            interests: current.interests || [],
          })
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    }

    loadUser()
    const unsubscribe = dataStore.subscribe(loadUser)
    return () => {
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  // بيانات وهمية للتقرير
  const activityData = [
    { name: "الرياضة", participants: 342, growth: 12 },
    { name: "الفنون", participants: 289, growth: 8 },
    { name: "الموسيقى", participants: 267, growth: 15 },
    { name: "الاقتصاد", participants: 178, growth: 22 },
    { name: "الأدب", participants: 156, growth: 5 },
  ]

  const monthlyStats = [
    { month: "يناير", newUsers: 45, activities: 12, achievements: 89 },
    { month: "فبراير", newUsers: 52, activities: 15, achievements: 102 },
    { month: "مارس", newUsers: 38, activities: 18, achievements: 156 },
  ]

  const topPerformers = [
    { name: "محمد أحمد", activities: 8, achievements: 12, score: 95 },
    { name: "فاطمة محمود", activities: 6, achievements: 10, score: 88 },
    { name: "أحمد سالم", activities: 7, achievements: 9, score: 85 },
    { name: "سارة عبدالله", activities: 5, achievements: 8, score: 82 },
  ]

  // لسه بيعمل mount
  if (!mounted) return null

  // لو مفيش يوزر أو مش أدمن
  if (!user || user.userType !== "admin") {
    return <div className="text-center py-12">غير مصرح لك بالوصول إلى هذه الصفحة</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التقارير والإحصائيات</h2>
          <p className="text-gray-600">تحليل شامل لأداء المنصة والأنشطة</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">أسبوعي</SelectItem>
              <SelectItem value="month">شهري</SelectItem>
              <SelectItem value="quarter">ربع سنوي</SelectItem>
              <SelectItem value="year">سنوي</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشاركات</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,847</div>
            <p className="text-xs text-muted-foreground">+18% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الحضور</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">+5% من الأسبوع الماضي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإنجازات المحققة</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">347</div>
            <p className="text-xs text-muted-foreground">+28 إنجاز جديد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رضا المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground">من 5 نجوم</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="activities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="activities">تقرير الأنشطة</TabsTrigger>
          <TabsTrigger value="users">تقرير المستخدمين</TabsTrigger>
          <TabsTrigger value="performance">تقرير الأداء</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات</TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  توزيع المشاركين حسب النشاط
                </CardTitle>
                <CardDescription>عدد المشاركين في كل نشاط ومعدل النمو</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activityData.map((activity, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{activity.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={activity.growth > 10 ? "default" : "secondary"}>+{activity.growth}%</Badge>
                        <span className="text-sm text-muted-foreground">{activity.participants}</span>
                      </div>
                    </div>
                    <Progress value={(activity.participants / 400) * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  الإحصائيات الشهرية
                </CardTitle>
                <CardDescription>تطور المؤشرات الرئيسية خلال الأشهر الأخيرة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.map((stat, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="font-medium mb-2">{stat.month} 2024</div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{stat.newUsers}</div>
                          <div className="text-muted-foreground">مستخدم جديد</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{stat.activities}</div>
                          <div className="text-muted-foreground">نشاط جديد</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-600">{stat.achievements}</div>
                          <div className="text-muted-foreground">إنجاز</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>أفضل المشاركين</CardTitle>
                <CardDescription>المستخدمون الأكثر نشاطاً وإنجازاً</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{performer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {performer.activities} أنشطة • {performer.achievements} إنجاز
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{performer.score}</div>
                        <div className="text-xs text-muted-foreground">نقطة</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>توزيع الأعمار</CardTitle>
                <CardDescription>الفئات العمرية للمستخدمين</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>16-18 سنة</span>
                    <div className="flex items-center gap-2">
                      <Progress value={35} className="w-20" />
                      <span className="text-sm">35%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>19-21 سنة</span>
                    <div className="flex items-center gap-2">
                      <Progress value={45} className="w-20" />
                      <span className="text-sm">45%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>22-25 سنة</span>
                    <div className="flex items-center gap-2">
                      <Progress value={20} className="w-20" />
                      <span className="text-sm">20%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معدل الإكمال</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">92%</div>
                  <Progress value={92} className="mb-2" />
                  <p className="text-sm text-muted-foreground">من الأنشطة المسجلة</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">متوسط التقييم</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">4.7</div>
                  <div className="flex justify-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div key={star} className={`w-4 h-4 ${star <= 4 ? "text-yellow-400" : "text-gray-300"}`}>
                        ⭐
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">من 5 نجوم</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معدل الاحتفاظ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">85%</div>
                  <Progress value={85} className="mb-2" />
                  <p className="text-sm text-muted-foreground">بعد 3 أشهر</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                اتجاهات النمو
              </CardTitle>
              <CardDescription>تحليل اتجاهات النمو والتطور</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">الاتجاهات الإيجابية</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify_between p-2 bg-green-50 rounded">
                      <span className="text-sm">زيادة المشاركة في الأنشطة الرياضية</span>
                      <Badge className="bg-green-100 text-green-800">+22%</Badge>
                    </div>
                    <div className="flex items-center justify_between p-2 bg-green-50 rounded">
                      <span className="text-sm">تحسن معدل إكمال الأنشطة</span>
                      <Badge className="bg-green-100 text-green-800">+15%</Badge>
                    </div>
                    <div className="flex items-center justify_between p-2 bg-green-50 rounded">
                      <span className="text-sm">زيادة رضا المستخدمين</span>
                      <Badge className="bg-green-100 text-green-800">+8%</Badge>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium">نقاط التحسين</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify_between p-2 bg-yellow-50 rounded">
                      <span className="text-sm">مشاركة أقل في الأنشطة الأدبية</span>
                      <Badge variant="secondary">-5%</Badge>
                    </div>
                    <div className="flex items-center justify_between p-2 bg-yellow-50 rounded">
                      <span className="text-sm">حاجة لتنويع الأنشطة</span>
                      <Badge variant="secondary">تحسين</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
