export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "unionSupervisor") return NextResponse.json([], { status: 200 });

  const db = getDB();
  const { searchParams } = new URL(req.url);
  const statusParam = (searchParams.get("status") || "").trim();
  let whereStatus = `AND r.status = 'pending'`;
  const params: any[] = [];
  if (statusParam === "all") whereStatus = "";
  else if (statusParam && ["pending", "approved", "rejected"].includes(statusParam)) {
    whereStatus = `AND r.status = ?`;
    params.push(statusParam);
  }

  const rows = db
    .prepare(
      `
      SELECT r.*, u.name AS createdByName, u.email AS createdByEmail
        FROM entity_requests r
        LEFT JOIN users u ON u.id = r.createdBy
       WHERE r.approverRole='unionSupervisor'
         ${whereStatus}
       ORDER BY datetime(r.createdAt) ASC
    `
    )
    .all(...params);

  return NextResponse.json(rows ?? []);
}

export async function PATCH(req: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (s.role !== "unionSupervisor") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  const db = getDB();
  let body: any = {};
  try { body = await req.json(); } catch {}
  const rid = String(body?.id || "");
  const decision = String(body?.decision || "");
  const note = String(body?.note || "") || null;

  const reqRow = db.prepare(`SELECT * FROM entity_requests WHERE id=?`).get(rid) as any;
  if (!reqRow || reqRow.status !== "pending") {
    return NextResponse.json({ error: "الطلب غير موجود أو غير مُعلّق" }, { status: 404 });
  }
  if (reqRow.approverRole !== "unionSupervisor") {
    return NextResponse.json({ error: "هذا الطلب ليس ضمن صلاحيات مسؤول الاتحاد" }, { status: 403 });
  }

  if (decision === "reject") {
    db.prepare(
      `UPDATE entity_requests SET status='rejected', decidedAt=datetime('now'), decidedBy=?, note=? WHERE id=?`
    ).run(s.id, note, rid);
    return NextResponse.json({ ok: true, status: "rejected" });
  }
  if (decision !== "approve") {
    return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
  }

  const action = reqRow.action as "create" | "update" | "delete";
  const payload = reqRow.payload ? JSON.parse(reqRow.payload) : null;

  try {
    if (action === "create") {
      const newId = uid();
      db.prepare(
        `
        INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, createdAt, createdBy, managerUserId, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'approved')
      `
      ).run(
        newId,
        String(payload?.name || ""),
        payload?.type || null,
        payload?.contactEmail || null,
        payload?.phone || null,
        payload?.location || null,
        JSON.stringify(Array.isArray(payload?.documents) ? payload.documents : []),
        reqRow.createdBy,
        payload?.managerUserId || null
      );

      if (payload?.managerUserId) {
        db.prepare(
          `
          INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
          VALUES (?, ?, ?, datetime('now'))
        `
        ).run(uid(), newId, payload.managerUserId);
      }
    } else if (action === "update") {
      const id = String(reqRow.targetEntityId || "");
      if (!id) throw new Error("targetEntityId مفقود");
      const current = db.prepare(`SELECT * FROM entities WHERE id=?`).get(id) as any;
      if (!current) throw new Error("الكيان غير موجود");

      const docs =
        payload?.documents !== undefined
          ? JSON.stringify(Array.isArray(payload?.documents) ? payload.documents : [])
          : current.documents;

      db.prepare(
        `
        UPDATE entities
           SET name = COALESCE(?, name),
               type = COALESCE(?, type),
               contactEmail = COALESCE(?, contactEmail),
               phone = COALESCE(?, phone),
               location = COALESCE(?, location),
               documents = COALESCE(?, documents),
               managerUserId = COALESCE(?, managerUserId)
         WHERE id=?
      `
      ).run(
        payload?.name ?? null,
        payload?.type ?? null,
        payload?.contactEmail ?? null,
        payload?.phone ?? null,
        payload?.location ?? null,
        payload?.documents !== undefined ? docs : null,
        payload?.managerUserId ?? null,
        id
      );

      if (payload?.managerUserId) {
        db.prepare(
          `
          INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
          VALUES (?, ?, ?, datetime('now'))
        `
        ).run(uid(), id, payload.managerUserId);
      }
    } else if (action === "delete") {
      const id = String(reqRow.targetEntityId || "");
      if (!id) throw new Error("targetEntityId مفقود");
      db.prepare(`DELETE FROM entities WHERE id=?`).run(id);
      db.prepare(`DELETE FROM entity_members WHERE entityId=?`).run(id);
    }

    db.prepare(
      `
      UPDATE entity_requests
         SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=?
       WHERE id=?
    `
    ).run(s.id, note, rid);

    return NextResponse.json({ ok: true, status: "approved" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تطبيق القرار" }, { status: 500 });
  }
}
