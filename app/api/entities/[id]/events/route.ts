export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDB();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || undefined;
    const limit = Number(url.searchParams.get("limit") || 50);

    const rows = db.prepare(
      `
      SELECT id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt
        FROM entity_events
       WHERE entityId = ?
         ${type ? "AND action = ?" : ""}
    ORDER BY createdAt DESC
       LIMIT ?
      `
    ).all(type ? [params.id, type, limit] : [params.id, limit]);

    return NextResponse.json({ ok: true, events: rows });
  } catch (e: any) {
    return NextResponse.json({ error: "failed to load events" }, { status: 500 });
  }
}
