import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET() {
  return NextResponse.json(dataStore.listEvents())
}

export async function POST(req: Request) {
  const b = await req.json()
  if (!b?.title || !b?.status) {
    return NextResponse.json({ error: "title & status are required" }, { status: 400 })
  }
  const ev = dataStore.addEvent({
    title: b.title,
    date: b.date ?? null,
    status: b.status,           
    entityId: b.entityId ?? null,
  })
  return NextResponse.json(ev, { status: 201 })
}