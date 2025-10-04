import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const db = getDB();
    const session = await getSession(req);

    if (!session?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const me = db.prepare(`
      SELECT id, name, email, role, entityId, nationalId, phone, city, avatar
      FROM users
      WHERE id = ?
    `).get(session.id) as any;

    if (!me) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    let entity: any = null;

    if (me.role === "user") {
      entity = db.prepare(`
        SELECT e.id, e.name, e.status
        FROM entity_members em
        LEFT JOIN entities e ON e.id = em.entityId
        WHERE em.userId = ?
        LIMIT 1
      `).get(session.id);
    } else if (me.role === "entityManager") {
      entity = db.prepare(`
        SELECT id, name, status
        FROM entities
        WHERE managerUserId = ?
        LIMIT 1
      `).get(session.id);
    }

    return NextResponse.json(
      {
        id: String(me.id),
        name: String(me.name || ""),
        email: me.email ?? null,
        phone: me.phone ?? null,
        city: me.city ?? null,
        nationalId: me.nationalId ?? null,
        role: me.role,
        entityId: entity?.id ?? me.entityId ?? null,
        entityName: entity?.name ?? null,
        status: entity?.status ?? "active",
        avatar: me.avatar ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("API /card error:", e);
    return NextResponse.json(
      { error: "server_error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
