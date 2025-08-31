"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Users,
  Home,
  Trophy,
  Palette,
  Calculator,
  Music,
  BookOpen,
  Calendar,
  Award,
  Settings,
  BarChart3,
  UserPlus,
  Menu,
  Activity,
} from "lucide-react"

interface SidebarProps {
  userType: "youth" | "admin"
}

export function Sidebar({ userType }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const youthNavItems = [
    { href: "/dashboard", label: "الرئيسية", icon: Home },
    { href: "/dashboard/activities", label: "أنشطتي", icon: Activity },
    { href: "/dashboard/sports", label: "الرياضة", icon: Trophy },
    { href: "/dashboard/arts", label: "الفنون", icon: Palette },
    { href: "/dashboard/economics", label: "الاقتصاد", icon: Calculator },
    { href: "/dashboard/music", label: "الموسيقى", icon: Music },
    { href: "/dashboard/literature", label: "الأدب", icon: BookOpen },
    { href: "/dashboard/calendar", label: "التقويم", icon: Calendar },
    { href: "/dashboard/achievements", label: "الإنجازات", icon: Award },
    { href: "/dashboard/profile", label: "الملف الشخصي", icon: Settings },
  ]

  const adminNavItems = [
    { href: "/dashboard", label: "الرئيسية", icon: Home },
    { href: "/dashboard/users", label: "إدارة المستخدمين", icon: Users },
    { href: "/dashboard/activities", label: "إدارة الأنشطة", icon: Activity },
    { href: "/dashboard/sports", label: "الرياضة", icon: Trophy },
    { href: "/dashboard/arts", label: "الفنون", icon: Palette },
    { href: "/dashboard/economics", label: "الاقتصاد", icon: Calculator },
    { href: "/dashboard/music", label: "الموسيقى", icon: Music },
    { href: "/dashboard/literature", label: "الأدب", icon: BookOpen },
    { href: "/dashboard/calendar", label: "التقويم", icon: Calendar },
    { href: "/dashboard/reports", label: "التقارير", icon: BarChart3 },
    { href: "/dashboard/registration", label: "التسجيلات", icon: UserPlus },
    { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
  ]

  const navItems = userType === "admin" ? adminNavItems : youthNavItems

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Users className="h-6 w-6 text-blue-600" />
        <span className="font-bold text-lg">منصة الشباب</span>
      </div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-2 h-10",
                    isActive && "bg-blue-100 text-blue-700 hover:bg-blue-100",
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )

  return (
    <>
      <div className="hidden md:flex h-screen w-64 flex-col fixed inset-y-0 z-50 bg-white border-r">
        <SidebarContent />
      </div>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden fixed top-4 left-4 z-40 bg-transparent">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
