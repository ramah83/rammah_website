"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Edit, Save, Trophy, Calendar, MapPin, Phone, Mail, Award, Activity, Target, Star, Clock } from "lucide-react"
import { useCurrentUser, useUserActivities, useAchievements, useDataStore } from "@/hooks/use-data-store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ProfilePage() {
  const user = useCurrentUser()
  const dataStore = useDataStore()
  const userActivities = useUserActivities(user?.id || "")
  const userAchievements = useAchievements(user?.id)
  const router = useRouter()

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    address: user?.address || "",
    emergencyContact: user?.emergencyContact || "",
  })

  useEffect(() => {
    if (!user) {
      router.push("/")
    } else {
      setEditForm({
        name: user.name,
        phone: user.phone || "",
        address: user.address || "",
        emergencyContact: user.emergencyContact || "",
      })
    }
  }, [user, router])

  const handleSaveProfile = () => {
    if (user) {
      dataStore.updateUser(user.id, {
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        emergencyContact: editForm.emergencyContact,
      })
      setIsEditing(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "رياضة":
        return <Trophy className="h-4 w-4" />
      case "فنون":
        return <Award className="h-4 w-4" />
      case "اقتصاد":
        return <Target className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">نشط</Badge>
      case "cancelled":
        return <Badge variant="secondary">ملغي</Badge>
      default:
        return <Badge variant="outline">غير محدد</Badge>
    }
  }

  if (!user) return null

  const totalPoints = userAchievements.reduce((sum, achievement) => sum + achievement.points, 0)
  const completedActivities = userActivities.filter((activity) => activity.status === "completed").length
  const averageRating = userAchievements.length > 0 ? totalPoints / userAchievements.length / 10 : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الملف الشخصي</h2>
          <p className="text-gray-600">عرض وتحرير معلوماتك الشخصية</p>
        </div>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              تحرير الملف
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>تحرير الملف الشخصي</DialogTitle>
              <DialogDescription>قم بتحديث معلوماتك الشخصية</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">العنوان</Label>
                <Input
                  id="address"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency">جهة الاتصال في الطوارئ</Label>
                <Input
                  id="emergency"
                  value={editForm.emergencyContact}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSaveProfile}>
                <Save className="h-4 w-4 mr-2" />
                حفظ التغييرات
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                <AvatarFallback className="text-2xl">
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{user.name}</CardTitle>
              <CardDescription>عضو منذ {user.joinDate}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{user.phone}</span>
                  </div>
                )}
                {user.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{user.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>انضم في {user.joinDate}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">الاهتمامات</h4>
                <div className="flex flex-wrap gap-1">
                  {user.interests.map((interest) => (
                    <Badge key={interest} variant="outline" className="text-xs">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إحصائيات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">النقاط المكتسبة</span>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{totalPoints}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">متوسط التقييم</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-bold">{averageRating.toFixed(1)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">الحالة</span>
                <Badge variant={user.status === "active" ? "default" : "secondary"}>
                  {user.status === "active" ? "نشط" : "غير نشط"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الأنشطة المشارك بها</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userActivities.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الأنشطة المكتملة</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedActivities}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الإنجازات</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userAchievements.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">النقاط</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalPoints}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="activities" className="space-y-4">
            <TabsList>
              <TabsTrigger value="activities">الأنشطة الحالية</TabsTrigger>
              <TabsTrigger value="achievements">الإنجازات</TabsTrigger>
              <TabsTrigger value="progress">التقدم</TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>الأنشطة الحالية</CardTitle>
                  <CardDescription>الأنشطة التي تشارك فيها</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userActivities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getCategoryIcon(activity.category)}
                          <div>
                            <p className="font-medium">{activity.title}</p>
                            <p className="text-sm text-muted-foreground">{activity.schedule}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">{getStatusBadge(activity.status)}</div>
                      </div>
                    ))}
                    {userActivities.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">لم تنضم لأي أنشطة بعد</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>الإنجازات المحققة</CardTitle>
                  <CardDescription>جميع الإنجازات والجوائز التي حصلت عليها</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userAchievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-start gap-3 p-4 border rounded-lg">
                        <div className="text-2xl">{achievement.badge}</div>
                        <div className="flex-1">
                          <h4 className="font-medium">{achievement.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {achievement.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{achievement.earnedDate}</span>
                            <Badge className="text-xs">{achievement.points} نقطة</Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                    {userAchievements.length === 0 && (
                      <div className="col-span-2 text-center text-muted-foreground py-8">لا توجد إنجازات بعد</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>تقدمك في الأنشطة</CardTitle>
                  <CardDescription>مستوى تقدمك في مختلف المجالات</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    {user.interests.map((interest) => {
                      const interestActivities = userActivities.filter(
                        (activity) =>
                          activity.category.toLowerCase().includes(interest.toLowerCase()) ||
                          interest.toLowerCase().includes(activity.category.toLowerCase()),
                      )
                      const progress = Math.min((interestActivities.length / 5) * 100, 100)

                      return (
                        <div key={interest}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{interest}</span>
                            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      )
                    })}
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-4">الأهداف القادمة</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span>المشاركة في {Math.max(5 - userActivities.length, 0)} أنشطة إضافية</span>
                        <Badge variant="secondary">هدف</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-purple-500" />
                        <span>الحصول على {Math.max(10 - userAchievements.length, 0)} إنجازات إضافية</span>
                        <Badge variant="secondary">في التقدم</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
