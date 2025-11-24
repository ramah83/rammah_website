export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, fromBase64Any, toCoreRole } from "@/lib/server/session";

type Sess = {
  id: string;
  role: "user" | "entityManager" | "unionSupervisor";
  entityId?: string | null;
  name?: string | null;
  email?: string | null;
};

async function readSession(req: NextRequest): Promise<Sess | null> {
  // Prefer normalized session via server util
  try {
    const s = (await getSession(req)) as any;
    if (s?.id) {
      return {
        id: String(s.id),
        role: toCoreRole(s.role) as Sess["role"],
        entityId: s.entityId ?? null,
        name: s.name ?? null,
        email: s.email ?? null,
      };
    }
  } catch {}

  // Fallback: header (base64url)
  const b64 = req.headers.get("x-session-b64") || "";
  if (b64) {
    try {
      const json = fromBase64Any(b64);
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === "object" && parsed.id) {
        const role = toCoreRole(parsed.role);
        return {
          id: String(parsed.id),
          role: role as Sess["role"],
          entityId: parsed.entityId ?? null,
          name: parsed.name ?? null,
          email: parsed.email ?? null,
        };
      }
    } catch {}
  }
  return null;
}

/* ===================== GET: list leave requests =====================

  ✅ التعديل:
  - unionSupervisor: يعرض كل طلبات المغادرة
  - entityManager: يعرض فقط طلبات المغادرة من الكيانات التي يديرها
*/
export async function GET(req: NextRequest) {
  const session = await readSession(req);
  if (!session?.id) {
    return NextResponse.json({ ok: false, error: "غير مصرح" }, { status: 401 });
  }

  const db = getDB();
  const { searchParams } = new URL(req.url);

  const rawStatus = (searchParams.get("status") || "all").toLowerCase();
  const status: "pending" | "approved" | "rejected" | "all" =
    (["pending", "approved", "rejected", "all"].includes(rawStatus) ? rawStatus : "all") as any;

  const scope = (searchParams.get("scope") || "").toLowerCase();

  // ✅ عرض كل أنواع الطلبات: create, update, delete, leave_membership
  const where: string[] = [];
  const params: Record<string, any> = {};

  if (status !== "all") {
    where.push(`r.status=@status`);
    params["@status"] = status;
  }

  // إذا كان scope=mine، المستخدم يريد رؤية طلباته فقط
  if (scope === "mine") {
    where.push(`r.createdBy=@userId`);
    params["@userId"] = session.id;
  }

  // إذا كان scope=mine، لا نحتاج لفلترة حسب الدور
  if (scope === "mine") {
    // المستخدم يريد رؤية طلباته فقط - تم إضافة الشرط بالفعل في where
  }
  // ✅ مسؤول الاتحاد: يرى كل الطلبات
  else if (session.role === "unionSupervisor") {
    // لا نضيف أي شرط إضافي، يرى كل شيء
    const entityIdParam = (searchParams.get("entityId") || "").trim();
    if (entityIdParam) {
      params["@entityId"] = entityIdParam;
      where.push(`r.targetEntityId=@entityId`);
    }
  }
  // ✅ مدير الكيان: يرى طلبات كياناته + طلباته الشخصية (مثل إنشاء كيان جديد)
  else if (session.role === "entityManager") {
    const userId = session.id;
    
    // أولاً: جرب استخدام entityId من الـ session مباشرة
    const sessionEntityId = session.entityId ? String(session.entityId) : null;
    
    // جلب الكيانات التي يديرها هذا المدير
    const managedEntities = db.prepare(`
      SELECT DISTINCT entityId FROM (
        SELECT id AS entityId FROM entities WHERE managerUserId = ?
        UNION
        SELECT entityId FROM entity_managers WHERE userId = ?
        UNION
        SELECT entityId FROM entity_admins WHERE userId = ?
      )
    `).all(userId, userId, userId) as { entityId: string }[];

    // لو في entityId في الـ session، استخدمه
    if (sessionEntityId) {
      managedEntities.push({ entityId: sessionEntityId });
    }

    // إزالة التكرار
    const uniqueEntityIds = Array.from(new Set(managedEntities.map(e => e.entityId)));
    
    if (uniqueEntityIds.length === 0) {
      // لا يدير أي كيان، يرى فقط طلباته الشخصية (مثل إنشاء كيان جديد)
      where.push(`r.createdBy=@userId`);
      params["@userId"] = userId;
    } else {
      // يرى طلبات كياناته + طلباته الشخصية
      const placeholders = uniqueEntityIds.map((_, i) => `@eid${i}`).join(',');
      
      uniqueEntityIds.forEach((eid, i) => {
        params[`@eid${i}`] = eid;
      });

      where.push(`(r.targetEntityId IN (${placeholders}) OR r.createdBy=@userId)`);
      params["@userId"] = userId;
    }
  } 
  // المستخدم العادي: لا يرى شيئًا هنا
  else {
    return NextResponse.json([]);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  
  const sql = `
    SELECT
      r.id,
      r.action,
      r.targetEntityId,
      COALESCE(
        e.name,
        json_extract(r.payload,'$.name'),
        (SELECT name FROM entities ee WHERE ee.id = json_extract(r.payload,'$.entityId')),
        NULL
      ) AS entityName,
      r.payload,
      r.status,
      r.createdBy,
      u.name  AS createdByName,
      u.email AS createdByEmail,
      r.approverRole,
      r.createdAt,
      r.note
    FROM entity_requests r
    LEFT JOIN entities e ON e.id = r.targetEntityId
    LEFT JOIN users u    ON u.id = r.createdBy
    ${whereClause}
    ORDER BY r.createdAt DESC
    LIMIT 500
  `;

  const rows = db.prepare(sql).all(params) as any[];
  const mapped = rows.map((r) => {
    let payload: any = {};
    try {
      payload = JSON.parse(r.payload || "{}");
    } catch {}
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
}

/* ===================== POST: create leave request ===================== */
export async function POST(req: NextRequest) {
  const s = await readSession(req);
  if (!s?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const reason: string | null = (typeof body?.reason === "string" ? body.reason.trim() : "") || null;

  if (s.role !== "user") {
    return NextResponse.json({ error: "فقط المستخدم العادي يمكنه طلب مغادرة" }, { status: 403 });
  }

  const mem = db
    .prepare(
      `
    SELECT em.entityId, e.name AS entityName
      FROM entity_members em
      LEFT JOIN entities e ON e.id = em.entityId
     WHERE em.userId = ?
     LIMIT 1
  `
    )
    .get(s.id) as { entityId?: string; entityName?: string } | undefined;

  if (!mem?.entityId) {
    return NextResponse.json({ error: "أنت غير منضم لأي كيان" }, { status: 409 });
  }

  const entityId = String(mem.entityId);

  const exists = db
    .prepare(
      `
    SELECT 1 AS ok FROM entity_requests
     WHERE action='leave_membership'
       AND status='pending'
       AND createdBy=? AND targetEntityId=?
     LIMIT 1
  `
    )
    .get(s.id, entityId) as any;

  if (exists?.ok) {
    return NextResponse.json({ error: "لديك طلب مغادرة قيد المراجعة لهذا الكيان" }, { status: 409 });
  }

  const rid = uid();
  const payload = {
    userId: s.id,
    entityId,
    reason,
    ccRoles: ["unionSupervisor", "entityManager"],
  };

  db.prepare(
    `
    INSERT INTO entity_requests
      (id, action, targetEntityId, payload, status, createdBy, createdByRole, approverRole, createdAt)
    VALUES
      (?, 'leave_membership', ?, ?, 'pending', ?, ?, 'entityManager', datetime('now'))
  `
  ).run(rid, entityId, JSON.stringify(payload), s.id, s.role);

  try {
    db.prepare(
      `
      INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
      VALUES (?, ?, 'leave_requested', NULL, NULL, ?, ?, ?, ?, datetime('now'))
    `
    ).run(uid(), entityId, reason, s.id, s.name || s.email || "مستخدم", s.role);
  } catch {}

  return NextResponse.json(
    {
      ok: true,
      status: "pending",
      approverRole: "entityManager",
      requestId: rid,
      message: "تم إرسال طلب المغادرة. في انتظار موافقة مدير الكيان أو مسؤول الاتحاد.",
    },
    { status: 202 }
  );
}

/* ===================== PATCH: decide (approve / reject) =====================

   لم يتم تغيير منطق الصلاحيات:
   - unionSupervisor: مسموح دائمًا
   - entityManager: فقط للكيانات التي يديرها/مسجّل كمدير/أدمن فيها
*/
export async function PATCH(req: NextRequest) {
  const s = await readSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const rid = String(body?.id || "");
  const decision = String(body?.decision || "");
  const note = (typeof body?.note === "string" ? body.note.trim() : "") || null;

  const reqRow = db.prepare(`SELECT * FROM entity_requests WHERE id=?`).get(rid) as any;
  if (!reqRow || reqRow.status !== "pending")
    return NextResponse.json({ error: "الطلب غير موجود أو غير مُعلّق" }, { status: 404 });
  if (!["approve", "reject"].includes(decision))
    return NextResponse.json({ error: "قرار غير معروف" }, { status: 400 });

  const action = String(reqRow.action);
  const payload =
    reqRow.payload ? (typeof reqRow.payload === "string" ? JSON.parse(reqRow.payload) : reqRow.payload) : null;

  let authorized = false;
  if (s.role === "unionSupervisor") authorized = true;
  else if (s.role === "entityManager") {
    const me = String(s.id);
    const entityId = String(reqRow.targetEntityId || "");
    if (entityId) {
      const row = db
        .prepare(
          `
        SELECT 1 ok
        WHERE EXISTS (SELECT 1 FROM entities e         WHERE e.id=? AND e.managerUserId=?)
           OR EXISTS (SELECT 1 FROM entity_managers emg WHERE emg.entityId=? AND emg.userId=?)
           OR EXISTS (SELECT 1 FROM entity_admins  ea  WHERE ea.entityId=? AND ea.userId=?)
      `
        )
        .get(entityId, me, entityId, me, entityId, me) as any;
      authorized = !!row?.ok;
    }
  }
  if (!authorized) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

  if (decision === "reject") {
    db.prepare(
      `
      UPDATE entity_requests
         SET status='rejected', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note,?)
       WHERE id=?
    `
    ).run(s.id, note, rid);

    if (action === "leave_membership" && reqRow.targetEntityId) {
      db.prepare(
        `
        INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
        VALUES (?, ?, 'leave_rejected', NULL, NULL, ?, ?, ?, ?, datetime('now'))
      `
      ).run(uid(), String(reqRow.targetEntityId), note, s.id, s.name || s.email || "مستخدم", s.role || "unknown");
    }
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  try {
    // ✅ Handle create entity request
    if (action === "create") {
      if (!payload || !payload.name) {
        throw new Error("بيانات الكيان غير مكتملة");
      }

      const newEntityId = uid();
      const tx = db.transaction(() => {
        // Create the entity
        db.prepare(`
          INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, managerUserId, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          newEntityId,
          payload.name || "",
          payload.type || "",
          payload.contactEmail || null,
          payload.phone || null,
          payload.location || null,
          JSON.stringify(payload.documents || []),
          reqRow.createdBy
        );

        // Update request status
        db.prepare(`
          UPDATE entity_requests
          SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note,?)
          WHERE id=?
        `).run(s.id, note, rid);

        // Log event
        db.prepare(`
          INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
          VALUES (?, ?, 'created', NULL, 'active', ?, ?, ?, ?, datetime('now'))
        `).run(uid(), newEntityId, note, s.id, s.name || s.email || "مستخدم", s.role || "unknown");
      });
      tx();

      return NextResponse.json({ ok: true, status: "approved", entityId: newEntityId });
    }

    // ✅ Handle update entity request
    if (action === "update") {
      const entityId = String(reqRow.targetEntityId || "");
      if (!entityId || !payload) {
        throw new Error("بيانات التحديث غير مكتملة");
      }

      const tx = db.transaction(() => {
        // Update entity fields
        const updates: string[] = [];
        const values: any[] = [];
        
        if (payload.name) { updates.push("name=?"); values.push(payload.name); }
        if (payload.type) { updates.push("type=?"); values.push(payload.type); }
        if (payload.contactEmail !== undefined) { updates.push("contactEmail=?"); values.push(payload.contactEmail); }
        if (payload.phone !== undefined) { updates.push("phone=?"); values.push(payload.phone); }
        if (payload.location !== undefined) { updates.push("location=?"); values.push(payload.location); }
        if (payload.documents) { updates.push("documents=?"); values.push(JSON.stringify(payload.documents)); }

        if (updates.length > 0) {
          values.push(entityId);
          db.prepare(`UPDATE entities SET ${updates.join(", ")} WHERE id=?`).run(...values);
        }

        // Update request status
        db.prepare(`
          UPDATE entity_requests
          SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note,?)
          WHERE id=?
        `).run(s.id, note, rid);

        // Log event
        db.prepare(`
          INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
          VALUES (?, ?, 'updated', NULL, NULL, ?, ?, ?, ?, datetime('now'))
        `).run(uid(), entityId, note, s.id, s.name || s.email || "مستخدم", s.role || "unknown");
      });
      tx();

      return NextResponse.json({ ok: true, status: "approved" });
    }

    // ✅ Handle delete entity request
    if (action === "delete") {
      const entityId = String(reqRow.targetEntityId || "");
      if (!entityId) {
        throw new Error("معرف الكيان غير موجود");
      }

      const tx = db.transaction(() => {
        // Soft delete: mark as deleted or remove
        db.prepare(`DELETE FROM entities WHERE id=?`).run(entityId);

        // Update request status
        db.prepare(`
          UPDATE entity_requests
          SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note,?)
          WHERE id=?
        `).run(s.id, note, rid);

        // Log event
        db.prepare(`
          INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
          VALUES (?, ?, 'deleted', NULL, NULL, ?, ?, ?, ?, datetime('now'))
        `).run(uid(), entityId, note, s.id, s.name || s.email || "مستخدم", s.role || "unknown");
      });
      tx();

      return NextResponse.json({ ok: true, status: "approved" });
    }

    // ✅ Handle leave_membership request
    if (action !== "leave_membership")
      return NextResponse.json({ error: "أكشن غير مدعوم" }, { status: 400 });

    const entityId = String(reqRow.targetEntityId || "");
    const userId = String(payload?.userId || "");
    if (!entityId || !userId) throw new Error("بيانات طلب المغادرة غير مكتملة");

    const actorRole = s.role === "unionSupervisor" ? "unionSupervisor" : "entityManager";

    const tx = db.transaction(() => {
      db.prepare(`DELETE FROM entity_members WHERE entityId=? AND userId=?`).run(entityId, userId);

      db.prepare(
        `
        UPDATE join_requests
           SET status='left', decidedAt=datetime('now'),
               decidedBy=COALESCE(decidedBy,'system'),
               note = COALESCE(note,'') || CASE WHEN note IS NULL OR note='' THEN '' ELSE ' | ' END || 'left via approved leave request'
         WHERE userId=? AND entityId=? AND status='approved'
      `
      ).run(userId, entityId);

      db.prepare(
        `
        UPDATE entity_requests
           SET status='approved', decidedAt=datetime('now'), decidedBy=?, note=COALESCE(note,?)
         WHERE id=?
      `
      ).run(s.id, note, rid);

      db.prepare(
        `
        INSERT INTO membership_events (id, userId, entityId, entityName, type, createdAt, meta)
        VALUES (?, ?, ?, COALESCE((SELECT name FROM entities WHERE id=?), ?), 'left', datetime('now'), json(?))
      `
      ).run(
        uid(),
        userId,
        entityId,
        entityId,
        String(entityId),
        JSON.stringify({ reason: payload?.reason || reqRow.note || note || null })
      );

      db.prepare(
        `
        INSERT INTO entity_events (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
        VALUES (?, ?, 'member_left', NULL, NULL, ?, ?, ?, ?, datetime('now'))
      `
      ).run(uid(), entityId, note, s.id, s.name || s.email || "مستخدم", actorRole);
    });
    tx();

    return NextResponse.json({ ok: true, status: "approved_and_left" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "تعذر تطبيق القرار" }, { status: 500 });
  }
}