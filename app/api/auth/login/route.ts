import { NextResponse } from "next/server"
import { login } from "@/lib/server/data-store-server"

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 })
  }

  const u = login(email, password)
  if (!u) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 })
  }

  return NextResponse.json({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    entityId: u.entityId ?? null,
    permissions: u.permissions ?? [],
  })
}
