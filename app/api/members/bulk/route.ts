export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession, ensureRole } from "@/lib/server/session";
import bcrypt from "bcryptjs";

// وظيفة لتحويل البريد الإلكتروني إلى null إذا كان غير صالح
function toNullEmail(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim().toLowerCase();
  if (!s || !s.includes("@") || s.length < 5) return null;
  return s;
}

// دالة مساعدة للتحقق من فرادة المعرف
function isIdUnique(db: any, table: string, id: string): boolean {
  const check = db.prepare(`SELECT 1 FROM ${table} WHERE id = ? LIMIT 1`).get(id);
  return !check;
}

// إضافة أعضاء جدد بشكل جماعي
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

    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ error: "لا توجد صفوف" }, { status: 400 });
    }

    const results: any[] = [];

    const createOne = (r: any) => {
      const name = String(r?.name || "").trim();
      const entityId = String(r?.entityId || "").trim();
      const nationalId = String(r?.nationalId || "").trim();
      const email = toNullEmail(r?.email);
      const phone = r?.phone ? String(r.phone).trim() : null;
      const city = r?.city ? String(r.city).trim() : null;
      const inputPwd = String(r?.password || "");

      if (!name || !entityId) throw new Error("name و entityId مطلوبان");
      if (!/^\d{14}$/.test(nationalId)) throw new Error("الرقم القومي يجب أن يكون 14 رقمًا");
      if (!inputPwd) throw new Error("كلمة المرور مطلوبة");
      if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(inputPwd))
        throw new Error("كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام");

      if (sess!.role === "entityManager" && String(entityId) !== String(sess!.entityId || ""))
        throw new Error("غير مصرح: خارج كيانك");

      const entityRow = db.prepare(`SELECT id FROM entities WHERE id = ?`).get(entityId);
      if (!entityRow) throw new Error("الكيان غير موجود");

      const existsAny = db.prepare(`SELECT 1 FROM members WHERE nationalId = ? LIMIT 1`).get(nationalId);
      if (existsAny) throw new Error("هذا العضو مسجّل بالفعل في كيان آخر");

      const dupSameEntity = db.prepare(`SELECT 1 FROM members WHERE entityId = ? AND nationalId = ? LIMIT 1`).get(entityId, nationalId);
      if (dupSameEntity) throw new Error("يوجد عضو بنفس الرقم القومي داخل هذا الكيان");

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
            userId = uid(); // إنشاء معرف جديد
            console.log(`محاولة إنشاء userId: ${userId}`); // تسجيل لتتبع
          } while (!isIdUnique(db, "users", userId)); // التأكد من فرادة المعرف
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
          memberId = uid(); // إنشاء معرف جديد
          console.log(`محاولة إنشاء memberId: ${memberId}`); // تسجيل لتتبع
        } while (!isIdUnique(db, "members", memberId)); // التأكد من فرادة المعرف
        db.prepare(
          `INSERT INTO members (id, name, email, phone, entityId, nationalId, joinedAt)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        ).run(memberId, name, email, phone, entityId, nationalId);

        let entityMemberId;
        do {
          entityMemberId = uid(); // إنشاء معرف جديد
          console.log(`محاولة إنشاء entityMemberId: ${entityMemberId}`); // تسجيل لتتبع
        } while (!isIdUnique(db, "entity_members", entityMemberId)); // التأكد من فرادة المعرف
        db.prepare(
          `INSERT OR IGNORE INTO entity_members (id, entityId, userId, joinedAt)
           VALUES (?, ?, ?, datetime('now'))`,
        ).run(entityMemberId, entityId, user.id);

        return memberId;
      });

      const memberId = tx();
      return memberId as string;
    };

    for (let i = 0; i < rows.length; i++) {
      try {
        const id = createOne(rows[i]);
        results.push({ index: i, ok: true, id });
      } catch (e: any) {
        const msg = String(e?.message || e);
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
        results.push({ index: i, ok: false, error: map[msg] || msg });
      }
    }

    return NextResponse.json({ results }, { status: 201 });

  } catch (error) {
    console.error("خطأ غير متوقع في POST:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي" }, { status: 500 });
  }
}