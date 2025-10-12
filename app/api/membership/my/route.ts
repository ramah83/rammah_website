// app/api/membership/my/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function readSession(req: NextRequest): Promise<{ id?: string; role?: string; entityId?: string | null } | null> {
  const b64 = req.headers.get("x-session-b64") || "";
  if (b64) {
    try {
      const json = Buffer.from(b64, "base64").toString("utf-8");
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  try {
    const s = await getSession(req);
    if (!s) return null;
    return { id: s.id, role: s.role, entityId: s.entityId ?? null };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const db = getDB();
    const session = await readSession(req);
    if (!session?.id) {
      return NextResponse.json({ entityId: null, entityName: null, status: null }, { status: 200 });
    }
    const row = db
      .prepare(
        `
        SELECT em.entityId, e.name AS entityName
        FROM entity_members em
        LEFT JOIN entities e ON e.id = em.entityId
        WHERE em.userId = ?
        LIMIT 1
      `
      )
      .get(session.id) as { entityId?: string; entityName?: string } | undefined;

    if (!row?.entityId) {
      return NextResponse.json({ entityId: null, entityName: null, status: null }, { status: 200 });
    }

    return NextResponse.json(
      { entityId: String(row.entityId), entityName: row.entityName ?? null, status: "active" },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ entityId: null, entityName: null, status: null }, { status: 200 });
  }
}
