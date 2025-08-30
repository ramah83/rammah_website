"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { LogOut, Bell } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { dataStore } from "@/lib/data-store"

interface User {
  name: string
  email: string
  userType: "youth" | "admin"
  interests: string[]
}

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: "info" | "success" | "warning"
}

const ADMIN_EMAIL = "admin@youth-platform.com"
// لو عايز لوحة التحكم للأدمن فقط خلّي القيمة true
const ADMIN_ONLY = false

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: "1", title: "نشاط جديد", message: "تم إضافة نشاط تدريب كرة القدم الجديد", time: "منذ 5 دقائق", read: false, type: "info" },
    { id: "2", title: "تسجيل جديد", message: "انضم عضو جديد إلى المنصة", time: "منذ 15 دقيقة", read: false, type: "success" },
    { id: "3", title: "تذكير", message: "اجتماع الفريق غداً الساعة 3 مساءً", time: "منذ ساعة", read: true, type: "warning" },
  ])
  const router = useRouter()

  useEffect(() => {
    // 1) جرّب تقرأ من localStorage أولًا
    const raw = typeof window !== "undefined" ? localStorage.getItem("session") : null
    if (raw) {
      try {
        const s = JSON.parse(raw) as { email: string; role: "youth" | "admin"; name?: string; interests?: string[] }

        // تأكيد أن إيميل الأدمن دائمًا admin
        const enforcedRole: "youth" | "admin" = s.email === ADMIN_EMAIL ? "admin" : s.role
        if (enforcedRole !== s.role) {
          localStorage.setItem("session", JSON.stringify({ ...s, role: enforcedRole }))
        }

        const u: User = {
          name: s.name ?? s.email,
          email: s.email,
          userType: enforcedRole,
          interests: s.interests ?? [],
        }

        if (ADMIN_ONLY && u.userType !== "admin") {
          router.replace("/")
          return
        }

        setUser(u)
        return
      } catch {
        // الجلسة تالفة
        localStorage.removeItem("session")
        router.replace("/")
        return
      }
    }

    // 2) لو مفيش localStorage استخدم dataStore كـ fallback
    const currentUser = dataStore.getCurrentUser?.()
    if (!currentUser) {
      router.replace("/")
      return
    }

    const roleFromStore: "youth" | "admin" =
      currentUser.email === ADMIN_EMAIL ? "admin" : (currentUser.role as "youth" | "admin")

    const u: User = {
      name: currentUser.name,
      email: currentUser.email,
      userType: roleFromStore,
      interests: currentUser.interests ?? [],
    }

    if (ADMIN_ONLY && u.userType !== "admin") {
      router.replace("/")
      return
    }

    setUser(u)
  }, [router])

  const handleLogout = () => {
    try { dataStore.logout?.() } catch {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("session")
    }
    router.push("/")
  }

  const markAsRead = (notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar userType={user.userType} />

      {/* Main Content */}
      <div className="md:pr-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <div className="md:hidden w-10"></div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">
                    {user.userType === "admin" ? "لوحة تحكم المدير" : "لوحة التحكم الشخصية"}
                  </h1>
                  <p className="text-sm text-gray-600">مرحباً، {user.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="relative bg-transparent">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold">الإشعارات</h3>
                      <p className="text-sm text-muted-foreground">لديك {unreadCount} إشعار غير مقروء</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${!notification.read ? "bg-blue-50" : ""}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{notification.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-2">{notification.time}</p>
                            </div>
                            {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1"></div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t">
                      <Button variant="ghost" size="sm" className="w-full">عرض جميع الإشعارات</Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  خروج
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
