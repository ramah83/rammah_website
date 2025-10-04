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

    let s = (await getSession(req)) as any;
    if (!s) {
      const b64 = req.headers.get("x-session-b64");
      if (b64) {
        try {
          const raw = Buffer.from(b64, "base64").toString("binary");
          s = JSON.parse(decodeURIComponent(escape(raw)));
        } catch (e) {
          console.warn("فشل فك الجلسة من x-session-b64:", e);
        }
      }
    }

    const entityIdParam = req.nextUrl?.searchParams?.get("entityId") || null;

    let scopedEntityId = "";
    if (s?.role === "entityManager") {
      scopedEntityId = String(s?.entityId || "");
    } else if (s?.role === "unionSupervisor") {
      scopedEntityId = entityIdParam ? String(entityIdParam) : "";
    } else if (s?.role === "user") {
      let eid = entityIdParam ? String(entityIdParam) : String(s?.entityId || "");

      if (!eid && s?.id) {
        try {
          const row = db
            .prepare(
              `
                SELECT em.entityId
                FROM entity_members em
                WHERE em.userId = ?
                ORDER BY datetime(em.joinedAt) DESC
                LIMIT 1
              `,
            )
            .get(String(s.id)) as { entityId?: string } | undefined;
          if (row?.entityId) eid = String(row.entityId);
        } catch (e) {
          console.warn("فشل استرجاع entityId من entity_members:", e);
        }
      }

      if (!eid && s?.nationalId) {
        try {
          const row = db
            .prepare(
              `
                SELECT m.entityId
                FROM members m
                WHERE m.nationalId = ?
                ORDER BY datetime(m.joinedAt) DESC
                LIMIT 1
              `,
            )
            .get(String(s.nationalId)) as { entityId?: string } | undefined;
          if (row?.entityId) eid = String(row.entityId);
        } catch (e) {
          console.warn("فشل استرجاع entityId من members:", e);
        }
      }

      if (!eid && s?.email) {
        try {
          const row = db
            .prepare(
              `
                SELECT m.entityId
                FROM members m
                WHERE lower(m.email) = lower(?)
                ORDER BY datetime(m.joinedAt) DESC
                LIMIT 1
              `,
            )
            .get(String(s.email)) as { entityId?: string } | undefined;
          if (row?.entityId) eid = String(row.entityId);
        } catch (e) {
          console.warn("فشل استرجاع entityId من members باستخدام email:", e);
        }
      }

      scopedEntityId = eid || "";
    } else {
      scopedEntityId = entityIdParam ? String(entityIdParam) : "";
    }

    const qMembers = `
      SELECT
        m.id                           AS id,
        COALESCE(m.name, u.name)       AS name,
        COALESCE(m.email, u.email)     AS email,
        COALESCE(m.phone, u.phone)     AS phone,
        m.entityId                     AS entityId,
        m.nationalId                   AS nationalId,
        m.joinedAt                     AS joinedAt,
        u.city                         AS city,
        u.avatar                       AS avatar
      FROM members m
      LEFT JOIN users u ON u.nationalId = m.nationalId
      ${scopedEntityId ? `WHERE m.entityId = ?` : ``}
    `;

    const qLegacy = `
      SELECT
        'm_' || lower(hex(randomblob(8)))         AS id,
        COALESCE(u.name, '—')                     AS name,
        u.email                                   AS email,
        u.phone                                   AS phone,
        em.entityId                               AS entityId,
        u.nationalId                              AS nationalId,
        COALESCE(em.joinedAt, datetime('now'))    AS joinedAt,
        u.city                                    AS city,
        u.avatar                                  AS avatar
      FROM entity_members em
      JOIN users u ON u.id = em.userId
      LEFT JOIN members m2 ON m2.entityId = em.entityId AND m2.nationalId = u.nationalId
      WHERE m2.id IS NULL
      ${scopedEntityId ? `AND em.entityId = ?` : ``}
    `;

    const canSeeAll = s?.role === "unionSupervisor" && !scopedEntityId;

    let rows: any[] = [];
    if (canSeeAll) {
      rows = [...db.prepare(qMembers).all(), ...db.prepare(qLegacy).all()] as any[];
    } else if (scopedEntityId) {
      rows = [...db.prepare(qMembers).all(scopedEntityId), ...db.prepare(qLegacy).all(scopedEntityId)] as any[];
    } else {
      rows = [];
    }

    rows.sort((a, b) => (new Date(b.joinedAt).getTime() || 0) - (new Date(a.joinedAt).getTime() || 0));

    return NextResponse.json(rows, { status: 200 });
  } catch (err: any) {
    console.error("خطأ غير متوقع في GET:", err);
    const res = NextResponse.json([], { status: 200 });
    res.headers.set("x-debug-members-get", String(err?.message || err).slice(0, 200));
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
    } catch (e) {
      console.warn("فشل تحليل JSON من الطلب:", e);
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const name = String(body?.name || "").trim();
    const entityId = String(body?.entityId || "").trim();
    const nationalId = String(body?.nationalId || "").trim();
    const email = toNullEmail(body?.email);
    const phone = body?.phone ? String(body.phone).trim() : null;
    const city = body?.city ? String(body.city).trim() : null;
    const inputPwd = String(body?.password || "");

    if (!name || !entityId) {
      return NextResponse.json({ error: "name و entityId مطلوبان" }, { status: 400 });
    }
    if (!/^\d{14}$/.test(nationalId)) {
      return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });
    }
    if (!inputPwd) {
      return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(inputPwd)) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام" }, { status: 400 });
    }

    if (sess!.role === "entityManager" && String(entityId) !== String(sess!.entityId || "")) {
      return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });
    }

    const entityRow = db.prepare(`SELECT id FROM entities WHERE id = ?`).get(entityId);
    if (!entityRow) {
      return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });
    }

    const existsAny = db.prepare(`SELECT 1 FROM members WHERE nationalId = ? LIMIT 1`).get(nationalId);
    if (existsAny) {
      return NextResponse.json({ error: "هذا العضو مسجّل بالفعل في كيان آخر" }, { status: 409 });
    }

    const dupSameEntity = db.prepare(`SELECT 1 FROM members WHERE entityId = ? AND nationalId = ? LIMIT 1`).get(entityId, nationalId);
    if (dupSameEntity) {
      return NextResponse.json({ error: "يوجد عضو بنفس الرقم القومي داخل هذا الكيان" }, { status: 409 });
    }

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
        do {
          userId = uid();
          console.log(`محاولة إنشاء userId: ${userId}`);
        } while (!isIdUnique(db, "users", userId));
        try {
          db.prepare(
            `INSERT INTO users (id, email, name, role, password, passwordHash, nationalId, phone, city, createdAt)
             VALUES (?, ?, ?, 'user', ?, ?, ?, ?, ?, datetime('now'))`,
          ).run(userId, email, name, inputPwd, hash, nationalId, phone, city);
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (msg.includes("users.email")) throw new Error("E_EMAIL_DUP");
          if (msg.includes("users.nationalId")) throw new Error("E_NID_DUP");
          throw e;
        }
        user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
      } else {
        db.prepare(`UPDATE users SET password = ?, passwordHash = ? WHERE id = ?`).run(inputPwd, hash, user.id);
      }

      let memberId;
      do {
        memberId = uid();
        console.log(`محاولة إنشاء memberId: ${memberId}`);
      } while (!isIdUnique(db, "members", memberId));
      db.prepare(
        `INSERT INTO members (id, name, email, phone, entityId, nationalId, joinedAt)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).run(memberId, name, email, phone, entityId, nationalId);

      let entityMemberId;
      do {
        entityMemberId = uid();
        console.log(`محاولة إنشاء entityMemberId: ${entityMemberId}`);
      } while (!isIdUnique(db, "entity_members", entityMemberId));
      db.prepare(
        `INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
         VALUES (?, ?, ?, datetime('now'))`,
      ).run(entityMemberId, entityId, user.id);

      return db.prepare(`SELECT * FROM members WHERE id = ?`).get(memberId);
    });

    const row = tx();
    return NextResponse.json(row, { status: 201 });

  } catch (error) {
    console.error("خطأ غير متوقع في POST:", error);
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
        "غير مصرح: خارج كيانك": "غير مصرح بإضافة عضو خارج كيانك",
        "الكيان غير موجود": "الكيان غير موجود",
        "هذا العضو مسجّل بالفعل في كيان آخر": "الرقم القومي مستخدم بالفعل",
        "يوجد عضو بنفس الرقم القومي داخل هذا الكيان": "تكرار الرقم القومي في نفس الكيان",
      };
      return NextResponse.json({ error: map[code] || "تعذّر إنشاء حساب المستخدم/العضو" }, { status: 409 });
    }
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}
