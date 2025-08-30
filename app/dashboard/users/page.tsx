"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, UserPlus, Search, Edit, Trash2, Mail, Phone, Calendar, Award, Activity } from "lucide-react"
import { dataStore } from "@/lib/data-store"

type Role = "youth" | "admin"
interface ViewUser {
  name: string
  email: string
  userType: Role
  interests: string[]
}

interface YouthUser {
  id: string
  name: string
  email: string
  phone: string
  age: number
  joinDate: string
  interests: string[]
  activitiesCount: number
  achievementsCount: number
  status: "active" | "inactive" | "suspended"
  lastActivity: string
}

const mockUsers: YouthUser[] = [
  {
    id: "1",
    name: "محمد أحمد علي",
    email: "mohamed@example.com",
    phone: "+966501234567",
    age: 19,
    joinDate: "2024-01-15",
    interests: ["sports", "economics"],
    activitiesCount: 3,
    achievementsCount: 5,
    status: "active",
    lastActivity: "2024-03-10",
  },
  {
    id: "2",
    name: "فاطمة محمود",
    email: "fatima@example.com",
    phone: "+966507654321",
    age: 21,
    joinDate: "2024-02-01",
    interests: ["arts", "literature"],
    activitiesCount: 2,
    achievementsCount: 3,
    status: "active",
    lastActivity: "2024-03-09",
  },
  {
    id: "3",
    name: "أحمد سالم",
    email: "ahmed@example.com",
    phone: "+966509876543",
    age: 18,
    joinDate: "2024-01-20",
    interests: ["music", "arts"],
    activitiesCount: 4,
    achievementsCount: 7,
    status: "active",
    lastActivity: "2024-03-08",
  },
  {
    id: "4",
    name: "سارة عبدالله",
    email: "sara@example.com",
    phone: "+966502468135",
    age: 20,
    joinDate: "2023-12-10",
    interests: ["sports", "music"],
    activitiesCount: 1,
    achievementsCount: 2,
    status: "inactive",
    lastActivity: "2024-02-15",
  },
]

export default function UsersManagementPage() {
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<ViewUser | null>(null)

  const [users, setUsers] = useState<YouthUser[]>(mockUsers)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Add dialog
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    interests: [] as string[],
  })

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    age: "",
    interests: [] as string[],
    status: "active" as YouthUser["status"],
  })

  useEffect(() => setMounted(true), [])

  // تحميل جلسة المستخدم + متابعة تغييرات dataStore
  useEffect(() => {
    if (!mounted) return

    const loadUser = () => {
      try {
        const sessionRaw = localStorage.getItem("session")
        const current =
          (sessionRaw &&
            (() => {
              const s = JSON.parse(sessionRaw) as { email?: string }
              if (!s?.email) return null
              return (
                dataStore.getUsers().find((u) => u.email === s.email) ||
                dataStore.getCurrentUser()
              )
            })()) ||
          dataStore.getCurrentUser()

        if (current) {
          setUser({
            name: current.name,
            email: current.email,
            userType: current.role as Role,
            interests: current.interests ?? [],
          })
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    }

    loadUser()
    const unsub = dataStore.subscribe(loadUser)
    return () => {
      // ignore boolean return
      unsub()
    }
  }, [mounted])

  const interests = [
    { id: "sports", label: "الرياضة" },
    { id: "arts", label: "الفنون" },
    { id: "economics", label: "الاقتصاد" },
    { id: "music", label: "الموسيقى" },
    { id: "literature", label: "الأدب" },
  ]

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || u.status === (statusFilter as any)
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">نشط</Badge>
      case "inactive":
        return <Badge variant="secondary">غير نشط</Badge>
      case "suspended":
        return <Badge variant="destructive">موقوف</Badge>
      default:
        return <Badge variant="outline">غير محدد</Badge>
    }
  }

  // --- Add user ---
  const toggleUserInterest = (interestId: string) => {
    setNewUser((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }))
  }

  const handleAddUser = () => {
    const u: YouthUser = {
      id: Date.now().toString(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      phone: newUser.phone.trim(),
      age: Number(newUser.age) || 0,
      joinDate: new Date().toISOString().split("T")[0],
      interests: newUser.interests,
      activitiesCount: 0,
      achievementsCount: 0,
      status: "active",
      lastActivity: new Date().toISOString().split("T")[0],
    }
    if (!u.name || !u.email) return

    setUsers((prev) => [...prev, u])
    setIsAddUserDialogOpen(false)
    setNewUser({ name: "", email: "", phone: "", age: "", interests: [] })
  }

  // --- Edit user ---
  const openEdit = (row: YouthUser) => {
    setEditUserId(row.id)
    setEditForm({
      name: row.name,
      email: row.email,
      phone: row.phone,
      age: String(row.age),
      interests: [...row.interests],
      status: row.status,
    })
    setIsEditDialogOpen(true)
  }

  const toggleEditInterest = (interestId: string) => {
    setEditForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interestId)
        ? prev.interests.filter((id) => id !== interestId)
        : [...prev.interests, interestId],
    }))
  }

  const handleSaveEdit = () => {
    if (!editUserId) return
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editUserId
          ? {
              ...u,
              name: editForm.name.trim(),
              email: editForm.email.trim(),
              phone: editForm.phone.trim(),
              age: Number(editForm.age) || 0,
              interests: [...editForm.interests],
              status: editForm.status,
            }
          : u
      )
    )
    setIsEditDialogOpen(false)
    setEditUserId(null)
  }

  // --- Delete user ---
  const handleDeleteUser = (id: string) => {
    if (!confirm("هل تريد حذف هذا المستخدم؟")) return
    setUsers((prev) => prev.filter((u) => u.id !== id))
  }

  if (!mounted) return null
  if (!user || user.userType !== "admin") {
    return <div className="text-center py-12">غير مصرح لك بالوصول إلى هذه الصفحة</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h2>
          <p className="text-gray-600">إدارة حسابات الشباب والمشرفين</p>
        </div>

        {/* Add User Dialog */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              إضافة مستخدم جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة مستخدم جديد</DialogTitle>
              <DialogDescription>أضف عضواً جديداً إلى المنصة</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="أدخل البريد الإلكتروني"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+966501234567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">العمر</Label>
                <Input
                  id="age"
                  type="number"
                  value={newUser.age}
                  onChange={(e) => setNewUser({ ...newUser, age: e.target.value })}
                  placeholder="18"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>الاهتمامات</Label>
                <div className="grid grid-cols-3 gap-2">
                  {interests.map((interest) => {
                    const isSelected = newUser.interests.includes(interest.id)
                    return (
                      <Button
                        key={interest.id}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleUserInterest(interest.id)}
                        className="justify-start"
                      >
                        {interest.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleAddUser}>إضافة المستخدم</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">
              +{users.filter((u) => u.status === "active").length} نشط
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المستخدمون النشطون</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((users.filter((u) => u.status === "active").length / users.length) * 100)}% من الإجمالي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المنضمون هذا الشهر</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+20% من الشهر الماضي</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط الأنشطة</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(users.reduce((sum, u) => sum + u.activitiesCount, 0) / users.length)}
            </div>
            <p className="text-xs text-muted-foreground">نشاط لكل مستخدم</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في المستخدمين..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="تصفية حسب الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المستخدمين</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
            <SelectItem value="suspended">موقوف</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة المستخدمين</CardTitle>
          <CardDescription>إدارة وعرض جميع المستخدمين المسجلين</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>معلومات الاتصال</TableHead>
                <TableHead>الاهتمامات</TableHead>
                <TableHead>الأنشطة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر نشاط</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-sm text-gray-500">العمر: {row.age} سنة</div>
                      <div className="text-sm text-gray-500">انضم: {row.joinDate}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        {row.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {row.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {row.interests.map((interest) => {
                        const interestLabel = interests.find((i) => i.id === interest)?.label || interest
                        return (
                          <Badge key={interest} variant="outline" className="text-xs">
                            {interestLabel}
                          </Badge>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-center">
                      <div className="font-medium">{row.activitiesCount}</div>
                      <div className="text-xs text-gray-500">{row.achievementsCount} إنجاز</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(row.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {row.lastActivity}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(row.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
            <DialogDescription>تعديل بيانات العضو المختار</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الاسم الكامل</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>العمر</Label>
              <Input
                type="number"
                value={editForm.age}
                onChange={(e) => setEditForm((p) => ({ ...p, age: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select
                value={editForm.status}
                onValueChange={(v: YouthUser["status"]) => setEditForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="suspended">موقوف</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label>الاهتمامات</Label>
              <div className="grid grid-cols-3 gap-2">
                {interests.map((interest) => {
                  const isSelected = editForm.interests.includes(interest.id)
                  return (
                    <Button
                      key={interest.id}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleEditInterest(interest.id)}
                      className="justify-start"
                    >
                      {interest.label}
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit}>حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
