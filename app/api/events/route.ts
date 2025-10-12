export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";
import { getSession, type Session } from "@/lib/server/session";

const SELECT_BASE = `
  SELECT
    e.id, e.title, e.date, e.status, e.entityId,
    e.createdBy, e.createdByName, e.createdByRole,
    e.approvedBy, e.approvedByName, e.approvedAt,
    COALESCE(e.approvedByName, e.createdByName) AS organizerName,
    (SELECT COUNT(*) FROM event_evaluations ev WHERE ev.eventId = e.id) AS evalCount
  FROM events e
`;

export async function GET(req: NextRequest) {
  const db = getDB();
  const url = new URL(req.url);
  const entityId = url.searchParams.get("entityId");
  const scope = url.searchParams.get("scope");

  if (entityId) {
    const rows = db
      .prepare(
        `${SELECT_BASE}
         WHERE e.entityId = ?
         ORDER BY datetime(e.date) DESC, e.id DESC`
      )
      .all(entityId);
    return NextResponse.json(rows ?? []);
  }

  if (scope === "mine") {
    const s = (await getSession(req)) as Session | null;
    if (!s) return NextResponse.json([]);

    if (s.role === "unionSupervisor") {
      const rows = db
        .prepare(
          `${SELECT_BASE}
           ORDER BY datetime(e.date) DESC, e.id DESC`
        )
        .all();
      return NextResponse.json(rows ?? []);
    }

    if (s.role === "entityManager") {
      const rows = db
        .prepare(
          `${SELECT_BASE}
           WHERE e.entityId = ? OR e.entityId IS NULL
           ORDER BY datetime(e.date) DESC, e.id DESC`
        )
        .all(String(s.entityId || ""));
      const out = rows.map((r: any) => {
        const att = db
          .prepare(
            `SELECT 1 FROM event_attendance WHERE eventId=? AND userId=? AND attended=1`
          )
          .get(r.id, s.id);
        return { ...r, canEvaluate: !!att };
      });
      return NextResponse.json(out ?? []);
    }

    if (s.role === "user") {
      const baseQuery = (extraWhere = "", params: any[] = []) =>
        db
          .prepare(
            `${SELECT_BASE}
             ${extraWhere}
             ORDER BY datetime(e.date) DESC, e.id DESC`
          )
          .all(...params) as any[];

      let rows: any[] = [];
      if (s.entityId) {
        rows = baseQuery(`WHERE e.entityId = ? OR e.entityId IS NULL`, [String(s.entityId)]);
      } else {
        const ents = db
          .prepare(
            `SELECT entityId FROM entity_members WHERE userId=?
             UNION
             SELECT entityId FROM join_requests WHERE userId=? AND status='approved'`
          )
          .all(s.id, s.id) as { entityId: string }[];
        const ids = (ents || []).map(r => r.entityId).filter(Boolean);
        if (!ids.length) {
          rows = baseQuery(`WHERE e.entityId IS NULL`);
        } else {
          const placeholders = ids.map(() => "?").join(",");
          rows = baseQuery(`WHERE e.entityId IN (${placeholders}) OR e.entityId IS NULL`, ids);
        }
      }

      const out = rows.map(r => {
        const att = db
          .prepare(
            `SELECT 1 FROM event_attendance WHERE eventId=? AND userId=? AND attended=1`
          )
          .get(r.id, s.id);
        return { ...r, canEvaluate: !!att };
      });

      return NextResponse.json(out ?? []);
    }

    return NextResponse.json([]);
  }

  const rows = db
    .prepare(
      `${SELECT_BASE}
       ORDER BY datetime(e.date) DESC, e.id DESC`
    )
    .all();
  return NextResponse.json(rows ?? []);
}
