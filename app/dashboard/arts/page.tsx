"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Palette, Users, Calendar, Clock, MapPin, ImageIcon, Brush } from "lucide-react"

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
  instructor: string
  category: string
  image: string
}

interface Exhibition {
  title: string
  date: string
  time: string
  location: string
  artworks: number
  artists: number
}

export default function ArtsPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<"workshops" | "exhibitions" | "gallery">("workshops")
  const router = useRouter()

  // ---------- إدارة الورشة (Dialog) ----------
  const [manageOpen, setManageOpen] = useState(false)
  const [edit, setEdit] = useState({
    id: "",
    level: "",
    instructor: "",
    location: "",
    schedule: "",
    maxParticipants: "",
  })

  // ---------- تفاصيل المعارض (Dialog) ----------
  const [exhibitOpen, setExhibitOpen] = useState(false)
  const [selectedExhibit, setSelectedExhibit] = useState<Exhibition | null>(null)

  // بيانات أولية -> state علشان نقدر نعدلها
  const initialActivities: Activity[] = [
    {
      id: "1",
      title: "ورشة الرسم المتقدم",
      description: "تعلم تقنيات الرسم المتقدمة والألوان المائية",
      participants: 12,
      maxParticipants: 15,
      schedule: "الأحد 3:00 م",
      location: "استوديو الفنون",
      level: "متوسط",
      instructor: "فاطمة أحمد",
      category: "رسم",
      image: "/painting-workshop.png",
    },
    {
      id: "2",
      title: "نادي التصوير الفوتوغرافي",
      description: "تطوير مهارات التصوير والتحرير الرقمي",
      participants: 18,
      maxParticipants: 20,
      schedule: "السبت 10:00 ص",
      location: "استوديو التصوير",
      level: "مبتدئ",
      instructor: "أحمد محمود",
      category: "تصوير",
      image: "/photography-studio.png",
    },
    {
      id: "3",
      title: "ورشة الأعمال اليدوية",
      description: "صنع الحرف اليدوية والأعمال الفنية المبتكرة",
      participants: 10,
      maxParticipants: 12,
      schedule: "الخميس 4:00 م",
      location: "ورشة الحرف",
      level: "جميع المستويات",
      instructor: "مريم علي",
      category: "حرف",
      image: "/handicrafts-workshop.png",
    },
  ]
  const [activities, setActivities] = useState<Activity[]>(initialActivities)

  const upcomingExhibitions: Exhibition[] = [
    { title: "معرض الفنون الشبابية السنوي", date: "22 مارس 2024", time: "6:00 م", location: "قاعة المعارض الرئيسية", artworks: 45, artists: 15 },
    { title: "معرض التصوير الفوتوغرافي", date: "28 مارس 2024", time: "5:00 م", location: "جاليري الفنون", artworks: 30, artists: 10 },
  ]

  useEffect(() => {
    setMounted(true)

    // ✅ اقرأ من "session" وليس "user"
    const raw = typeof window !== "undefined" ? localStorage.getItem("session") : null
    if (!raw) {
      router.replace("/")
      return
    }
    try {
      const s = JSON.parse(raw) as { email: string; name?: string; role: "youth" | "admin" }
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

  // ====== أفعال الإدارة / الانضمام ======

  // انضمام الشباب للورشة
  const joinWorkshop = (id: string) => {
    if (user.userType !== "youth") return
    setActivities(prev =>
      prev.map(a => {
        if (a.id !== id) return a
        if (a.participants >= a.maxParticipants) return a
        return { ...a, participants: a.participants + 1 }
      }),
    )
  }

  // فتح إدارة الورشة
  const openManage = (id: string) => {
    const w = activities.find(a => a.id === id)
    if (!w) return
    setEdit({
      id: w.id,
      level: w.level,
      instructor: w.instructor,
      location: w.location,
      schedule: w.schedule,
      maxParticipants: String(w.maxParticipants),
    })
    setManageOpen(true)
  }

  // حفظ تعديلات الورشة
  const saveManage = () => {
    setActivities(prev =>
      prev.map(a =>
        a.id === edit.id
          ? {
              ...a,
              level: edit.level,
              instructor: edit.instructor,
              location: edit.location,
              schedule: edit.schedule,
              maxParticipants: Math.max(1, parseInt(edit.maxParticipants || "1", 10)),
              // تأكد إن المشاركين مايزيدوش عن الحد بعد التعديل
              participants: Math.min(a.participants, Math.max(1, parseInt(edit.maxParticipants || "1", 10))),
            }
          : a,
      ),
    )
    setManageOpen(false)
  }

  // تفاصيل معرض
  const openExhibitDetails = (exhibition: Exhibition) => {
    setSelectedExhibit(exhibition)
    setExhibitOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الأنشطة الفنية</h2>
          <p className="text-gray-600">تطوير المواهب الفنية والإبداعية</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => setTab("gallery")}>
            <ImageIcon className="h-4 w-4 mr-2" />
            المعرض
          </Button>
          <Button type="button" onClick={() => setTab("workshops")}>
            <Palette className="h-4 w-4 mr-2" />
            ورش جديدة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الورش النشطة</CardTitle>
            <Brush className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">+2 ورشة جديدة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفنانون</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-muted-foreground">+12 فنان جديد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأعمال الفنية</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">234</div>
            <p className="text-xs text-muted-foreground">+45 عمل جديد</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المعارض</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">2 معرض قادم</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="workshops">الورش الفنية</TabsTrigger>
          <TabsTrigger value="exhibitions">المعارض</TabsTrigger>
          <TabsTrigger value="gallery">معرض الأعمال</TabsTrigger>
        </TabsList>

        <TabsContent value="workshops" className="space-y-4">
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
                    <Palette className="h-5 w-5 text-purple-600" />
                    {activity.title}
                  </CardTitle>
                  <CardDescription>{activity.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">المشاركون</span>
                    <span>
                      {activity.participants}/{activity.maxParticipants}
                    </span>
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
                      <span>المدرب: {activity.instructor}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="secondary">{activity.category}</Badge>
                    {user.userType === "admin" ? (
                      <Button size="sm" type="button" onClick={() => openManage(activity.id)}>
                        إدارة
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => joinWorkshop(activity.id)}
                        disabled={activity.participants >= activity.maxParticipants}
                      >
                        {activity.participants >= activity.maxParticipants ? "مكتمل" : "انضم"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exhibitions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingExhibitions.map((exhibition, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-purple-600" />
                    {exhibition.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{exhibition.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{exhibition.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span>{exhibition.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span>{exhibition.artists} فنان</span>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{exhibition.artworks}</div>
                    <p className="text-sm text-purple-700">عمل فني معروض</p>
                  </div>
                  <Button className="w-full" size="sm" type="button" onClick={() => openExhibitDetails(exhibition)}>
                    عرض التفاصيل
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: "غروب الشمس", artist: "سارة محمد", category: "رسم زيتي", image: "/sunset-painting.png" },
              { title: "المدينة القديمة", artist: "محمد أحمد", category: "تصوير فوتوغرافي", image: "/old-city-photography.png" },
              { title: "الطبيعة الصامتة", artist: "فاطمة علي", category: "رسم بالألوان المائية", image: "/still-life-watercolor.png" },
            ].map((artwork, index) => (
              <Card key={index} className="overflow-hidden">
                <div className="aspect-square relative">
                  <img src={artwork.image || "/placeholder.svg"} alt={artwork.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Button variant="secondary" className="opacity-0 hover:opacity-100 transition-opacity">
                      عرض التفاصيل
                    </Button>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{artwork.title}</CardTitle>
                  <CardDescription>بواسطة {artwork.artist}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{artwork.category}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog إدارة الورشة */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إدارة الورشة</DialogTitle>
            <DialogDescription>حدّث بيانات الورشة</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>المستوى</Label>
              <Select value={edit.level} onValueChange={(v) => setEdit((p) => ({ ...p, level: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
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
              <Input value={edit.instructor} onChange={(e) => setEdit((p) => ({ ...p, instructor: e.target.value }))} />
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
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={saveManage}>حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog تفاصيل المعرض */}
      <Dialog open={exhibitOpen} onOpenChange={setExhibitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تفاصيل المعرض</DialogTitle>
            <DialogDescription>معلومات أكثر حول المعرض</DialogDescription>
          </DialogHeader>

          {selectedExhibit && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{selectedExhibit.date} — {selectedExhibit.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{selectedExhibit.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-400" />
                <span>{selectedExhibit.artworks} عمل فني</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{selectedExhibit.artists} فنان مشارك</span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setExhibitOpen(false)}>إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
