import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, type Session } from "@/lib/server/session";

const toNull = (v: any) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : s;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;


function logEntityEvent(db: any, ev: {
  entityId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
}) {
  db.prepare(`
    INSERT INTO entity_events
      (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    uid(),
    ev.entityId,
    ev.action,
    ev.fromStatus ?? null,
    ev.toStatus ?? null,
    ev.reason ?? null,
    ev.actorId ?? null,
    ev.actorName ?? null,
    ev.actorRole ?? null
  );
}

export async function GET(req: NextRequest) {
  try {
    const db = getDB();
    const s = (await getSession(req)) as Session | null;
    const url = new URL(req.url);

    const scope = url.searchParams.get("scope") || "";
    const viewerId = url.searchParams.get("viewerId") || "";
    const all = url.searchParams.get("all") === "1";

    if (scope === "mine" && viewerId) {
      if (s && s.id === viewerId) {
        const row = db.prepare(`
          SELECT e.id, e.name, e.type, e.contactEmail, e.phone, e.location, e.documents,
                 e.createdAt, e.createdBy, e.managerUserId, e.status, e.imageUrl
            FROM entities e
           WHERE e.managerUserId = ?
              OR EXISTS(
                    SELECT 1 FROM entity_members m
                     WHERE m.userId = ? AND m.entityId = e.id
                )
           LIMIT 1
        `).get(viewerId, viewerId) || null;

        return NextResponse.json(row ? [row] : []);
      }
      return NextResponse.json([]);
    }

    if (all && s?.role === "unionSupervisor") {
      const rows = db.prepare(`
        SELECT id, name, type, contactEmail, phone, location, documents,
               createdAt, createdBy, managerUserId, status, imageUrl
          FROM entities
      ORDER BY name COLLATE NOCASE
      `).all();
      return NextResponse.json(rows ?? []);
    }

    const rows = db.prepare(`
      SELECT id, name, type, contactEmail, phone, location, documents,
             createdAt, createdBy, managerUserId, status, imageUrl
        FROM entities
       WHERE status='approved'
    ORDER BY name COLLATE NOCASE
    `).all();
    return NextResponse.json(rows ?? []);
  } catch (err: any) {
    return NextResponse.json(
      { error: "failed to load entities", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const s = (await getSession(req)) as Session | null;
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  try {
    const db = getDB();
    let body: any = {};
    try { body = await req.json(); } catch {}

    const payload = {
      name: String(body?.name || "").trim(),
      type: toNull(body?.type),
      contactEmail: toNull(body?.contactEmail),
      phone: toNull(body?.phone),
      location: toNull(body?.location),
      documents: Array.isArray(body?.documents) ? body.documents : [],
      managerUserId: toNull(body?.managerUserId),
      imageUrl: toNull(body?.imageUrl),
    };

    if (!payload.name)
      return NextResponse.json({ error: "اسم الكيان مطلوب" }, { status: 400 });

    if (s.role === "unionSupervisor") {
      const id = uid();
      db.prepare(`
        INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, createdAt, createdBy, managerUserId, status, imageUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'approved', ?)
      `).run(
        id,
        payload.name,
        payload.type,
        payload.contactEmail,
        payload.phone,
        payload.location,
        JSON.stringify(payload.documents || []),
        s.id,
        payload.managerUserId,
        payload.imageUrl
      );

      
      logEntityEvent(db, {
        entityId: id,
        action: "created",
        actorId: s.id,
        actorName: s.name || s.email || "مستخدم",
        actorRole: s.role,
      });

      return NextResponse.json({ ok: true, id, status: "approved" }, { status: 201 });
    }

    if (s.role === "entityManager") {
      const rid = uid();

      
      const tempId = uid(); 
      logEntityEvent(db, {
        entityId: tempId, 
        action: "create_requested",
        actorId: s.id,
        actorName: s.name || s.email || "مستخدم",
        actorRole: s.role,
      });

      db.prepare(`
        INSERT INTO entity_requests (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt)
        VALUES (?, 'create', NULL, ?, 'pending', ?, ?, 'unionSupervisor', datetime('now'))
      `).run(rid, JSON.stringify(payload), s.id, s.role);

      return NextResponse.json(
        { ok: true, requestId: rid, approverRole: "unionSupervisor", status: "pending" },
        { status: 202 }
      );
    }

    return NextResponse.json({ error: "ممنوع إنشاء كيان لهذا الدور" }, { status: 403 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "failed to create entity", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}
