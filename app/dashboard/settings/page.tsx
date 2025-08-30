"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Bell, Shield, Database, Users, Activity, Save, RefreshCw } from "lucide-react"
import { dataStore, type User as DSUser } from "@/lib/data-store"

type PlatformSettings = {
  platformName: string
  description: string
  maxUsersPerActivity: string
  autoApproveRegistrations: boolean
  emailNotifications: boolean
  smsNotifications: boolean
  weeklyReports: boolean
  maintenanceMode: boolean
  allowGuestAccess: boolean
  requireEmailVerification: boolean
  sessionTimeout: string
  backupFrequency: "hourly" | "daily" | "weekly" | "monthly"
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: "منصة الكيانات الشبابية",
  description: "منصة شاملة لإدارة وتنمية المواهب الشبابية",
  maxUsersPerActivity: "30",
  autoApproveRegistrations: true,
  emailNotifications: true,
  smsNotifications: false,
  weeklyReports: true,
  maintenanceMode: false,
  allowGuestAccess: false,
  requireEmailVerification: true,
  sessionTimeout: "60",
  backupFrequency: "daily",
}

const SETTINGS_KEY = "platform-settings"

export default function SettingsPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [user, setUser] = useState<DSUser | null>(null)
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS)

  // منع أخطاء الـ hydration
  useEffect(() => setMounted(true), [])

  // جلب المستخدم الحالي من الـ dataStore + الاشتراك للتحديثات
 // الاشتراك لجلب المستخدم الحالي من الـ dataStore + التحديث عند أي تغيير
useEffect(() => {
  if (!mounted) return

  const updateUser = () => setUser(dataStore.getCurrentUser())

  // جلب فوري أول ما المكون يركّب
  updateUser()

  // الاشتراك في أي تغييرات على الـ dataStore
  const unsubscribe = dataStore.subscribe(updateUser)

  // تنظيف الاشتراك عند الخروج
  return () => {
    unsubscribe()
  }
// لأن dataStore سينجلتون (ثابت) ومش هيتغير بين الرندرز
// فمش محتاجين نضيفه للـ deps
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted])

  // تحميل / حفظ الإعدادات من وإلى localStorage
  useEffect(() => {
    if (!mounted) return
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
      } catch {
        setSettings(DEFAULT_SETTINGS)
      }
    }
  }, [mounted])

  const handleSaveSettings = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    alert("تم حفظ الإعدادات بنجاح!")
  }

  const handleResetSettings = () => {
    if (confirm("هل أنت متأكد من إعادة تعيين جميع الإعدادات؟")) {
      setSettings(DEFAULT_SETTINGS)
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
    }
  }

  // رفض الوصول لغير الأدمن
  if (!mounted) return null
  if (!user) {
    // ممكن تعمله redirect للصفحة الرئيسية
    // router.replace("/")
    return <div className="text-center py-12">يرجى تسجيل الدخول</div>
  }
  if (user.role !== "admin") {
    return <div className="text-center py-12">غير مصرح لك بالوصول إلى هذه الصفحة</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إعدادات النظام</h2>
          <p className="text-gray-600">إدارة إعدادات المنصة والتحكم في الوظائف</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            إعادة تعيين
          </Button>
          <Button onClick={handleSaveSettings}>
            <Save className="h-4 w-4 mr-2" />
            حفظ الإعدادات
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">الإعدادات العامة</TabsTrigger>
          <TabsTrigger value="notifications">الإشعارات</TabsTrigger>
          <TabsTrigger value="security">الأمان</TabsTrigger>
          <TabsTrigger value="system">النظام</TabsTrigger>
        </TabsList>

        {/* العامة */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  معلومات المنصة
                </CardTitle>
                <CardDescription>الإعدادات الأساسية للمنصة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platformName">اسم المنصة</Label>
                  <Input
                    id="platformName"
                    value={settings.platformName}
                    onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">وصف المنصة</Label>
                  <Textarea
                    id="description"
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">الحد الأقصى للمشاركين في النشاط</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={settings.maxUsersPerActivity}
                    onChange={(e) => setSettings({ ...settings, maxUsersPerActivity: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  إعدادات المستخدمين
                </CardTitle>
                <CardDescription>التحكم في تسجيل وإدارة المستخدمين</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>الموافقة التلقائية على التسجيل</Label>
                    <p className="text-sm text-muted-foreground">الموافقة على طلبات التسجيل تلقائياً</p>
                  </div>
                  <Switch
                    checked={settings.autoApproveRegistrations}
                    onCheckedChange={(checked) => setSettings({ ...settings, autoApproveRegistrations: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>السماح بالوصول للضيوف</Label>
                    <p className="text-sm text-muted-foreground">السماح للزوار بتصفح المحتوى</p>
                  </div>
                  <Switch
                    checked={settings.allowGuestAccess}
                    onCheckedChange={(checked) => setSettings({ ...settings, allowGuestAccess: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>التحقق من البريد الإلكتروني</Label>
                    <p className="text-sm text-muted-foreground">طلب التحقق من البريد عند التسجيل</p>
                  </div>
                  <Switch
                    checked={settings.requireEmailVerification}
                    onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* الإشعارات */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                إعدادات الإشعارات
              </CardTitle>
              <CardDescription>التحكم في أنواع الإشعارات المرسلة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">إشعارات البريد الإلكتروني</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>تفعيل إشعارات البريد</Label>
                        <p className="text-sm text-muted-foreground">إرسال الإشعارات عبر البريد الإلكتروني</p>
                      </div>
                      <Switch
                        checked={settings.emailNotifications}
                        onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>التقارير الأسبوعية</Label>
                        <p className="text-sm text-muted-foreground">إرسال تقرير أسبوعي للإدمن</p>
                      </div>
                      <Switch
                        checked={settings.weeklyReports}
                        onCheckedChange={(checked) => setSettings({ ...settings, weeklyReports: checked })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">إشعارات الرسائل النصية</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>تفعيل الرسائل النصية</Label>
                        <p className="text-sm text-muted-foreground">إرسال الإشعارات عبر SMS</p>
                      </div>
                      <Switch
                        checked={settings.smsNotifications}
                        onCheckedChange={(checked) => setSettings({ ...settings, smsNotifications: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* الأمان */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                إعدادات الأمان
              </CardTitle>
              <CardDescription>التحكم في أمان النظام والمستخدمين</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">مهلة انتهاء الجلسة (بالدقائق)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>وضع الصيانة</Label>
                      <p className="text-sm text-muted-foreground">تعطيل الوصول للمستخدمين مؤقتاً</p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* النظام */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  إعدادات النسخ الاحتياطي
                </CardTitle>
                <CardDescription>إدارة النسخ الاحتياطية للبيانات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">تكرار النسخ الاحتياطي</Label>
                  <Select
                    value={settings.backupFrequency}
                    onValueChange={(value: PlatformSettings["backupFrequency"]) =>
                      setSettings({ ...settings, backupFrequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">كل ساعة</SelectItem>
                      <SelectItem value="daily">يومياً</SelectItem>
                      <SelectItem value="weekly">أسبوعياً</SelectItem>
                      <SelectItem value="monthly">شهرياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full bg-transparent">
                    <Database className="h-4 w-4 mr-2" />
                    إنشاء نسخة احتياطية الآن
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  معلومات النظام
                </CardTitle>
                <CardDescription>حالة النظام والإحصائيات</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">إصدار النظام</div>
                    <div className="text-muted-foreground">v2.1.0</div>
                  </div>
                  <div>
                    <div className="font-medium">آخر تحديث</div>
                    <div className="text-muted-foreground">10 مارس 2024</div>
                  </div>
                  <div>
                    <div className="font-medium">حالة الخادم</div>
                    <div className="text-green-600">متصل</div>
                  </div>
                  <div>
                    <div className="font-medium">استخدام التخزين</div>
                    <div className="text-muted-foreground">2.3 GB</div>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full bg-transparent">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    فحص التحديثات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
