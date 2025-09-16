export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, ensureRole } from "@/lib/server/session";
import bcrypt from "bcryptjs";

/** اعتبر البريد غير الصالح NULL */
function toNullEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (!s || !s.includes("@") || s.length < 5) return null;
  return s;
}

export async function GET(req: NextRequest) {
  const db = getDB();
  try {
    // اقرا السيشن + fallback للهيدر x-session-b64
    let s = (await getSession(req)) as any;
    if (!s) {
      const b64 = req.headers.get("x-session-b64");
      if (b64) {
        try {
          const raw = Buffer.from(b64, "base64").toString("binary");
          s = JSON.parse(decodeURIComponent(escape(raw)));
        } catch {}
      }
    }

    const entityIdParam = req.nextUrl?.searchParams?.get("entityId") || null;

    // تحديد السكوب
    let scopedEntityId = "";
    if (s?.role === "entityManager") {
      // مدير الكيان → كيانُه فقط
      scopedEntityId = String(s?.entityId || "");
    } else if (s?.role === "unionSupervisor") {
      // مسؤول اتحاد → يا إما المرسل بارام أو الكل
      scopedEntityId = entityIdParam ? String(entityIdParam) : "";
    } else if (s?.role === "user") {
      // مستخدم عادي → حاول استنتاج كيانُه
      let eid = entityIdParam ? String(entityIdParam) : String(s?.entityId || "");

      // 1) آخر عضوية في entity_members بناءً على userId
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
        } catch {}
      }

      // 2) آخر سجل في members بالرقم القومي
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
        } catch {}
      }

      // 3) آخر سجل في members بالبريد (case-insensitive)
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
        } catch {}
      }

      scopedEntityId = eid || "";
    } else {
      // أي دور تاني غير معروف
      scopedEntityId = entityIdParam ? String(entityIdParam) : "";
    }

    // استعلامات الجلب
    const qMembers = `
      SELECT
        m.id                           AS id,
        COALESCE(m.name,  u.name)      AS name,
        COALESCE(m.email, u.email)     AS email,
        COALESCE(m.phone, u.phone)     AS phone,
        m.entityId                     AS entityId,
        m.nationalId                   AS nationalId,
        m.joinedAt                     AS joinedAt,
        u.city                         AS city,
        u.avatar                       AS avatar
      FROM members m
      LEFT JOIN users u
        ON u.nationalId = m.nationalId
      ${scopedEntityId ? `WHERE m.entityId = ?` : ``}
    `;

    // خُد من entity_members أي عضو مش موجود بالفعل في members لنفس الكيان
    const qLegacy = `
      SELECT
        'm_' || lower(hex(randomblob(8)))         AS id,
        COALESCE(u.name,'—')                      AS name,
        u.email                                   AS email,
        u.phone                                   AS phone,
        em.entityId                               AS entityId,
        u.nationalId                              AS nationalId,
        COALESCE(em.joinedAt, datetime('now'))    AS joinedAt,
        u.city                                    AS city,
        u.avatar                                  AS avatar
      FROM entity_members em
      JOIN users u ON u.id = em.userId
      LEFT JOIN members m2
        ON m2.entityId = em.entityId
       AND m2.nationalId = u.nationalId
      WHERE m2.id IS NULL
      ${scopedEntityId ? `AND em.entityId = ?` : ``}
    `;

    // مسؤول الاتحاد بدون سكوب يشوف الكل
    const canSeeAll = s?.role === "unionSupervisor" && !scopedEntityId;

    let rows: any[] = [];
    if (canSeeAll) {
      rows = [...db.prepare(qMembers).all(), ...db.prepare(qLegacy).all()] as any[];
    } else if (scopedEntityId) {
      rows = [
        ...db.prepare(qMembers).all(scopedEntityId),
        ...db.prepare(qLegacy).all(scopedEntityId),
      ] as any[];
    } else {
      // مفيش سكوب واضح → رجّع فاضي (حماية)
      rows = [];
    }

    // بالترتيب الأحدث
    rows.sort((a, b) => (new Date(b.joinedAt).getTime() || 0) - (new Date(a.joinedAt).getTime() || 0));

    return NextResponse.json(rows);
  } catch (err: any) {
    const res = NextResponse.json([], { status: 200 });
    res.headers.set("x-debug-members-get", String(err?.message || err).slice(0, 200));
    return res;
  }
}

/* -------------------- POST: create member + ensure/link user + entity_members -------------------- */
export async function POST(req: NextRequest) {
  const guard = await ensureRole(["unionSupervisor", "entityManager"], req);
  if (guard) return guard;

  const sess = await getSession(req);
  const db = getDB();

  let b: any = {};
  try { b = await req.json(); } catch {}

  const name = String(b?.name || "").trim();
  const entityId = String(b?.entityId || "").trim();
  const nationalId = String(b?.nationalId || "").trim();
  const email = toNullEmail(b?.email);
  const phone = b?.phone ? String(b.phone).trim() : null;
  const city = b?.city ? String(b.city).trim() : null;
  const inputPwd = String(b?.password || ""); // الآن إجباري

  if (!name || !entityId) return NextResponse.json({ error: "name و entityId مطلوبان" }, { status: 400 });
  if (!/^\d{14}$/.test(nationalId)) return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });

  // كلمة المرور إجباري + شرط قوة بسيط
  if (!inputPwd) return NextResponse.json({ error: "كلمة المرور مطلوبة" }, { status: 400 });
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(inputPwd))
    return NextResponse.json({ error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام" }, { status: 400 });

  // مدير الكيان لا يضيف خارج كيانُه
  if (sess!.role === "entityManager" && String(entityId) !== String(sess!.entityId || ""))
    return NextResponse.json({ error: "غير مصرح: خارج كيانك" }, { status: 403 });

  // تحقق من وجود الكيان
  const entityRow = db.prepare(`SELECT id FROM entities WHERE id=?`).get(entityId);
  if (!entityRow) return NextResponse.json({ error: "الكيان غير موجود" }, { status: 404 });

  // سياسة: شخص واحد = كيان واحد
  const existsAny = db.prepare(`SELECT 1 FROM members WHERE nationalId=? LIMIT 1`).get(nationalId);
  if (existsAny) return NextResponse.json({ error: "هذا العضو مسجّل بالفعل في كيان آخر" }, { status: 409 });

  // ممنوع التكرار داخل نفس الكيان
  const dupSameEntity = db.prepare(`SELECT 1 FROM members WHERE entityId=? AND nationalId=? LIMIT 1`).get(entityId, nationalId);
  if (dupSameEntity) return NextResponse.json({ error: "يوجد عضو بنفس الرقم القومي داخل هذا الكيان" }, { status: 409 });

  const tx = (db as any).transaction(() => {
    let user: any = null;

    // جرّب بالبريد
    if (email) {
      user = db.prepare(`SELECT * FROM users WHERE email=?`).get(email);
      if (user) {
        if (user.nationalId && user.nationalId !== nationalId) throw new Error("E_EMAIL_OWNED_BY_OTHER");
        db.prepare(`UPDATE users SET name=?, phone=?, nationalId=?, city=COALESCE(?, city) WHERE id=?`)
          .run(name, phone, nationalId, city, user.id);
      }
    }

    // جرّب بالرقم القومي
    if (!user) {
      user = db.prepare(`SELECT * FROM users WHERE nationalId=?`).get(nationalId);
      if (user) {
        if (email && user.email && user.email !== email) throw new Error("E_EMAIL_CONFLICT");
        if (email && !user.email) {
          db.prepare(`UPDATE users SET name=?, email=?, phone=?, nationalId=?, city=COALESCE(?, city) WHERE id=?`)
            .run(name, email, phone, nationalId, city, user.id);
        } else {
          db.prepare(`UPDATE users SET name=?, phone=?, nationalId=?, city=COALESCE(?, city) WHERE id=?`)
            .run(name, phone, nationalId, city, user.id);
        }
      }
    }

    // هاش من الباسورد اللي أدخله المسؤول
    const hash = bcrypt.hashSync(inputPwd, 10);

    // أنشئ مستخدم جديد لو مش موجود
    if (!user) {
      const userId = uid();
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
      user = db.prepare(`SELECT * FROM users WHERE id=?`).get(userId);
    } else {
      // موجود بالفعل → حدّث كلمة المرور بما أدخله المسؤول
      db.prepare(`UPDATE users SET password=?, passwordHash=? WHERE id=?`).run(inputPwd, hash, user.id);
    }

    // سجّل العضو في members
    const memberId = uid();
    db.prepare(
      `INSERT INTO members (id, name, email, phone, entityId, nationalId, joinedAt)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).run(memberId, name, email, phone, entityId, nationalId);

    // اربطه كمان في entity_members (علشان الداشبورد)
    db.prepare(
      `INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
       VALUES (?, ?, ?, datetime('now'))`,
    ).run(uid(), entityId, user.id);

    return db.prepare(`SELECT * FROM members WHERE id=?`).get(memberId);
  });

  try {
    const row = tx();
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    const code = String(e?.message || "");
    if (code === "E_EMAIL_OWNED_BY_OTHER") return NextResponse.json({ error: "هذا البريد مستخدم لحساب شخص آخر" }, { status: 409 });
    if (code === "E_EMAIL_CONFLICT") return NextResponse.json({ error: "يتعذّر تغيير البريد لحساب موجود" }, { status: 409 });
    if (code === "E_EMAIL_DUP") return NextResponse.json({ error: "البريد مسجّل من قبل" }, { status: 409 });
    if (code === "E_NID_DUP") return NextResponse.json({ error: "هذا الرقم القومي مسجّل بالفعل" }, { status: 409 });

    return NextResponse.json(
      { error: "تعذّر إنشاء حساب المستخدم/العضو", detail: String(e?.message || e).slice(0, 200) },
      { status: 500 },
    );
  }
}
