"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Music, Users, Calendar, Trophy, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useDataStore } from "@/hooks/use-data-store"

export default function MusicPage() {
  const { user, activities, joinActivity } = useDataStore()
  const [searchTerm, setSearchTerm] = useState("")

  const musicActivities = (activities || []).filter(
    (activity) => activity.category === "الموسيقى" && activity.title.toLowerCase().includes(searchTerm.toLowerCase()),
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
            <Music className="h-8 w-8 text-indigo-600" />
            الموسيقى والغناء
          </h1>
          <p className="text-gray-600 mt-2">اكتشف عالم الألحان والإيقاعات الجميلة</p>
        </div>
        {user?.role === "admin" && (
          <Button className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            إضافة نشاط موسيقي
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-indigo-600">{musicActivities.length}</p>
                <p className="text-sm text-gray-600">الأنشطة الموسيقية</p>
              </div>
              <Music className="h-8 w-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {musicActivities.reduce((sum, activity) => sum + activity.participants.length, 0)}
                </p>
                <p className="text-sm text-gray-600">الموسيقيون</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-pink-600">15</p>
                <p className="text-sm text-gray-600">العروض المنجزة</p>
              </div>
              <Trophy className="h-8 w-8 text-pink-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ابحث في الأنشطة الموسيقية..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {musicActivities.map((activity) => (
          <Card key={activity.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{activity.title}</CardTitle>
                  <CardDescription className="mt-2">{activity.description}</CardDescription>
                </div>
                <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
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
                      className="bg-indigo-600 hover:bg-indigo-700"
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

      {musicActivities.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Music className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أنشطة موسيقية</h3>
            <p className="text-gray-600">لم يتم العثور على أنشطة موسيقية متاحة حالياً</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
