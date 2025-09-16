// app/api/events/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession, type Session } from "@/lib/server/session";

const SELECT_BASE = `
  SELECT
    e.id, e.title, e.date, e.status, e.entityId,
    (SELECT COUNT(*) FROM event_evaluations ev WHERE ev.eventId = e.id) AS evalCount
  FROM events e
`;

export async function GET(req: NextRequest) {
  const db = getDB();
  const url = new URL(req.url);
  const entityId = url.searchParams.get("entityId");
  const scope = url.searchParams.get("scope");

  if (entityId) {
    const rows = db.prepare(
      `${SELECT_BASE}
        WHERE e.entityId = ?
        ORDER BY datetime(e.date) DESC, e.id DESC`
    ).all(entityId);
    return NextResponse.json(rows ?? []);
  }

  if (scope === "mine") {
    const s = (await getSession(req)) as Session | null;
    if (!s) return NextResponse.json([]);

    if (s.role === "entityManager" || s.role === "unionSupervisor") {
      const rows = db.prepare(
        `${SELECT_BASE}
          ORDER BY datetime(e.date) DESC, e.id DESC`
      ).all();
      return NextResponse.json(rows ?? []);
    }

    if (s.role === "user") {
      if (s.entityId) {
        const rows = db.prepare(
          `${SELECT_BASE}
            WHERE e.entityId = ? OR e.entityId IS NULL
            ORDER BY datetime(e.date) DESC, e.id DESC`
        ).all(String(s.entityId));
        return NextResponse.json(rows ?? []);
      }

      const ents = db.prepare(
        `SELECT entityId FROM entity_members WHERE userId=?
         UNION
         SELECT entityId FROM join_requests WHERE userId=? AND status='approved'`
      ).all(s.id, s.id) as { entityId: string }[];

      const ids = (ents || []).map(r => r.entityId).filter(Boolean);
      if (!ids.length) {
        const rows = db.prepare(
          `${SELECT_BASE}
            WHERE e.entityId IS NULL
            ORDER BY datetime(e.date) DESC, e.id DESC`
        ).all();
        return NextResponse.json(rows ?? []);
      }

      const placeholders = ids.map(() => "?").join(",");
      const rows = db.prepare(
        `${SELECT_BASE}
          WHERE e.entityId IN (${placeholders}) OR e.entityId IS NULL
          ORDER BY datetime(e.date) DESC, e.id DESC`
      ).all(...ids);
      return NextResponse.json(rows ?? []);
    }

    return NextResponse.json([]);
  }

  const rows = db.prepare(
    `${SELECT_BASE}
      ORDER BY datetime(e.date) DESC, e.id DESC`
  ).all();
  return NextResponse.json(rows ?? []);
}
