import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET() {
  return NextResponse.json(dataStore.listMembers())
}

export async function POST(req: Request) {
  const b = await req.json()
  if (!b?.name) return NextResponse.json({ error: "name is required" }, { status: 400 })
  const m = dataStore.addMember({
    name: b.name,
    email: b.email ?? null,
    phone: b.phone ?? null,
    entityId: b.entityId ?? null,
  })
  return NextResponse.json(m, { status: 201 })
}
