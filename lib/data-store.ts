const ADMIN_EMAIL = "admin@youth-platform.com" as const

interface User {
  id: string
  name: string
  email: string
  role: "youth" | "admin"
  interests: string[]
  joinDate: string
  avatar?: string
  phone?: string
  birthDate?: string
  address?: string
  emergencyContact?: string
  status: "active" | "inactive"
  lastLogin?: string
}

interface Activity {
  id: string
  title: string
  description: string
  category: string
  instructor: string
  maxParticipants: number
  currentParticipants: string[]
  schedule: string
  location: string
  startDate: string
  endDate: string
  status: "active" | "completed" | "cancelled"
  image?: string
  requirements?: string[]
  createdBy: string
  createdAt: string
}

interface Achievement {
  id: string
  userId: string
  title: string
  description: string
  category: string
  earnedDate: string
  points: number
  badge: string
}

interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  category: string
  organizer: string
  attendees: string[]
  maxAttendees?: number
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
}

type StoreShape = {
  users: User[]
  activities: Activity[]
  achievements: Achievement[]
  events: Event[]
  currentUser: User | null
}

class DataStore {
  private static instance: DataStore
  private storageKey = "youth-platform-data"
  private listeners: Set<() => void> = new Set()

  private constructor() {
    this.initializeData()
  }

  static getInstance(): DataStore {
    if (!DataStore.instance) {
      DataStore.instance = new DataStore()
    }
    return DataStore.instance
  }

  // -------------------- internal helpers --------------------

  private getData(): Partial<StoreShape> {
    try {
      const data = localStorage.getItem(this.storageKey)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error("Error reading data:", error)
      return {}
    }
  }

  private saveData(data: Partial<StoreShape>) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data))
      this.notifyListeners()
    } catch (error) {
      console.error("Error saving data:", error)
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener())
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private initializeData() {
    const existingData = this.getData()
    if (!existingData.users || existingData.users.length === 0) {
      this.seedInitialData()
    } else {
      const data = this.getData() as StoreShape
      const admin = data.users.find((u) => u.email === ADMIN_EMAIL)
      if (admin && admin.role !== "admin") {
        admin.role = "admin"
        if (data.currentUser?.email === ADMIN_EMAIL) data.currentUser.role = "admin"
        this.saveData(data)
      }
    }
  }

  private seedInitialData() {
    const initialData: StoreShape = {
      users: [
        {
          id: "admin-1",
          name: "أحمد محمد",
          email: ADMIN_EMAIL,
          role: "admin",
          interests: ["إدارة", "تطوير"],
          joinDate: "2024-01-01",
          status: "active",
          avatar: "/admin-avatar.png",
        },
        {
          id: "youth-1",
          name: "سارة أحمد",
          email: "sara@example.com",
          role: "youth",
          interests: ["كرة القدم", "الرسم"],
          joinDate: "2024-02-15",
          status: "active",
          avatar: "/female-youth-avatar.png",
        },
        {
          id: "youth-2",
          name: "محمد علي",
          email: "mohamed@example.com",
          role: "youth",
          interests: ["الموسيقى", "ريادة الأعمال"],
          joinDate: "2024-03-10",
          status: "active",
          avatar: "/male-youth-avatar.png",
        },
      ],
      activities: [
        {
          id: "activity-1",
          title: "تدريب كرة القدم",
          description: "تدريب أسبوعي لتطوير مهارات كرة القدم",
          category: "رياضة",
          instructor: "كابتن أحمد",
          maxParticipants: 20,
          currentParticipants: ["youth-1", "youth-2"],
          schedule: "الأحد والثلاثاء 5:00 مساءً",
          location: "الملعب الرئيسي",
          startDate: "2024-01-15",
          endDate: "2024-06-15",
          status: "active",
          image: "/football-training.png",
          requirements: ["ملابس رياضية", "حذاء كرة قدم"],
          createdBy: "admin-1",
          createdAt: "2024-01-10",
        },
        {
          id: "activity-2",
          title: "ورشة الرسم والتصوير",
          description: "تعلم أساسيات الرسم والتصوير الفني",
          category: "فنون",
          instructor: "الأستاذة فاطمة",
          maxParticipants: 15,
          currentParticipants: ["youth-1"],
          schedule: "السبت 3:00 مساءً",
          location: "استوديو الفنون",
          startDate: "2024-02-01",
          endDate: "2024-05-01",
          status: "active",
          image: "/art-painting-workshop.png",
          requirements: ["أدوات رسم", "كراسة رسم"],
          createdBy: "admin-1",
          createdAt: "2024-01-25",
        },
      ],
      achievements: [
        {
          id: "achievement-1",
          userId: "youth-1",
          title: "أول هدف",
          description: "سجل أول هدف في المباراة",
          category: "رياضة",
          earnedDate: "2024-03-15",
          points: 50,
          badge: "⚽",
        },
        {
          id: "achievement-2",
          userId: "youth-1",
          title: "فنان مبدع",
          description: "أكمل أول لوحة فنية",
          category: "فنون",
          earnedDate: "2024-03-20",
          points: 75,
          badge: "🎨",
        },
      ],
      events: [
        {
          id: "event-1",
          title: "بطولة كرة القدم الشهرية",
          description: "بطولة بين فرق الشباب",
          date: "2024-04-15",
          time: "16:00",
          location: "الملعب الرئيسي",
          category: "رياضة",
          organizer: "admin-1",
          attendees: ["youth-1", "youth-2"],
          maxAttendees: 50,
          status: "upcoming",
        },
        {
          id: "event-2",
          title: "معرض الأعمال الفنية",
          description: "عرض أعمال الشباب الفنية",
          date: "2024-04-20",
          time: "18:00",
          location: "قاعة المعارض",
          category: "فنون",
          organizer: "admin-1",
          attendees: ["youth-1"],
          maxAttendees: 100,
          status: "upcoming",
        },
      ],
      currentUser: null,
    }

    this.saveData(initialData)
  }


  getUsers(): User[] {
    return this.getData().users || []
  }

  getUserById(id: string): User | null {
    const users = this.getUsers()
    return users.find((user) => user.id === id) || null
  }

  createUser(userData: Omit<User, "id" | "joinDate" | "status">): User {
    const data = this.getData() as StoreShape
    const role: User["role"] =
      userData.email === ADMIN_EMAIL ? "admin" : userData.role

    const newUser: User = {
      ...userData,
      role,
      id: `user-${Date.now()}`,
      joinDate: new Date().toISOString().split("T")[0],
      status: "active",
    }

    data.users = [...(data.users || []), newUser]
    this.saveData(data)
    return newUser
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const data = this.getData() as StoreShape
    const userIndex = data.users?.findIndex((user: User) => user.id === id)
    if (userIndex !== -1) {
      data.users[userIndex] = { ...data.users[userIndex], ...updates }
      // لو ده هو المستخدم الحالي، نزّله كمان
      if (data.currentUser?.id === id) {
        data.currentUser = { ...data.users[userIndex] }
      }
      this.saveData(data)
      return data.users[userIndex]
    }
    return null
  }

  updateUserRole(email: string, role: User["role"]): boolean {
    const data = this.getData() as StoreShape
    const u = data.users.find((x) => x.email === email)
    if (!u) return false
    u.role = role
    if (data.currentUser?.email === email) {
      data.currentUser.role = role
    }
    this.saveData(data)
    return true
  }

  deleteUser(id: string): boolean {
    const data = this.getData() as StoreShape
    const initialLength = data.users?.length || 0
    data.users = data.users?.filter((user: User) => user.id !== id) || []
    if (data.currentUser?.id === id) {
      data.currentUser = null
    }
    if (data.users.length < initialLength) {
      this.saveData(data)
      return true
    }
    return false
  }


  getActivities(): Activity[] {
    return this.getData().activities || []
  }

  getActivityById(id: string): Activity | null {
    const activities = this.getActivities()
    return activities.find((activity) => activity.id === id) || null
  }

  createActivity(activityData: Omit<Activity, "id" | "createdAt" | "currentParticipants">): Activity {
    const data = this.getData() as StoreShape
    const newActivity: Activity = {
      ...activityData,
      id: `activity-${Date.now()}`,
      currentParticipants: [],
      createdAt: new Date().toISOString(),
    }
    data.activities = [...(data.activities || []), newActivity]
    this.saveData(data)
    return newActivity
  }

  updateActivity(id: string, updates: Partial<Activity>): Activity | null {
    const data = this.getData() as StoreShape
    const i = data.activities?.findIndex((a: Activity) => a.id === id)
    if (i !== -1) {
      data.activities[i] = { ...data.activities[i], ...updates }
      this.saveData(data)
      return data.activities[i]
    }
    return null
  }

  joinActivity(activityId: string, userId: string): boolean {
    const data = this.getData() as StoreShape
    const activity = data.activities?.find((a: Activity) => a.id === activityId)
    if (activity && !activity.currentParticipants.includes(userId)) {
      if (activity.currentParticipants.length < activity.maxParticipants) {
        activity.currentParticipants.push(userId)
        this.saveData(data)
        return true
      }
    }
    return false
  }

  leaveActivity(activityId: string, userId: string): boolean {
    const data = this.getData() as StoreShape
    const activity = data.activities?.find((a: Activity) => a.id === activityId)
    if (activity) {
      activity.currentParticipants = activity.currentParticipants.filter((id) => id !== userId)
      this.saveData(data)
      return true
    }
    return false
  }


  getAchievements(): Achievement[] {
    return this.getData().achievements || []
  }

  getUserAchievements(userId: string): Achievement[] {
    const achievements = this.getAchievements()
    return achievements.filter((achievement) => achievement.userId === userId)
  }

  createAchievement(achievementData: Omit<Achievement, "id" | "earnedDate">): Achievement {
    const data = this.getData() as StoreShape
    const newAchievement: Achievement = {
      ...achievementData,
      id: `achievement-${Date.now()}`,
      earnedDate: new Date().toISOString().split("T")[0],
    }
    data.achievements = [...(data.achievements || []), newAchievement]
    this.saveData(data)
    return newAchievement
  }

  // -------------------- Events --------------------

  getEvents(): Event[] {
    return this.getData().events || []
  }

  createEvent(eventData: Omit<Event, "id" | "attendees">): Event {
    const data = this.getData() as StoreShape
    const newEvent: Event = {
      ...eventData,
      id: `event-${Date.now()}`,
      attendees: [],
    }
    data.events = [...(data.events || []), newEvent]
    this.saveData(data)
    return newEvent
  }

  joinEvent(eventId: string, userId: string): boolean {
    const data = this.getData() as StoreShape
    const event = data.events?.find((e: Event) => e.id === eventId)
    if (event && !event.attendees.includes(userId)) {
      if (!event.maxAttendees || event.attendees.length < event.maxAttendees) {
        event.attendees.push(userId)
        this.saveData(data)
        return true
      }
    }
    return false
  }


  login(email: string, password: string): User | null {
    const data = this.getData() as StoreShape
    const user = (data.users || []).find((u) => u.email === email)
    if (!user) return null

    if (email === ADMIN_EMAIL && password !== "admin123") {
      return null
    }

    if (email === ADMIN_EMAIL && user.role !== "admin") {
      user.role = "admin"
    }

    user.lastLogin = new Date().toISOString()
    data.currentUser = { ...user }
    this.saveData(data)
    return data.currentUser
  }

  logout(): void {
    const data = this.getData() as StoreShape
    data.currentUser = null
    this.saveData(data)
  }

  getCurrentUser(): User | null {
    const data = this.getData() as StoreShape
    if (data.currentUser?.email === ADMIN_EMAIL && data.currentUser.role !== "admin") {
      data.currentUser.role = "admin"
      const u = data.users.find((x) => x.email === ADMIN_EMAIL)
      if (u) u.role = "admin"
      this.saveData(data)
    }
    return data.currentUser || null
  }

  register(userData: Omit<User, "id" | "joinDate" | "status">): User {
    return this.createUser(userData)
  }


  getStatistics() {
    const users = this.getUsers()
    const activities = this.getActivities()
    const achievements = this.getAchievements()
    const events = this.getEvents()

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === "active").length,
      totalActivities: activities.length,
      activeActivities: activities.filter((a) => a.status === "active").length,
      totalAchievements: achievements.length,
      upcomingEvents: events.filter((e) => e.status === "upcoming").length,
      usersByRole: {
        youth: users.filter((u) => u.role === "youth").length,
        admin: users.filter((u) => u.role === "admin").length,
      },
      activitiesByCategory: activities.reduce((acc, activity) => {
        acc[activity.category] = (acc[activity.category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  }
}

export const dataStore = DataStore.getInstance()
export type { User, Activity, Achievement, Event }
