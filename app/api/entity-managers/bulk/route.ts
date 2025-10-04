// app/api/entity-managers/bulk/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";
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
function readSessionHeader(req: NextRequest) {
  let s: any = null;
  const b64 = req.headers.get("x-session-b64");
  if (b64) {
    try {
      const raw = Buffer.from(b64, "base64").toString("binary");
      s = JSON.parse(decodeURIComponent(escape(raw)));
    } catch {}
  }
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const sess = (await getSession(req)) || readSessionHeader(req);
    if (!sess || sess.role !== "unionSupervisor") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const db = getDB();
    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const rows: any[] = Array.isArray(payload?.rows) ? payload.rows : [];
    if (!rows.length) return NextResponse.json({ error: "لا توجد صفوف" }, { status: 400 });

    const DEFAULT_PERMS = JSON.stringify([
      "manage:members",
      "view:members",
      "manage:events",
      "view:events",
      "manage:managers",
      "view:managers"
    ]);

    const hasManagers = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_managers'`).get();
    const hasAdmins = !!db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_admins'`).get();

    const runOne = (row: any) => {
      const name = String(row?.name || "").trim();
      const entityId = String(row?.entityId || "").trim();
      const nationalId = String(row?.nationalId || "").trim();
      const email = toNullEmail(row?.email);
      const phone = row?.phone ? String(row.phone).trim() : null;
      const city = row?.city ? String(row.city).trim() : null;
      const inputPwd = String(row?.password || "");

      if (!name || !entityId) throw new Error("E_REQUIRED");
      if (!/^\d{14}$/.test(nationalId)) throw new Error("E_NID");
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(inputPwd)) throw new Error("E_PWD");

      const entityRow = db.prepare(`SELECT id FROM entities WHERE id = ?`).get(entityId);
      if (!entityRow) throw new Error("E_ENTITY");

      let user: any = null;

      if (email) {
        user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
        if (user) {
          if (user.nationalId && user.nationalId !== nationalId) throw new Error("E_EMAIL_OWNED");
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

      let linkId;
      do { linkId = uid(); } while (!isIdUnique(db, hasManagers ? "entity_managers" : "entity_admins", linkId));

      if (hasManagers) {
        db.prepare(
          `INSERT OR IGNORE INTO entity_managers (id, entityId, userId, assignedAt, joinedAt)
           VALUES (?, ?, ?, datetime('now'), datetime('now'))`
        ).run(linkId, entityId, user.id);
      } else if (hasAdmins) {
        db.prepare(
          `INSERT OR IGNORE INTO entity_admins (id, entityId, userId, assignedAt, joinedAt)
           VALUES (?, ?, ?, datetime('now'), datetime('now'))`
        ).run(linkId, entityId, user.id);
      } else {
        db.prepare(`UPDATE users SET entityId = ? WHERE id = ?`).run(entityId, user.id);
      }

      return { ok: true, id: user.id };
    };

    const tx = (db as any).transaction((rows: any[]) => {
      const out: any[] = [];
      for (let i = 0; i < rows.length; i++) {
        try {
          out.push({ index: i, ...runOne(rows[i]) });
        } catch (e: any) {
          const code = String(e?.message || "ERR");
          const map: Record<string, string> = {
            E_REQUIRED: "name و entityId مطلوبان",
            E_NID: "الرقم القومي يجب أن يكون 14 رقمًا",
            E_PWD: "كلمة المرور غير صالحة",
            E_ENTITY: "الكيان غير موجود",
            E_EMAIL_OWNED: "هذا البريد مستخدم لحساب شخص آخر",
            E_EMAIL_CONFLICT: "يتعذّر تغيير البريد لحساب موجود",
            E_EMAIL_DUP: "البريد مسجّل من قبل",
            E_NID_DUP: "هذا الرقم القومي مسجّل بالفعل"
          };
          out.push({ index: i, ok: false, error: map[code] || "فشل الإضافة" });
        }
      }
      return out;
    });

    const results = tx(rows);
    return NextResponse.json({ results }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
