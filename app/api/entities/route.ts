export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"
import { getDB } from "@/lib/server/sqlite"

function rowToEntity(r: any) {
  return {
    id: r.id,
    name: r.name,
    type: r.type ?? null,
    contactEmail: r.contactEmail ?? null,
    phone: r.phone ?? null,
    location: r.location ?? null,
    documents: r.documents ? JSON.parse(r.documents) : [],
    createdAt: r.createdAt,
  }
}

export async function GET() {
  const db = getDB()
  const rows = db.prepare("SELECT * FROM entities ORDER BY datetime(createdAt) DESC").all()
  return NextResponse.json(rows.map(rowToEntity))
}

export async function POST(req: Request) {
  const body = await req.json()
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const db = getDB()
  const id = (crypto as any)?.randomUUID?.() ?? "id_" + Math.random().toString(36).slice(2)
  const createdAt = new Date().toISOString()

  db.prepare(`
    INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, createdAt)
    VALUES (?,  ?,    ?,   ?,            ?,    ?,      ?,         ?)
  `).run(
    id,
    body.name,
    body.type ?? null,
    body.contactEmail ?? null,
    body.phone ?? null,
    body.location ?? null,
    JSON.stringify(body.documents ?? []),
    createdAt
  )

  return NextResponse.json(
    {
      id,
      name: body.name,
      type: body.type ?? null,
      contactEmail: body.contactEmail ?? null,
      phone: body.phone ?? null,
      location: body.location ?? null,
      documents: body.documents ?? [],
      createdAt,
    },
    { status: 201 }
  )
}
