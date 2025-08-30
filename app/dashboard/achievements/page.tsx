"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Award, Trophy, Star, Target, Calendar, TrendingUp, Medal, Crown } from "lucide-react"

interface User {
  name: string
  email: string
  userType: "youth" | "admin"
  interests: string[]
}

interface Achievement {
  id: string
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard" | "legendary"
  points: number
  icon: string
  unlocked: boolean
  unlockedDate?: string
  progress?: number
  maxProgress?: number
}

const mockAchievements: Achievement[] = [
  {
    id: "1",
    title: "أول خطوة",
    description: "أكمل نشاطك الأول",
    category: "general",
    difficulty: "easy",
    points: 10,
    icon: "🎯",
    unlocked: true,
    unlockedDate: "2024-01-20",
  },
  {
    id: "2",
    title: "المشارك النشط",
    description: "شارك في 10 أنشطة مختلفة",
    category: "general",
    difficulty: "medium",
    points: 50,
    icon: "⭐",
    unlocked: true,
    unlockedDate: "2024-02-15",
  },
  {
    id: "3",
    title: "أفضل لاعب",
    description: "احصل على أعلى تقييم في نشاط رياضي",
    category: "sports",
    difficulty: "hard",
    points: 100,
    icon: "🏆",
    unlocked: true,
    unlockedDate: "2024-02-28",
  },
  {
    id: "4",
    title: "الفنان المبدع",
    description: "أنجز 5 أعمال فنية متميزة",
    category: "arts",
    difficulty: "medium",
    points: 75,
    icon: "🎨",
    unlocked: true,
    unlockedDate: "2024-03-05",
  },
  {
    id: "5",
    title: "رائد الأعمال",
    description: "قدم مشروع ريادي مبتكر",
    category: "economics",
    difficulty: "hard",
    points: 120,
    icon: "💼",
    unlocked: false,
    progress: 3,
    maxProgress: 5,
  },
  {
    id: "6",
    title: "الموسيقار الشاب",
    description: "أتقن عزف 3 آلات موسيقية",
    category: "music",
    difficulty: "hard",
    points: 150,
    icon: "🎵",
    unlocked: false,
    progress: 1,
    maxProgress: 3,
  },
  {
    id: "7",
    title: "أسطورة المنصة",
    description: "احصل على جميع الإنجازات الأخرى",
    category: "legendary",
    difficulty: "legendary",
    points: 500,
    icon: "👑",
    unlocked: false,
    progress: 4,
    maxProgress: 20,
  },
]

export default function AchievementsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>(mockAchievements)
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const categories = [
    { id: "all", label: "جميع الإنجازات", icon: Award },
    { id: "general", label: "عام", icon: Star },
    { id: "sports", label: "الرياضة", icon: Trophy },
    { id: "arts", label: "الفنون", icon: Target },
    { id: "economics", label: "الاقتصاد", icon: TrendingUp },
    { id: "music", label: "الموسيقى", icon: Medal },
    { id: "legendary", label: "أسطوري", icon: Crown },
  ]

  const filteredAchievements = achievements.filter(
    (achievement) => selectedCategory === "all" || achievement.category === selectedCategory,
  )

  const unlockedAchievements = achievements.filter((a) => a.unlocked)
  const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0)
  const completionRate = Math.round((unlockedAchievements.length / achievements.length) * 100)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-green-100 text-green-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "hard":
        return "bg-red-100 text-red-800"
      case "legendary":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "سهل"
      case "medium":
        return "متوسط"
      case "hard":
        return "صعب"
      case "legendary":
        return "أسطوري"
      default:
        return "غير محدد"
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الإنجازات والجوائز</h2>
          <p className="text-gray-600">تتبع إنجازاتك واكتشف تحديات جديدة</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإنجازات المحققة</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unlockedAchievements.length}</div>
            <p className="text-xs text-muted-foreground">من أصل {achievements.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي النقاط</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">نقطة إنجاز</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">معدل الإكمال</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الترتيب</CardTitle>
            <Medal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#3</div>
            <p className="text-xs text-muted-foreground">في المنصة</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-4">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full">
          {categories.map((category) => {
            const Icon = category.icon
            return (
              <TabsTrigger key={category.id} value={category.id} className="text-xs">
                <Icon className="h-3 w-3 mr-1" />
                {category.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`relative overflow-hidden transition-all duration-200 ${
                  achievement.unlocked ? "border-green-200 bg-green-50/30" : "border-gray-200 bg-gray-50/30"
                }`}
              >
                {achievement.unlocked && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-100 text-green-800">
                      <Award className="h-3 w-3 mr-1" />
                      محقق
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-3">
                  <div className={`text-4xl mb-2 ${achievement.unlocked ? "" : "grayscale opacity-50"}`}>
                    {achievement.icon}
                  </div>
                  <CardTitle className={`text-lg ${achievement.unlocked ? "" : "text-gray-500"}`}>
                    {achievement.title}
                  </CardTitle>
                  <CardDescription className={achievement.unlocked ? "" : "text-gray-400"}>
                    {achievement.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(achievement.difficulty)}>
                      {getDifficultyLabel(achievement.difficulty)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">{achievement.points}</span>
                    </div>
                  </div>

                  {achievement.unlocked ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Calendar className="h-4 w-4" />
                      <span>تم الإنجاز في {achievement.unlockedDate}</span>
                    </div>
                  ) : achievement.progress !== undefined && achievement.maxProgress !== undefined ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>التقدم</span>
                        <span>
                          {achievement.progress}/{achievement.maxProgress}
                        </span>
                      </div>
                      <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-2" />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-2">لم يتم إنجازه بعد</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              الإنجازات الأخيرة
            </CardTitle>
            <CardDescription>آخر الإنجازات التي حققتها</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unlockedAchievements
                .sort((a, b) => new Date(b.unlockedDate!).getTime() - new Date(a.unlockedDate!).getTime())
                .slice(0, 3)
                .map((achievement) => (
                  <div key={achievement.id} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h4 className="font-medium">{achievement.title}</h4>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-4 w-4" />
                        <span className="font-bold">{achievement.points}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{achievement.unlockedDate}</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
