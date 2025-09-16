export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

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
    managerUserId: body?.managerUserId ?? undefined,
  };

  if (s.role === "unionSupervisor") {
    const docs = allowed.documents !== undefined ? JSON.stringify(allowed.documents) : entity.documents;
    db.prepare(`
      UPDATE entities
         SET name = COALESCE(?, name),
             type = COALESCE(?, type),
             contactEmail = COALESCE(?, contactEmail),
             phone = COALESCE(?, phone),
             location = COALESCE(?, location),
             documents = COALESCE(?, documents),
             managerUserId = COALESCE(?, managerUserId)
       WHERE id=?
    `).run(
      allowed.name ?? null,
      allowed.type ?? null,
      allowed.contactEmail ?? null,
      allowed.phone ?? null,
      allowed.location ?? null,
      allowed.documents !== undefined ? docs : null,
      allowed.managerUserId ?? null,
      id
    );

    if (allowed.managerUserId) {
      db.prepare(`
        INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
        VALUES (?, ?, ?, datetime('now'))
      `).run(uid(), id, allowed.managerUserId);
    }

    return NextResponse.json({ ok: true, applied: "direct" });
  }

  if (s.role === "entityManager") {
    const rid = uid();
    db.prepare(`
      INSERT INTO entity_requests (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt)
      VALUES (?, 'update', ?, ?, 'pending', ?, 'entityManager', 'unionSupervisor', datetime('now'))
    `).run(rid, id, JSON.stringify(allowed), s.id);
    return NextResponse.json({ ok: true, requestId: rid, approverRole: "unionSupervisor", status: "pending" }, { status: 202 });
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
    return NextResponse.json({ ok: true, applied: "direct" });
  }

  if (s.role === "entityManager") {
    const rid = uid();
    db.prepare(`
      INSERT INTO entity_requests (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt)
      VALUES (?, 'delete', ?, NULL, 'pending', ?, 'entityManager', 'unionSupervisor', datetime('now'))
    `).run(rid, id, s.id);
    return NextResponse.json({ ok: true, requestId: rid, status: "pending", approverRole: "unionSupervisor" }, { status: 202 });
  }

  return NextResponse.json({ error: "ممنوع الحذف لهذا الدور" }, { status: 403 });
}
