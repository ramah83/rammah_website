import type { ReactNode } from "react"

export const metadata = {
  title: "لوحة التحكم - منصة الكيانات الشبابية",
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}
