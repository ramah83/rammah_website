"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Trophy,
  Palette,
  Calculator,
  Music,
  BookOpen,
  Plus,
  Search,
  Users,
  Clock,
  MapPin,
  Star,
  Edit,
  Trash2,
} from "lucide-react"
import {
  useCurrentUser,
  useActivities,
  useJoinActivity,
  useCreateActivity,
  // نضيف الهوكس الخاصة بالتعديل والحذف
  useUpdateActivity,
  useDeleteActivity,
} from "@/hooks/use-data-store"

type EditState = {
  title: string
  description: string
  category: string
  instructor: string
  maxParticipants: string
  schedule: string
  location: string
}

export default function ActivitiesPage() {
  const user = useCurrentUser()
  const activities = useActivities()
  const joinActivity = useJoinActivity()
  const createActivity = useCreateActivity()
  const updateActivity = useUpdateActivity?.() // قد تكون غير موجودة في مشروعك القديم
  const deleteActivity = useDeleteActivity?.()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  // تفاصيل + تعديل
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<EditState>({
    title: "",
    description: "",
    category: "",
    instructor: "",
    maxParticipants: "",
    schedule: "",
    location: "",
  })

  const [newActivity, setNewActivity] = useState({
    title: "",
    description: "",
    category: "",
    instructor: "",
    maxParticipants: "",
    schedule: "",
    location: "",
    level: "مبتدئ" as const,
  })

  const categories = [
    { id: "all", label: "جميع الأنشطة", icon: null },
    { id: "رياضة", label: "الرياضة", icon: Trophy },
    { id: "فنون", label: "الفنون", icon: Palette },
    { id: "اقتصاد", label: "الاقتصاد", icon: Calculator },
    { id: "موسيقى", label: "الموسيقى", icon: Music },
    { id: "أدب", label: "الأدب", icon: BookOpen },
  ]

  const filteredActivities = activities.filter((activity) => {
    const matchesSearch =
      activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || activity.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCreateActivity = () => {
    if (!user) return

    const activityData = {
      title: newActivity.title,
      description: newActivity.description,
      category: newActivity.category,
      instructor: newActivity.instructor,
      maxParticipants: Number.parseInt(newActivity.maxParticipants),
      schedule: newActivity.schedule,
      location: newActivity.location,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active" as const,
      image: `/placeholder.svg?height=200&width=300&query=${newActivity.category}+activity`,
      requirements: [],
      createdBy: user.id,
    }

    createActivity(activityData)
    setIsCreateDialogOpen(false)
    setNewActivity({
      title: "",
      description: "",
      category: "",
      instructor: "",
      maxParticipants: "",
      schedule: "",
      location: "",
      level: "مبتدئ",
    })
  }

  const handleJoinActivity = (activityId: string) => {
    if (!user) return
    const success = joinActivity(activityId, user.id)
    if (!success) {
      alert("لا يمكن الانضمام للنشاط. قد يكون مكتملاً أو أنك منضم بالفعل.")
    }
  }

  // فتح التفاصيل
  const openDetails = (a: any) => {
    setSelected(a)
    setDetailsOpen(true)
  }

  // فتح التعديل
  const openEdit = (a: any) => {
    setSelected(a)
    setEditForm({
      title: a.title ?? "",
      description: a.description ?? "",
      category: a.category ?? "",
      instructor: a.instructor ?? "",
      maxParticipants: String(a.maxParticipants ?? ""),
      schedule: a.schedule ?? "",
      location: a.location ?? "",
    })
    setEditOpen(true)
  }

  // حفظ التعديل
  const handleUpdate = () => {
    if (!selected) return
    const payload = {
      title: editForm.title,
      description: editForm.description,
      category: editForm.category,
      instructor: editForm.instructor,
      maxParticipants: Number.parseInt(editForm.maxParticipants || "0"),
      schedule: editForm.schedule,
      location: editForm.location,
    }
    if (typeof updateActivity === "function") {
      updateActivity(selected.id, payload)
    }
    setEditOpen(false)
  }

  // الحذف
  const handleDelete = (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا النشاط؟")) return
    if (typeof deleteActivity === "function") {
      deleteActivity(id)
    } else if (typeof updateActivity === "function") {
      // سقوط آمن: إلغاء النشاط بدل الحذف في حال عدم توفر delete
      updateActivity(id, { status: "cancelled" as const })
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {user.role === "admin" ? "إدارة الأنشطة" : "الأنشطة المتاحة"}
          </h2>
          <p className="text-gray-600">
            {user.role === "admin" ? "إدارة وتنظيم جميع الأنشطة الشبابية" : "اكتشف الأنشطة وانضم إليها"}
          </p>
        </div>
        {user.role === "admin" && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                إضافة نشاط جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إنشاء نشاط جديد</DialogTitle>
                <DialogDescription>أضف نشاطاً جديداً للمنصة</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان النشاط</Label>
                  <Input
                    id="title"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    placeholder="أدخل عنوان النشاط"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">الفئة</Label>
                  <Select
                    value={newActivity.category}
                    onValueChange={(value) => setNewActivity({ ...newActivity, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="رياضة">الرياضة</SelectItem>
                      <SelectItem value="فنون">الفنون</SelectItem>
                      <SelectItem value="اقتصاد">الاقتصاد</SelectItem>
                      <SelectItem value="موسيقى">الموسيقى</SelectItem>
                      <SelectItem value="أدب">الأدب</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    placeholder="وصف مفصل للنشاط"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructor">المدرب/المشرف</Label>
                  <Input
                    id="instructor"
                    value={newActivity.instructor}
                    onChange={(e) => setNewActivity({ ...newActivity, instructor: e.target.value })}
                    placeholder="اسم المدرب"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">الحد الأقصى للمشاركين</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    value={newActivity.maxParticipants}
                    onChange={(e) => setNewActivity({ ...newActivity, maxParticipants: e.target.value })}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule">الجدول الزمني</Label>
                  <Input
                    id="schedule"
                    value={newActivity.schedule}
                    onChange={(e) => setNewActivity({ ...newActivity, schedule: e.target.value })}
                    placeholder="الأحد 3:00 م"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">المكان</Label>
                  <Input
                    id="location"
                    value={newActivity.location}
                    onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                    placeholder="قاعة التدريب"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleCreateActivity}>إنشاء النشاط</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="البحث في الأنشطة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full">
            {categories.map((category) => {
              const Icon = category.icon as any
              return (
                <TabsTrigger key={category.id} value={category.id} className="text-xs">
                  {Icon && <Icon className="h-3 w-3 mr-1" />}
                  {category.label}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredActivities.map((activity) => {
          const categoryInfo = categories.find((c) => c.id === activity.category)
          const CategoryIcon = (categoryInfo?.icon as any) || Trophy
          const isUserJoined = activity.currentParticipants.includes(user?.id || "")

          return (
            <Card key={activity.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video relative">
                <img
                  src={activity.image || "/placeholder.svg"}
                  alt={activity.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <Badge
                    variant={
                      activity.status === "active"
                        ? "default"
                        : activity.status === "upcoming"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {activity.status === "active" ? "نشط" : activity.status === "upcoming" ? "قريباً" : "مكتمل"}
                  </Badge>
                </div>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">{activity.title}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openDetails(activity)}>
                      عرض التفاصيل
                    </Button>
                    {user.role === "admin" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(activity)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(activity.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{activity.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {activity.currentParticipants.length}/{activity.maxParticipants}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>4.5</span>
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
                    <span>المدرب: {activity.instructor}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Badge variant="outline">متوسط</Badge>
                  {user.role === "youth" && activity.status === "active" && (
                    <Button
                      size="sm"
                      onClick={() => handleJoinActivity(activity.id)}
                      disabled={activity.currentParticipants.length >= activity.maxParticipants || isUserJoined}
                      variant={isUserJoined ? "secondary" : "default"}
                    >
                      {isUserJoined
                        ? "منضم"
                        : activity.currentParticipants.length >= activity.maxParticipants
                        ? "مكتمل"
                        : "انضم"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أنشطة</h3>
          <p className="text-gray-600">لم يتم العثور على أنشطة تطابق البحث الحالي</p>
        </div>
      )}

      {/* Dialog: تفاصيل */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title || "تفاصيل النشاط"}</DialogTitle>
            <DialogDescription>{selected?.description}</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>
                  المشاركون: {selected.currentParticipants.length}/{selected.maxParticipants}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>الجدول: {selected.schedule}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>المكان: {selected.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span>المدرب: {selected.instructor}</span>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                {user.role === "youth" && selected.status === "active" && (
                  <Button
                    size="sm"
                    onClick={() => handleJoinActivity(selected.id)}
                    disabled={
                      selected.currentParticipants.length >= selected.maxParticipants ||
                      selected.currentParticipants.includes(user.id)
                    }
                  >
                    انضم للنشاط
                  </Button>
                )}
                {user.role === "admin" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setDetailsOpen(false); openEdit(selected) }}>
                      تعديل
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(selected.id)}>
                      حذف
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: تعديل */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تعديل النشاط</DialogTitle>
            <DialogDescription>قم بتحديث بيانات النشاط</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etitle">العنوان</Label>
              <Input
                id="etitle"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecat">الفئة</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm((p) => ({ ...p, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="رياضة">الرياضة</SelectItem>
                  <SelectItem value="فنون">الفنون</SelectItem>
                  <SelectItem value="اقتصاد">الاقتصاد</SelectItem>
                  <SelectItem value="موسيقى">الموسيقى</SelectItem>
                  <SelectItem value="أدب">الأدب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="edesc">الوصف</Label>
              <Textarea
                id="edesc"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="einstructor">المدرب</Label>
              <Input
                id="einstructor"
                value={editForm.instructor}
                onChange={(e) => setEditForm((p) => ({ ...p, instructor: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emax">الحد الأقصى</Label>
              <Input
                id="emax"
                type="number"
                value={editForm.maxParticipants}
                onChange={(e) => setEditForm((p) => ({ ...p, maxParticipants: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eschedule">الجدول</Label>
              <Input
                id="eschedule"
                value={editForm.schedule}
                onChange={(e) => setEditForm((p) => ({ ...p, schedule: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="elocation">المكان</Label>
              <Input
                id="elocation"
                value={editForm.location}
                onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleUpdate}>حفظ التعديلات</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
