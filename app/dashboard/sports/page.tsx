"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Users, Calendar, Clock, MapPin, Award, TrendingUp } from "lucide-react"

interface User {
  name: string
  email: string
  userType: "youth" | "admin"
  interests: string[]
}

interface Activity {
  id: string
  title: string
  description: string
  participants: number
  maxParticipants: number
  schedule: string
  location: string
  level: string
  coach: string
  achievements: string[]
  nextMatch: string
  image: string
}

export default function SportsPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<"teams" | "events" | "achievements">("teams")
  const router = useRouter()

  // إدارة النشاط (Dialog)
  const [manageOpen, setManageOpen] = useState(false)
  const [edit, setEdit] = useState({
    id: "",
    level: "",
    coach: "",
    location: "",
    schedule: "",
    maxParticipants: "",
    nextMatch: "",
    achievementsText: "",
  })

  // بيانات أولية -> state علشان نقدر نعدلها
  const initialActivities: Activity[] = [
    {
      id: "1",
      title: "فريق كرة القدم الأول",
      description: "تدريب كرة القدم للمستوى المتقدم",
      participants: 18,
      maxParticipants: 22,
      schedule: "الثلاثاء والخميس 5:00 م",
      location: "الملعب الرئيسي",
      level: "متقدم",
      coach: "أحمد محمد",
      achievements: ["بطولة الشباب 2023", "كأس المنطقة"],
      nextMatch: "15 مارس 2024",
      image: "/diverse-football-team.png",
    },
    {
      id: "2",
      title: "فريق كرة السلة",
      description: "تطوير مهارات كرة السلة والعمل الجماعي",
      participants: 12,
      maxParticipants: 15,
      schedule: "الأحد والأربعاء 4:00 م",
      location: "صالة الألعاب",
      level: "متوسط",
      coach: "محمد علي",
      achievements: ["المركز الثاني محلياً"],
      nextMatch: "20 مارس 2024",
      image: "/diverse-basketball-team.png",
    },
    {
      id: "3",
      title: "نادي السباحة",
      description: "تعلم السباحة وتحسين اللياقة البدنية",
      participants: 25,
      maxParticipants: 30,
      schedule: "يومياً 6:00 ص",
      location: "المسبح الأولمبي",
      level: "جميع المستويات",
      coach: "سارة أحمد",
      achievements: ["3 ميداليات ذهبية"],
      nextMatch: "بطولة السباحة - 25 مارس",
      image: "/outdoor-swimming-pool.png",
    },
  ]
  const [activities, setActivities] = useState<Activity[]>(initialActivities)

  const upcomingEvents = [
    { title: "بطولة كرة القدم الشبابية", date: "15 مارس 2024", time: "3:00 م", location: "الملعب الرئيسي", teams: 8 },
    { title: "مباراة كرة السلة النهائية", date: "20 مارس 2024", time: "5:00 م", location: "صالة الألعاب", teams: 2 },
    { title: "بطولة السباحة الإقليمية", date: "25 مارس 2024", time: "9:00 ص", location: "المسبح الأولمبي", teams: 12 },
  ]

  useEffect(() => {
    setMounted(true)
    const sessionRaw = typeof window !== "undefined" ? localStorage.getItem("session") : null
    if (!sessionRaw) {
      router.replace("/")
      return
    }
    try {
      const s = JSON.parse(sessionRaw) as { email: string; name?: string; role: "youth" | "admin" }
      setUser({
        name: s.name ?? s.email,
        email: s.email,
        userType: s.role,
        interests: [],
      })
    } catch {
      router.replace("/")
    }
  }, [router])

  if (!mounted || !user) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-600">
        جاري التحميل…
      </div>
    )
  }

  // انضمام الشباب للفريق (زيادة العدد لو فيه أماكن)
  const joinTeam = (teamId: string) => {
    setActivities((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t
        if (t.participants >= t.maxParticipants) return t
        return { ...t, participants: t.participants + 1 }
      }),
    )
  }

  // فتح لوحة الإدارة
  const openManage = (teamId: string) => {
    const t = activities.find((a) => a.id === teamId)
    if (!t) return
    setEdit({
      id: t.id,
      level: t.level,
      coach: t.coach,
      location: t.location,
      schedule: t.schedule,
      maxParticipants: String(t.maxParticipants),
      nextMatch: t.nextMatch,
      achievementsText: t.achievements.join(", "),
    })
    setManageOpen(true)
  }

  // حفظ التعديلات
  const saveManage = () => {
    setActivities((prev) =>
      prev.map((t) =>
        t.id === edit.id
          ? {
              ...t,
              level: edit.level,
              coach: edit.coach,
              location: edit.location,
              schedule: edit.schedule,
              maxParticipants: Math.max(1, parseInt(edit.maxParticipants || "1", 10)),
              nextMatch: edit.nextMatch,
              achievements: edit.achievementsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : t,
      ),
    )
    setManageOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الأنشطة الرياضية</h2>
          <p className="text-gray-600">تطوير المهارات الرياضية واللياقة البدنية</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => setTab("events")}>
            <Calendar className="h-4 w-4 mr-2" />
            الجدول الزمني
          </Button>
          <Button type="button" onClick={() => setTab("achievements")}>
            <Trophy className="h-4 w-4 mr-2" />
            البطولات
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">الفرق الرياضية</TabsTrigger>
          <TabsTrigger value="events">الفعاليات القادمة</TabsTrigger>
          <TabsTrigger value="achievements">الإنجازات</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((activity) => (
              <Card key={activity.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img src={activity.image || "/placeholder.svg"} alt={activity.title} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    <Badge>{activity.level}</Badge>
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-blue-600" />
                    {activity.title}
                  </CardTitle>
                  <CardDescription>{activity.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">المشاركون</span>
                    <div className="flex items-center gap-2">
                      <Progress value={(activity.participants / activity.maxParticipants) * 100} className="w-16" />
                      <span className="text-sm">
                        {activity.participants}/{activity.maxParticipants}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{activity.schedule}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{activity.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>المدرب: {activity.coach}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">الإنجازات:</p>
                    <div className="flex flex-wrap gap-1">
                      {activity.achievements.map((achievement, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {achievement}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">المباراة القادمة</p>
                        <p className="text-sm font-medium">{activity.nextMatch}</p>
                      </div>

                      {user.userType === "admin" ? (
                        <Button size="sm" type="button" onClick={() => openManage(activity.id)}>
                          إدارة
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => joinTeam(activity.id)}
                          disabled={activity.participants >= activity.maxParticipants}
                        >
                          {activity.participants >= activity.maxParticipants ? "مكتمل" : "انضم"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingEvents.map((event, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    {event.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-gray-400" />
                      <span>{event.teams} فريق</span>
                    </div>
                  </div>
                  <Button className="w-full" size="sm" type="button">
                    عرض التفاصيل
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-yellow-600" />
                </div>
                <CardTitle>الميداليات الذهبية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">15</div>
                <p className="text-sm text-gray-600">في البطولات المحلية</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-gray-600" />
                </div>
                <CardTitle>الميداليات الفضية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">23</div>
                <p className="text-sm text-gray-600">في البطولات الإقليمية</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <CardTitle>الميداليات البرونزية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">31</div>
                <p className="text-sm text-gray-600">في البطولات الوطنية</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog إدارة الفريق */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إدارة الفريق</DialogTitle>
            <DialogDescription>تحديث بيانات الفريق والجدول</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المستوى</Label>
              <Select value={edit.level} onValueChange={(v) => setEdit((p) => ({ ...p, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="مبتدئ">مبتدئ</SelectItem>
                  <SelectItem value="متوسط">متوسط</SelectItem>
                  <SelectItem value="متقدم">متقدم</SelectItem>
                  <SelectItem value="جميع المستويات">جميع المستويات</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المدرب</Label>
              <Input value={edit.coach} onChange={(e) => setEdit((p) => ({ ...p, coach: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>المكان</Label>
              <Input value={edit.location} onChange={(e) => setEdit((p) => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الجدول الزمني</Label>
              <Input value={edit.schedule} onChange={(e) => setEdit((p) => ({ ...p, schedule: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>الحد الأقصى للمشاركين</Label>
              <Input
                type="number"
                value={edit.maxParticipants}
                onChange={(e) => setEdit((p) => ({ ...p, maxParticipants: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>المباراة القادمة</Label>
              <Input value={edit.nextMatch} onChange={(e) => setEdit((p) => ({ ...p, nextMatch: e.target.value }))} />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>الإنجازات (افصل بينها بفاصلة ,)</Label>
              <Input
                value={edit.achievementsText}
                onChange={(e) => setEdit((p) => ({ ...p, achievementsText: e.target.value }))}
                placeholder="بطولة الشباب 2023, كأس المنطقة"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={saveManage}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
