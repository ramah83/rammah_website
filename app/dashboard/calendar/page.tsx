"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, Users, Plus, ChevronLeft, ChevronRight } from "lucide-react"

interface User {
  name: string
  email: string
  userType: "youth" | "admin"
  interests: string[]
}

interface Event {
  id: string
  title: string
  description: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  location: string
  category: string
  participants: number
  maxParticipants: number
  status: "upcoming" | "ongoing" | "completed"
}

const mockEvents: Event[] = [
  { id: "1", title: "تدريب كرة القدم", description: "تدريب أسبوعي لفريق كرة القدم الأول", date: "2024-03-15", time: "17:00", location: "الملعب الرئيسي", category: "sports", participants: 18, maxParticipants: 22, status: "upcoming" },
  { id: "2", title: "ورشة الرسم", description: "ورشة تعليم تقنيات الرسم بالألوان المائية", date: "2024-03-17", time: "15:00", location: "استوديو الفنون", category: "arts", participants: 12, maxParticipants: 15, status: "upcoming" },
  { id: "3", title: "اجتماع نادي ريادة الأعمال", description: "مناقشة المشاريع الجديدة وتطوير الأفكار", date: "2024-03-20", time: "10:00", location: "قاعة الاجتماعات", category: "economics", participants: 25, maxParticipants: 30, status: "upcoming" },
  { id: "4", title: "بروفة الفرقة الموسيقية", description: "بروفة للحفل الموسيقي القادم", date: "2024-03-22", time: "16:00", location: "استوديو الموسيقى", category: "music", participants: 8, maxParticipants: 12, status: "upcoming" },
  { id: "5", title: "جلسة نادي الكتابة", description: "مناقشة الأعمال الأدبية الجديدة", date: "2024-03-25", time: "18:00", location: "مكتبة المركز", category: "literature", participants: 15, maxParticipants: 20, status: "upcoming" },
]

export default function CalendarPage() {
  const router = useRouter()

  // ✅ mounted guard لتفادي أي اختلافات Hydration بسبب Date و locale
  const [mounted, setMounted] = useState(false)
  const [today, setToday] = useState<Date | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [events] = useState<Event[]>(mockEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setToday(new Date())

    // ✅ اقرأ من "session" (مش "user")
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "sports": return "bg-blue-100 text-blue-800"
      case "arts": return "bg-purple-100 text-purple-800"
      case "economics": return "bg-green-100 text-green-800"
      case "music": return "bg-yellow-100 text-yellow-800"
      case "literature": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "sports": return "رياضة"
      case "arts": return "فنون"
      case "economics": return "اقتصاد"
      case "music": return "موسيقى"
      case "literature": return "أدب"
      default: return "عام"
    }
  }

  const getEventsForDate = (date: string) => events.filter((e) => e.date === date)

  const formatDate = (dateString: string) => {
    const d = new Date(dateString + "T00:00:00") // تثبيت التوقيت لتفادي الاختلافات
    return d.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
  }

  const upcomingEvents = events
    .filter((e) => {
      if (!today) return false
      return new Date(e.date) >= new Date(today.toDateString())
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  // 💡 حالة تحميل بدلاً من return null (كانت سبب الشاشة البيضا)
  if (!mounted || !user || !today) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-600">
        جاري التحميل…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التقويم والفعاليات</h2>
          <p className="text-gray-600">تتبع الأنشطة والفعاليات القادمة</p>
        </div>
        {user.userType === "admin" && (
          <Button onClick={() => router.push("/dashboard/calendar/new")}>
            <Plus className="h-4 w-4 mr-2" />
            إضافة فعالية
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {currentDate.toLocaleDateString("ar-SA", { month: "long", year: "numeric" })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
                    }
                    title="الشهر السابق"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
                    }
                    title="الشهر التالي"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 42 }, (_, i) => {
                  // نجيب اليوم الأول في الشبكة (نبدأ من الأحد في نفس الأسبوع اللي يحتوي اليوم 1 من الشهر)
                  const firstOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                  const startOffset = (firstOfMonth.getDay() + 6) % 7 // تحويل Monday=0/Sunday=6 إلى Sunday=0..Saturday=6 حسب احتياجك
                  const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1 - startOffset)
                  const dateString = cellDate.toISOString().split("T")[0]
                  const dayEvents = getEventsForDate(dateString)
                  const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth()
                  const isToday = dateString === new Date(today.toDateString()).toISOString().split("T")[0]

                  return (
                    <div
                      key={i}
                      className={[
                        "min-h-[60px] p-1 border rounded cursor-pointer transition-colors",
                        isCurrentMonth ? "bg-white" : "bg-gray-50 text-gray-400",
                        isToday ? "border-blue-500 bg-blue-50" : "border-gray-200",
                        selectedDate === dateString ? "bg-blue-100" : "",
                        "hover:bg-gray-50",
                      ].join(" ")}
                      onClick={() => setSelectedDate(dateString)}
                    >
                      <div className="text-sm font-medium">{cellDate.getDate()}</div>
                      {dayEvents.length > 0 && (
                        <div className="space-y-1">
                          {dayEvents.slice(0, 2).map((ev) => (
                            <div key={ev.id} className={`text-xs p-1 rounded truncate ${getCategoryColor(ev.category)}`}>
                              {ev.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-xs text-gray-500">+{dayEvents.length - 2} أخرى</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الفعاليات القادمة</CardTitle>
              <CardDescription>أقرب الأنشطة والفعاليات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{event.title}</h4>
                      <Badge className={getCategoryColor(event.category)} variant="secondary">
                        {getCategoryLabel(event.category)}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-3">{event.description}</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 و-3" />
                        <span>{event.participants}/{event.maxParticipants} مشارك</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>فعاليات {formatDate(selectedDate)}</CardTitle>
              </CardHeader>
              <CardContent>
                {getEventsForDate(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    {getEventsForDate(selectedDate).map((event) => (
                      <div key={event.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify_between mb-2">
                          <h4 className="font-medium">{event.title}</h4>
                          <Badge className={getCategoryColor(event.category)}>{getCategoryLabel(event.category)}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{event.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">لا توجد فعاليات في هذا التاريخ</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
