export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

/**
 * GET:
 * - role=entityManager → طلبات موجّهة للمدير (يشمل managerUserId أو entity_managers / entity_admins)
 * - role=unionSupervisor → طلبات موجّهة للمشرف (أو ضمن ccRoles)
 * - scope=mine → طلبات أنشأها المستخدم الحالي
 * - status=pending|approved|rejected|all (افتراضي pending)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session?.id) {
      return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 401 });
    }

    const db = getDB();
    const { searchParams } = new URL(req.url);

    const rawStatus = (searchParams.get("status") || "pending").toLowerCase();
    const status = ["pending", "approved", "rejected", "all"].includes(rawStatus) ? rawStatus : "pending";

    const role = (searchParams.get("role") || "").trim() as "entityManager" | "unionSupervisor" | "";
    const entityIdParam = (searchParams.get("entityId") || "").trim();
    const scope = (searchParams.get("scope") || "").trim(); // "mine" | ""

    const where: string[] = [];
    const params: Record<string, any> = {};

    where.push(`r.action = 'leave_membership'`);

    if (status !== "all") {
      where.push(`r.status = @status`);
      params["@status"] = status;
    }

    if (scope === "mine") {
      where.push(`r.createdBy = @me`);
      params["@me"] = String(session.id);
    } else if (role === "entityManager") {
      params["@me"] = String(session.id);

      // ✅ يحق للمستخدم رؤية الطلبات لو:
      // 1) هو managerUserId على الكيان
      // 2) أو موجود في جدول entity_managers لهذا الكيان
      // 3) أو موجود في جدول entity_admins (لو بتديهم نفس صلاحية الاعتماد)
      where.push(`
        (
          EXISTS (SELECT 1 FROM entities e WHERE e.id = r.targetEntityId AND e.managerUserId = @me)
          OR EXISTS (SELECT 1 FROM entity_managers emg WHERE emg.entityId = r.targetEntityId AND emg.userId = @me)
          OR EXISTS (SELECT 1 FROM entity_admins   ea  WHERE ea.entityId  = r.targetEntityId AND ea.userId  = @me)
        )
      `);

      // الطلب لازم يكون موجَّه للمدير أو فيه cc للمدير
      where.push(`
        (
          r.approverRole = 'entityManager'
          OR EXISTS (
            SELECT 1
            FROM json_each(json_extract(r.payload, '$.ccRoles')) AS je
            WHERE je.value = 'entityManager'
          )
        )
      `);

      if (entityIdParam) {
        where.push(`r.targetEntityId = @entityId`);
        params["@entityId"] = entityIdParam;
      }
    } else if (role === "unionSupervisor") {
      // الطلب موجّه للمشرف أو فيه cc للمشرف
      where.push(`
        (
          r.approverRole = 'unionSupervisor'
          OR EXISTS (
            SELECT 1
            FROM json_each(json_extract(r.payload, '$.ccRoles')) AS je
            WHERE je.value = 'unionSupervisor'
          )
        )
      `);
      // (ممكن تضيف فلترة إضافية هنا لو محتاج)
    } else {
      // بدون role وبدون scope=mine → لا شيء
      return NextResponse.json([]);
    }

    const sql = `
      SELECT
        r.id,
        r.action,
        r.targetEntityId,
        e.name AS entityName,
        r.payload,
        r.status,
        r.createdBy,
        u.name AS createdByName,
        u.email AS createdByEmail,
        r.approverRole,
        r.createdAt,
        r.note
      FROM entity_requests r
      LEFT JOIN entities e ON e.id = r.targetEntityId
      LEFT JOIN users    u ON u.id = r.createdBy
      WHERE ${where.join(" AND ")}
      ORDER BY r.createdAt DESC
      LIMIT 500
    `;

    const rows = db.prepare(sql).all(params) as any[];
    const mapped = rows.map((r) => {
      let payload: any = {};
      try { payload = JSON.parse(r.payload || "{}"); } catch {}
      return {
        id: String(r.id),
        action: String(r.action),
        targetEntityId: String(r.targetEntityId || ""),
        entityName: r.entityName || null,
        payload,
        status: String(r.status || "pending"),
        createdBy: String(r.createdBy || ""),
        userName: r.createdByName || null,
        userEmail: r.createdByEmail || null,
        approverRole: String(r.approverRole || ""),
        createdAt: String(r.createdAt || new Date().toISOString()),
        note: r.note ?? null,
      };
    });

    return NextResponse.json(mapped);
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "خطأ غير متوقع" }, { status: 500 });
  }
}

/* PATCH نفس الكود اللي عندك بدون تغيير */


export async function PATCH(req: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  let body: any = {};
  try { body = await req.json(); } catch {}
  const rid = String(body?.id || "");
  const decision = String(body?.decision || "");
  const note = (typeof body?.note === "string" ? body.note.trim() : "") || null;

  const reqRow = db.prepare(`SELECT * FROM entity_requests WHERE id=?`).get(rid) as any;
  if (!reqRow || reqRow.status !== "pending") {
    return NextResponse.json({ error: "الطلب غير موجود أو غير مُعلّق" }, { status: 404 });
  }

  if (reqRow.approverRole === "entityManager" && s.role !== "entityManager") {
    return NextResponse.json({ error: "غير مصرح لمدير الكيان فقط" }, { status: 403 });
  }
  if (reqRow.approverRole === "unionSupervisor" && s.role !== "unionSupervisor") {
    return NextResponse.json({ error: "غير مصرح لمسؤول الاتحاد فقط" }, { status: 403 });
  }

  if (!["approve", "reject"].includes(decision)) {
    return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });
  }

  const action = String(reqRow.action) as "create" | "update" | "delete" | "leave_membership";
  const payload = reqRow.payload
    ? (typeof reqRow.payload === "string" ? JSON.parse(reqRow.payload) : reqRow.payload)
    : null;

  if (decision === "reject") {
    db.prepare(
      `UPDATE entity_requests
          SET status='rejected', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note, ?)
        WHERE id=?`
    ).run(s.id, note, rid);

    if (action === "leave_membership" && reqRow.targetEntityId) {
      db.prepare(`
        INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
        VALUES (?, ?, 'leave_rejected', NULL, NULL, ?, ?, ?, ?, datetime('now'))
      `).run(uid(), String(reqRow.targetEntityId), note, s.id, s.name || s.email || "مستخدم", s.role);
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  try {
    if (action === "leave_membership") {
      const entityId = String(reqRow.targetEntityId || "");
      const userId   = String(payload?.userId || "");
      if (!entityId || !userId) throw new Error("بيانات طلب المغادرة غير مكتملة");

      if (reqRow.approverRole === "entityManager") {
        db.prepare(`
          UPDATE entity_requests
             SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note, ?)
           WHERE id=?
        `).run(s.id, note, rid);

        const newRid = uid();
        db.prepare(`
          INSERT INTO entity_requests
            (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt, note)
          VALUES
            (?, 'leave_membership', ?, json(?), 'pending', ?, 'user', 'unionSupervisor', datetime('now'), ?)
        `).run(
          newRid,
          entityId,
          JSON.stringify({ userId, reason: payload?.reason || reqRow.note || note || null }),
          userId,
          note
        );

        db.prepare(`
          INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
          VALUES (?, ?, 'leave_escalated', NULL, NULL, ?, ?, ?, 'entityManager', datetime('now'))
        `).run(uid(), entityId, note, s.id, s.name || s.email || "مستخدم");

        return NextResponse.json({ ok: true, status: "manager_approved", escalatedTo: "unionSupervisor", newRequestId: newRid });
      }

      if (reqRow.approverRole === "unionSupervisor") {
        const tx = db.transaction(() => {
          db.prepare(`DELETE FROM entity_members WHERE entityId=? AND userId=?`).run(entityId, userId);

          db.prepare(`
            UPDATE join_requests
               SET status = 'left',
                   decidedAt = datetime('now'),
                   decidedBy = COALESCE(decidedBy, 'system'),
                   note = COALESCE(note, '') || CASE WHEN note IS NULL OR note = '' THEN '' ELSE ' | ' END || 'left via approved leave request'
             WHERE userId = ? AND entityId = ? AND status = 'approved'
          `).run(userId, entityId);

          db.prepare(`
            UPDATE entity_requests
               SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note, ?)
             WHERE id=?
          `).run(s.id, note, rid);

          db.prepare(`
            INSERT INTO membership_events (id, userId, entityId, entityName, type, createdAt, meta)
            VALUES (
              ?, ?, ?, COALESCE((SELECT name FROM entities WHERE id=?), ?),
              'left', datetime('now'), json(?)
            )
          `).run(
            uid(),
            userId,
            entityId,
            entityId,
            String(entityId),
            JSON.stringify({ reason: payload?.reason || reqRow.note || note || null })
          );

          db.prepare(`
            INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
            VALUES (?, ?, 'member_left', NULL, NULL, ?, ?, ?, 'unionSupervisor', datetime('now'))
          `).run(uid(), entityId, note, s.id, s.name || s.email || "مستخدم");
        });
        tx();

        return NextResponse.json({ ok: true, status: "approved_and_left" });
      }
    }

    if (s.role !== "unionSupervisor") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    return NextResponse.json({ ok: false, error: "أكشن غير مدعوم" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تطبيق القرار" }, { status: 500 });
  }
}
