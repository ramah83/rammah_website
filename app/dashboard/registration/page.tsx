"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Calendar, CheckCircle, XCircle, Clock, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDataStore } from "@/hooks/use-data-store"

const ADMIN_EMAIL = "admin@youth-platform.com"

type RegStatus = "pending" | "approved" | "rejected"

interface Registration {
  id: string
  name: string
  email: string
  interests: string[]
  status: RegStatus
  date: string
  phone: string
}

export default function RegistrationPage() {
  const { user } = useDataStore()
  const [mounted, setMounted] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [registrations, setRegistrations] = useState<Registration[]>([
    {
      id: "reg-1",
      name: "أحمد محمود",
      email: "ahmed@example.com",
      interests: ["الرياضة", "الفنون"],
      status: "pending",
      date: "2024-03-15",
      phone: "01234567890",
    },
    {
      id: "reg-2",
      name: "فاطمة علي",
      email: "fatima@example.com",
      interests: ["الأدب", "الموسيقى"],
      status: "approved",
      date: "2024-03-14",
      phone: "01234567891",
    },
    {
      id: "reg-3",
      name: "محمد حسن",
      email: "mohamed@example.com",
      interests: ["الاقتصاد", "التكنولوجيا"],
      status: "rejected",
      date: "2024-03-13",
      phone: "01234567892",
    },
  ])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    try {
      let ok =
        (user?.role === "admin") ||
        (user?.email === ADMIN_EMAIL)

      if (!ok) {
        const raw = localStorage.getItem("session")
        if (raw) {
          const s = JSON.parse(raw) as { email?: string; role?: string }
          if (s?.role === "admin" || s?.email === ADMIN_EMAIL) ok = true
        }
      }
      setIsAdmin(ok)
    } catch {
      setIsAdmin(false)
    }
  }, [mounted, user])

  const filteredRegistrations = registrations.filter(
    (reg) =>
      reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusIcon = (status: RegStatus) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const getStatusText = (status: RegStatus) => {
    switch (status) {
      case "approved":
        return "مقبول"
      case "rejected":
        return "مرفوض"
      default:
        return "قيد المراجعة"
    }
  }

  const getStatusColor = (status: RegStatus) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700"
      case "rejected":
        return "bg-red-100 text-red-700"
      default:
        return "bg-yellow-100 text-yellow-700"
    }
  }

  const handleApprove = (id: string) => {
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)))
  }
  const handleReject = (id: string) => {
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r)))
  }

  if (!mounted || isAdmin === null) return null
  if (!isAdmin) return <div className="text-center py-12">غير مصرح لك بالوصول إلى هذه الصفحة</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <UserPlus className="h-8 w-8 text-blue-600" />
            طلبات التسجيل
          </h1>
          <p className="text-gray-600 mt-2">إدارة ومراجعة طلبات انضمام الأعضاء الجدد</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{registrations.length}</p>
                <p className="text-sm text-gray-600">إجمالي الطلبات</p>
              </div>
              <UserPlus className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {registrations.filter((r) => r.status === "approved").length}
                </p>
                <p className="text-sm text-gray-600">الطلبات المقبولة</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {registrations.filter((r) => r.status === "pending").length}
                </p>
                <p className="text-sm text-gray-600">قيد المراجعة</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ابحث في طلبات التسجيل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredRegistrations.map((registration) => (
          <Card key={registration.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-lg font-semibold">{registration.name}</h3>
                    <Badge className={getStatusColor(registration.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(registration.status)}
                        {getStatusText(registration.status)}
                      </div>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">البريد الإلكتروني:</span> {registration.email}
                    </div>
                    <div>
                      <span className="font-medium">الهاتف:</span> {registration.phone}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {registration.date}
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="font-medium text-sm">الاهتمامات:</span>
                    <div className="flex gap-2 mt-1">
                      {registration.interests.map((interest, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {registration.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(registration.id)}>
                      قبول
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-600 hover:bg-red-50 bg-transparent"
                      onClick={() => handleReject(registration.id)}
                    >
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRegistrations.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد طلبات تسجيل</h3>
            <p className="text-gray-600">لم يتم العثور على طلبات تسجيل متاحة حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
