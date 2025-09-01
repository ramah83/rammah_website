import { NextResponse } from "next/server"
import { getDB, ensureTables, uid } from "@/lib/server/sqlite"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

type GovernanceBody = {
  id?: string
  title?: string
  type?: string
  notes?: string | null  
  description?: string | null 
  entityId?: string | null
  status?: string | null
  meta?: any             
}

function ok(data: any, status = 200) {
  return NextResponse.json(data, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function serialize(row: any) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    notes: row.description ?? null,     
    entityId: row.entityId ?? null,
    status: row.status ?? null,
    meta: row.meta ? safeParseJSON(row.meta) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function safeParseJSON(s: string) {
  try { return JSON.parse(s) } catch { return null }
}

export async function GET(req: Request) {
  try {
    ensureTables()
    const db = getDB()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const q = (searchParams.get("q") || "").trim()

    let sql = `SELECT * FROM governance`
    const where: string[] = []
    const params: any[] = []

    if (type && type !== "all") { where.push(`type = ?`); params.push(type) }
    if (q) {
      where.push(`(title LIKE ? OR description LIKE ? OR type LIKE ?)`)
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    }
    if (where.length) sql += ` WHERE ` + where.join(" AND ")
    sql += ` ORDER BY datetime(createdAt) DESC`

    const rows = db.prepare(sql).all(...params).map(serialize)
    return ok(rows)
  } catch (e: any) {
    console.error("GET /api/governance error:", e)
    return err(e?.message || "Server error", 500)
  }
}

export async function POST(req: Request) {
  try {
    ensureTables()
    const db = getDB()
    const b: GovernanceBody = await req.json()
    const now = new Date().toISOString()

    if (!b?.title?.trim()) return err("العنوان مطلوب", 400)
    if (!b?.type?.trim())  return err("النوع مطلوب", 400)

    const row = {
      id: uid(),
      type: String(b.type).trim(),
      title: String(b.title).trim(),
      description: b.notes ?? null,         
      entityId: b.entityId ?? null,
      status: b.status ?? "draft",
      meta: b.meta ? JSON.stringify(b.meta) : null,
      createdAt: now,
      updatedAt: now,
    }

    db.prepare(`
      INSERT INTO governance (id, type, title, description, entityId, status, meta, createdAt, updatedAt)
      VALUES (@id, @type, @title, @description, @entityId, @status, @meta, @createdAt, @updatedAt)
    `).run(row)

    return ok(serialize(row), 201)
  } catch (e: any) {
    console.error("POST /api/governance error:", e)
    return err(e?.message || "Server error", 500)
  }
}

export async function PATCH(req: Request) {
  try {
    ensureTables()
    const db = getDB()
    const b: GovernanceBody = await req.json()
    const id = String(b?.id || "")
    if (!id) return err("Missing id", 400)

    const current = db.prepare(`SELECT * FROM governance WHERE id = ?`).get(id) as GovernanceBody
    if (!current) return err("Not found", 404)

    const updated = {
      title:       b.title !== undefined ? String(b.title) : current.title,
      type:        b.type  !== undefined ? String(b.type)  : current.type,
      description: b.notes !== undefined ? (b.notes ? String(b.notes) : null) : current.description,
      status:      b.status !== undefined ? String(b.status) : current.status,
      meta:        b.meta   !== undefined ? (b.meta ? JSON.stringify(b.meta) : null) : current.meta,
      updatedAt:   new Date().toISOString(),
    }

    db.prepare(`
      UPDATE governance
         SET title = @title,
             type = @type,
             description = @description,
             status = @status,
             meta = @meta,
             updatedAt = @updatedAt
       WHERE id = @id
    `).run({ id, ...updated })

    const row = db.prepare(`SELECT * FROM governance WHERE id = ?`).get(id)
    return ok(serialize(row))
  } catch (e: any) {
    console.error("PATCH /api/governance error:", e)
    return err(e?.message || "Server error", 500)
  }
}

export async function DELETE(req: Request) {
  try {
    ensureTables()
    const db = getDB()
    const b: GovernanceBody = await req.json()
    const id = String(b?.id || "")
    if (!id) return err("Missing id", 400)

    const exists = db.prepare(`SELECT 1 FROM governance WHERE id = ?`).get(id)
    if (!exists) return err("Not found", 404)

    db.prepare(`DELETE FROM governance WHERE id = ?`).run(id)
    return ok({ ok: true })
  } catch (e: any) {
    console.error("DELETE /api/governance error:", e)
    return err(e?.message || "Server error", 500)
  }
}
