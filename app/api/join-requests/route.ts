import { NextRequest, NextResponse } from "next/server"
import { v4 as uuid } from "uuid"
import type { Session, JoinRequest } from "@/lib/types"


let STORE: JoinRequest[] = []


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const entityId = searchParams.get("entityId")
  const userId = searchParams.get("userId")

  const rows = STORE
    .filter(r =>
      (!status || r.status === status) &&
      (!entityId || r.entityId === entityId) &&
      (!userId || r.userId === userId)
    )
    .sort((a,b)=> b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json(rows)
}


export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, userName, userEmail, entityId, entityName, note } = body || {}
  if (!userId || !userName || !userEmail || !entityId || !entityName) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 })
  }

  
  const exists = STORE.find(r => r.userId === userId && r.entityId === entityId && r.status === "pending")
  if (exists) return NextResponse.json({ error: "عندك طلب قيد المراجعة لنفس الكيان" }, { status: 409 })

  const row: JoinRequest = {
    id: uuid(),
    userId, userName, userEmail,
    entityId, entityName,
    note,
    status: "pending",
    createdAt: new Date().toISOString(),
  }
  STORE.push(row)
  return NextResponse.json(row, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, action, decidedBy } = body || {}
  const row = STORE.find(r => r.id === id)
  if (!row) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 })
  if (row.status !== "pending") return NextResponse.json({ error: "تم اتخاذ قرار مسبقاً" }, { status: 409 })

  if (action === "approve") row.status = "approved"
  else if (action === "reject") row.status = "rejected"
  else return NextResponse.json({ error: "إجراء غير صحيح" }, { status: 400 })

  row.decidedAt = new Date().toISOString()
  row.decidedBy = decidedBy || "admin"
  return NextResponse.json(row)
}
