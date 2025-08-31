import { NextResponse } from "next/server"
import { dataStore } from "@/lib/server/data-store-server"

export async function GET() {
  return NextResponse.json(dataStore.listGovernance())
}

export async function POST(req: Request) {
  const b = await req.json()
  const g = dataStore.addGovernance({
    title: b.title,
    type: b.type,
    status: b.status ?? "draft",
    entityId: b.entityId ?? null,
    decisionDate: b.decisionDate ?? null,
    notes: b.notes ?? null,
  })
  return NextResponse.json(g, { status: 201 })
}
