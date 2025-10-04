// app/api/entity-managers/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, ensureRole } from "@/lib/server/session";
import bcrypt from "bcryptjs";

function toNullEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (!s || !s.includes("@") || s.length < 5) return null;
  return s;
}
function isIdUnique(db: any, table: string, id: string): boolean {
  const check = db.prepare(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`).get(id);
  return !check;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDB();
    const s = await getSession(req);

    const paramEntityId = req.nextUrl.searchParams.get("entityId") || null;
    const scopedEntityId =
      s?.role === "entityManager" ? String(s?.entityId || "") : paramEntityId ? String(paramEntityId) : "";

    const hasManagers = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_managers'`).get();
    const hasAdmins   = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_admins'`).get();

    const rows: any[] = [];

    if (hasManagers) {
      const sql = `
        SELECT
          u.id                                AS id,
          u.name                              AS name,
          u.email                             AS email,
          u.phone                             AS phone,
          em.entityId                         AS entityId,
          'entityManager'                     AS role,
          COALESCE(em.joinedAt, em.assignedAt, u.createdAt) AS joinedAt,
          u.city                              AS city,
          u.avatar                            AS avatar,
          u.nationalId                        AS nationalId
        FROM entity_managers em
        JOIN users u ON u.id = em.userId
        ${scopedEntityId ? `WHERE em.entityId = ?` : ``}
      `;
      const part = scopedEntityId ? db.prepare(sql).all(scopedEntityId) : db.prepare(sql).all();
      rows.push(...part);
    }

    if (hasAdmins) {
      const sql = `
        SELECT
          u.id                                AS id,
          u.name                              AS name,
          u.email                             AS email,
          u.phone                             AS phone,
          ea.entityId                         AS entityId,
          'entityManager'                     AS role,
          COALESCE(ea.joinedAt, ea.assignedAt, u.createdAt) AS joinedAt,
          u.city                              AS city,
          u.avatar                            AS avatar,
          u.nationalId                        AS nationalId
        FROM entity_admins ea
        JOIN users u ON u.id = ea.userId
        ${scopedEntityId ? `WHERE ea.entityId = ?` : ``}
      `;
      const part = scopedEntityId ? db.prepare(sql).all(scopedEntityId) : db.prepare(sql).all();
      rows.push(...part);
    }

    if (!hasManagers && !hasAdmins) {
      const sql = `
        SELECT
          u.id            AS id,
          u.name          AS name,
          u.email         AS email,
          u.phone         AS phone,
          ${scopedEntityId ? `?` : `u.entityId`} AS entityId,
          'entityManager' AS role,
          u.createdAt     AS joinedAt,
          u.city          AS city,
          u.avatar        AS avatar,
          u.nationalId    AS nationalId
        FROM users u
        WHERE u.role = 'entityManager'
        ${scopedEntityId ? `AND u.entityId = ?` : ``}
      `;
      const part = scopedEntityId
        ? db.prepare(sql).all(scopedEntityId, scopedEntityId)
        : db.prepare(sql).all();
      rows.push(...part);
    }

    const seen = new Set<string>();
    const deduped = rows.filter((r) => {
      const k = `${r.id}::${r.entityId || ""}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    let finalRows = deduped;

    if (s?.role === "entityManager") {
      finalRows = finalRows.filter((r) => String(r.entityId || "") === String(s.entityId || ""));
    }

    finalRows.sort((a, b) => new Date(b.joinedAt || 0).getTime() - new Date(a.joinedAt || 0).getTime());
    return NextResponse.json(finalRows, { status: 200 });
  } catch (err: any) {
    const res = NextResponse.json([], { status: 200 });
    res.headers.set("x-debug-entity-managers-get", String(err?.message || err).slice(0, 200));
    return res;
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
    if (guard) return guard;

    const sess = await getSession(req);
    const db = getDB();

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const name = String(body?.name || "").trim();
    const entityId = String(body?.entityId || "").trim();
    const nationalId = String(body?.nationalId || "").trim();
    const email = toNullEmail(body?.email);
    const phone = body?.phone ? String(body.phone).trim() : null;
    const city = body?.city ? String(body.city).trim() : null;
    const inputPwd = String(body?.password || "");

    if (!name || !entityId) return NextResponse.json({ error: "name و entityId مطلوبان" }, { status: 400 });
    if (!/^\d{14}$/.test(nationalId)) return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });
    if (!inputPwd) return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(inputPwd))
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام" }, { status: 400 });

    if (sess!.role === "entityManager" && String(entityId) !== String(sess!.entityId || ""))
      return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });

    const entityRow = db.prepare(`SELECT id FROM entities WHERE id = ?`).get(entityId);
    if (!entityRow) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });

    const DEFAULT_PERMS = JSON.stringify([
      "manage:members",
      "view:members",
      "manage:events",
      "view:events",
      "manage:managers",
      "view:managers"
    ]);

    const hasManagers = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_managers'`).get();
    const hasAdmins   = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_admins'`).get();

    const tx = (db as any).transaction(() => {
      let user: any = null;

      if (email) {
        user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
        if (user) {
          if (user.nationalId && user.nationalId !== nationalId) throw new Error("E_EMAIL_OWNED_BY_OTHER");
          db.prepare(`UPDATE users SET name = ?, phone = ?, nationalId = ?, city = COALESCE(?, city) WHERE id = ?`)
            .run(name, phone, nationalId, city, user.id);
        }
      }

      if (!user) {
        user = db.prepare(`SELECT * FROM users WHERE nationalId = ?`).get(nationalId);
        if (user) {
          if (email && user.email && user.email !== email) throw new Error("E_EMAIL_CONFLICT");
          if (email && !user.email) {
            db.prepare(`UPDATE users SET name = ?, email = ?, phone = ?, nationalId = ?, city = COALESCE(?, city) WHERE id = ?`)
              .run(name, email, phone, nationalId, city, user.id);
          } else {
            db.prepare(`UPDATE users SET name = ?, phone = ?, nationalId = ?, city = COALESCE(?, city) WHERE id = ?`)
              .run(name, phone, nationalId, city, user.id);
          }
        }
      }

      const hash = bcrypt.hashSync(inputPwd, 10);

      if (!user) {
        let userId;
        do { userId = uid(); } while (!isIdUnique(db, "users", userId));
        try {
          db.prepare(
            `INSERT INTO users (id, email, name, role, password, passwordHash, nationalId, phone, city, entityId, permissions, createdAt)
             VALUES (?, ?, ?, 'entityManager', ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).run(userId, email, name, inputPwd, hash, nationalId, phone, city, entityId, DEFAULT_PERMS);
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (msg.includes("users.email")) throw new Error("E_EMAIL_DUP");
          if (msg.includes("users.nationalId")) throw new Error("E_NID_DUP");
          throw e;
        }
        user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
      } else {
        const newRole = user.role === "admin" ? "admin" : "entityManager";
        db.prepare(`UPDATE users SET password = ?, passwordHash = ?, role = ?, entityId = ?, permissions = COALESCE(permissions, ?) WHERE id = ?`)
          .run(inputPwd, hash, newRole, entityId, DEFAULT_PERMS, user.id);
      }

      const table = hasManagers ? "entity_managers" : hasAdmins ? "entity_admins" : null;

      if (table) {
        let linkId;
        do { linkId = uid(); } while (!isIdUnique(db, table, linkId));
        const sql =
          table === "entity_managers"
            ? `INSERT OR IGNORE INTO entity_managers (id, entityId, userId, assignedAt, joinedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`
            : `INSERT OR IGNORE INTO entity_admins (id, entityId, userId, assignedAt, joinedAt) VALUES (?, ?, ?, datetime('now'), datetime('now'))`;
        db.prepare(sql).run(linkId, entityId, user.id);
      }

      return { id: user.id, entityId };
    });

    const row = tx();
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const code = String(error.message || "");
      const map: Record<string, string> = {
        E_EMAIL_OWNED_BY_OTHER: "هذا البريد مستخدم لحساب شخص آخر",
        E_EMAIL_CONFLICT: "يتعذّر تغيير البريد لحساب موجود",
        E_EMAIL_DUP: "البريد مسجّل من قبل",
        E_NID_DUP: "هذا الرقم القومي مسجّل بالفعل",
        "name و entityId مطلوبان": "يجب توفير name و entityId",
        "الرقم القومي يجب أن يكون 14 رقمًا": "الرقم القومي غير صالح",
        "كلمة المرور مطلوبة": "كلمة المرور غير موجودة",
        "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام": "كلمة المرور غير صالحة",
        "غير مصرح: خارج كيانك": "غير مصرح بإضافة مدير خارج كيانك",
        "الكيان غير موجود": "الكيان غير موجود"
      };
      return NextResponse.json({ error: map[code] || "فشل الإضافة" }, { status: 409 });
    }
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
