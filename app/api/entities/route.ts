import { NextResponse } from "next/server"
import { dataStore } from "@/lib/data-store"

export async function GET() {
  return NextResponse.json(dataStore.listEntities())
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }
  const ent = dataStore.addEntity({
    name: body.name,
    type: body.type ?? null,
    contactEmail: body.contactEmail ?? null,
    phone: body.phone ?? null,
    location: body.location ?? null,
    documents: body.documents ?? [],
  })
  return NextResponse.json(ent, { status: 201 })
}
