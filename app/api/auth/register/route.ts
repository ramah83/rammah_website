import { NextResponse } from "next/server"
import { register, getUsers } from "@/lib/server/data-store-server"

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { name, email, password, role, interests, entityId } = body || {}

  if (!name || !email || !password) {
    return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 })
  }

  const exists = (getUsers() || []).some((u) => u.email === email)
  if (exists) {
    return NextResponse.json({ error: "هذا البريد مستخدم بالفعل" }, { status: 409 })
  }

  const created = register({
    name,
    email,
    password,
    role,
    interests: interests ?? [],
    entityId: entityId ?? null,
    permissions: [],
  })

  if (!created) {
    return NextResponse.json({ error: "تعذّر إنشاء المستخدم" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: created.id })
}
