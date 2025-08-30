"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Users, Calendar, Trophy, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDataStore } from "@/hooks/use-data-store"

export default function EconomicsPage() {
  const { user, activities, joinActivity } = useDataStore()
  const [searchTerm, setSearchTerm] = useState("")

  const economicsActivities = (activities || []).filter(
    (activity) => activity.category === "الاقتصاد" && activity.title.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleJoinActivity = (activityId: string) => {
    if (user) {
      joinActivity(activityId, user.id)
    }
  }

  const isUserJoined = (activityId: string) => {
    return user ? (activities || []).find((a) => a.id === activityId)?.participants.includes(user.id) : false
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            الاقتصاد وريادة الأعمال
          </h1>
          <p className="text-gray-600 mt-2">تعلم أساسيات الاقتصاد وبناء المشاريع الناجحة</p>
        </div>
        {user?.role === "admin" && (
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            إضافة نشاط اقتصادي
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{economicsActivities.length}</p>
                <p className="text-sm text-gray-600">الأنشطة الاقتصادية</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {economicsActivities.reduce((sum, activity) => sum + activity.participants.length, 0)}
                </p>
                <p className="text-sm text-gray-600">رواد الأعمال</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-teal-600">8</p>
                <p className="text-sm text-gray-600">المشاريع المنجزة</p>
              </div>
              <Trophy className="h-8 w-8 text-teal-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ابحث في الأنشطة الاقتصادية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {economicsActivities.map((activity) => (
          <Card key={activity.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{activity.title}</CardTitle>
                  <CardDescription className="mt-2">{activity.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {activity.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {activity.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {activity.participants.length} مشارك
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">المستوى: {activity.level}</span>
                  {user?.role === "youth" && (
                    <Button
                      size="sm"
                      onClick={() => handleJoinActivity(activity.id)}
                      disabled={isUserJoined(activity.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isUserJoined(activity.id) ? "منضم" : "انضم"}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {economicsActivities.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أنشطة اقتصادية</h3>
            <p className="text-gray-600">لم يتم العثور على أنشطة اقتصادية متاحة حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
