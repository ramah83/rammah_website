export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

const validStatuses = new Set(["approved", "pending", "rejected", "suspended"]);

const toNull = (v: any) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : s;
};


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

/**
 * GET:
 * - ?events=1  → يرجّع سجل الأحداث (يدعم ?type=... و ?limit=...).
 * - بدون events → يرجّع صف الكيان نفسه.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDB();
    const url = new URL(req.url);
    const wantEvents = url.searchParams.get("events") === "1";

    if (wantEvents) {
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
    }

    const row = db.prepare(
      `SELECT id, name, type, contactEmail, phone, location, documents,
              createdAt, createdBy, managerUserId, status, imageUrl
         FROM entities
        WHERE id=?`
    ).get(params.id);

    if (!row) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "failed to load entity/events" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const id = params.id;
  const entity = db.prepare(`SELECT * FROM entities WHERE id=?`).get(id) as any;
  if (!entity) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const allowed: any = {
    name: body?.name,
    type: body?.type,
    contactEmail: body?.contactEmail,
    phone: body?.phone,
    location: body?.location,
    documents: Array.isArray(body?.documents) ? body.documents : undefined,
    managerUserId: body?.managerUserId,
    status: body?.status,
    imageUrl: body?.hasOwnProperty("imageUrl") ? toNull(body?.imageUrl) : undefined,
    reason: typeof body?.reason === "string" ? body.reason.trim() : undefined,
  };

  if (allowed.status !== undefined && allowed.status !== null) {
    if (typeof allowed.status !== "string" || !validStatuses.has(allowed.status)) {
      return NextResponse.json({ error: "قيمة حالة غير صالحة" }, { status: 400 });
    }
  }

  const setClauses: string[] = [];
  const values: any[] = [];
  const write = (col: string, v: any) => { setClauses.push(`${col} = ?`); values.push(v); };

  if (allowed.name !== undefined) write("name", allowed.name);
  if (allowed.type !== undefined) write("type", allowed.type);
  if (allowed.contactEmail !== undefined) write("contactEmail", allowed.contactEmail);
  if (allowed.phone !== undefined) write("phone", allowed.phone);
  if (allowed.location !== undefined) write("location", allowed.location);
  if (allowed.documents !== undefined) write("documents", JSON.stringify(allowed.documents));
  if (allowed.managerUserId !== undefined) write("managerUserId", allowed.managerUserId);
  if (allowed.status !== undefined) write("status", allowed.status);
  if (allowed.imageUrl !== undefined) write("imageUrl", allowed.imageUrl);

  const somethingToUpdate = setClauses.length > 0;

  if (s.role === "unionSupervisor") {
    if (somethingToUpdate) {
      const sql = `UPDATE entities SET ${setClauses.join(", ")} WHERE id=?`;
      db.prepare(sql).run(...values, id);
    }

    if (allowed.managerUserId) {
      db.prepare(
        `INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
         VALUES (?, ?, ?, datetime('now'))`
      ).run(uid(), id, allowed.managerUserId);
    }

    const actorName = s.name || s.email || "مستخدم";
    if (allowed.status !== undefined && allowed.status !== entity.status) {
      const action =
        allowed.status === "suspended"
          ? "suspended"
          : allowed.status === "approved" && entity.status === "suspended"
          ? "resumed"
          : "status_changed";
      logEntityEvent(db, {
        entityId: id,
        action,
        fromStatus: entity.status,
        toStatus: allowed.status,
        reason: allowed.reason ?? null,
        actorId: s.id,
        actorName,
        actorRole: s.role,
      });
    } else if (somethingToUpdate) {
      logEntityEvent(db, {
        entityId: id,
        action: "updated",
        actorId: s.id,
        actorName,
        actorRole: s.role,
      });
    }

    return NextResponse.json({ ok: true, applied: "direct" });
  }

  if (s.role === "entityManager") {
    const rid = uid();

    
    const requestedAction =
      allowed.status === "suspended" ? "suspend_requested"
    : allowed.status === "approved"  ? "resume_requested"
    : allowed.status !== undefined   ? "status_change_requested"
    :                                  "update_requested";

    logEntityEvent(db, {
      entityId: id,
      action: requestedAction,
      fromStatus: entity.status ?? null,
      toStatus: (allowed.status ?? null),
      reason: allowed.reason ?? null,
      actorId: s.id,
      actorName: (s as any).name || (s as any).email || "مستخدم",
      actorRole: s.role,
    });

    db.prepare(`
      INSERT INTO entity_requests
        (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt)
      VALUES (?, 'update', ?, ?, 'pending', ?, 'entityManager', 'unionSupervisor', datetime('now'))
    `).run(rid, id, JSON.stringify(allowed), s.id);

    return NextResponse.json(
      { ok: true, requestId: rid, approverRole: "unionSupervisor", status: "pending" },
      { status: 202 }
    );
  }

  return NextResponse.json({ error: "ممنوع التعديل لهذا الدور" }, { status: 403 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const id = params.id;
  const entity = db.prepare(`SELECT * FROM entities WHERE id=?`).get(id) as any;
  if (!entity) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });

  if (s.role === "unionSupervisor") {
    db.prepare(`DELETE FROM entities WHERE id=?`).run(id);
    db.prepare(`DELETE FROM entity_members WHERE entityId=?`).run(id);

    logEntityEvent(db, {
      entityId: id,
      action: "deleted",
      actorId: s.id,
      actorName: s.name || s.email || "مستخدم",
      actorRole: s.role,
    });

    return NextResponse.json({ ok: true, applied: "direct" });
  }

  if (s.role === "entityManager") {
    const rid = uid();
    
    logEntityEvent(db, {
      entityId: id,
      action: "delete_requested",
      actorId: s.id,
      actorName: s.name || s.email || "مستخدم",
      actorRole: s.role,
    });

    db.prepare(
      `INSERT INTO entity_requests
         (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt)
       VALUES (?, 'delete', ?, NULL, 'pending', ?, 'entityManager', 'unionSupervisor', datetime('now'))`
    ).run(rid, id, s.id);

    return NextResponse.json(
      { ok: true, requestId: rid, status: "pending", approverRole: "unionSupervisor" },
      { status: 202 }
    );
  }

  return NextResponse.json({ error: "ممنوع الحذف لهذا الدور" }, { status: 403 });
}
