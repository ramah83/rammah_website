export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDB } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

const P = <T = any>(s: any) => {
  try { return JSON.parse(s ?? "null") as T; } catch { return null as any; }
};
const J = (v: any) => JSON.stringify(v ?? null);

function isNationalId(v?: string | null) {
  return !!v && /^\d{14}$/.test(v);
}

function isBcryptHash(v?: string | null) {
  return !!v && /^\$2[aby]\$\d{2}\$/.test(v);
}


function okPasswordComplexity(pwd: string) {
  return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const email = searchParams.get("email");
  if (!id && !email) {
    return NextResponse.json({ error: "missing id/email" }, { status: 400 });
  }

  const db = getDB();
  const row: any = id
    ? db.prepare(`SELECT * FROM users WHERE id=?`).get(id)
    : db.prepare(`SELECT * FROM users WHERE email=?`).get(email);

  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const user = {
    id: row.id,
    nationalId: row.nationalId ?? null,
    name: row.name,
    email: row.email,
    role: row.role,
    entityId: row.entityId ?? null,
    interests: P<string[]>(row.interests),
    permissions: P<string[]>(row.permissions),
    phone: row.phone ?? null,
    city: row.city ?? null,
    bio: row.bio ?? null,
    avatar: row.avatar ?? null,
  };

  return NextResponse.json(user, { status: 200 });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id: bodyId,
      name,
      phone,
      city,
      bio,
      interests,
      avatar,
      oldPassword,
      newPassword,
      nationalId,
    } = body || {};

    const session = await getSession(req);
    const effectiveId = session?.id || bodyId;

    if (!effectiveId) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }
    if (session?.id && bodyId && session.id !== bodyId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const db = getDB();
    const row: any = db.prepare(`SELECT * FROM users WHERE id=?`).get(effectiveId);
    if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

    const nextName   = typeof name   === "string" ? (name.trim()   || row.name) : row.name;
    const nextPhone  = typeof phone  === "string" ? (phone.trim()  || null)     : (row.phone ?? null);
    const nextCity   = typeof city   === "string" ? (city.trim()   || null)     : (row.city ?? null);
    const nextBio    = typeof bio    === "string" ? (bio.trim()    || null)     : (row.bio ?? null);
    const nextAvatar = typeof avatar === "string" ? (avatar.trim() || null)     : (row.avatar ?? null);
    const nextInterests = Array.isArray(interests) ? J(interests) : (row.interests ?? J([]));

    
    let nextNationalId = row.nationalId ?? null;
    if (nationalId !== undefined) {
      if (row.nationalId) {
        return NextResponse.json({ error: "لا يمكن تعديل الرقم القومي بعد حفظه" }, { status: 400 });
      }
      if (!isNationalId(nationalId)) {
        return NextResponse.json({ error: "الرقم القومي يجب أن يكون 14 رقمًا" }, { status: 400 });
      }
      const exists = db.prepare(`SELECT 1 FROM users WHERE nationalId=?`).get(nationalId);
      if (exists) {
        return NextResponse.json({ error: "هذا الرقم القومي مستخدم بالفعل" }, { status: 400 });
      }
      nextNationalId = nationalId;
    }

    
    let willUpdatePassword = false;
    let newPasswordHash: string | undefined;

    const hasStoredHash  = !!row.passwordHash;
    const hasLegacyField = row.password != null && row.password !== "";

    if (newPassword) {
      if (!okPasswordComplexity(String(newPassword))) {
        return NextResponse.json({ error: "كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام" }, { status: 400 });
      }

      
      const hadAnyPassword = hasStoredHash || hasLegacyField;
      if (hadAnyPassword) {
        if (!oldPassword) {
          return NextResponse.json({ error: "يرجى إدخال كلمة السر الحالية" }, { status: 400 });
        }

        let okOld = false;

        
        if (hasStoredHash && bcrypt.compareSync(String(oldPassword), String(row.passwordHash))) {
          okOld = true;
        } else if (hasLegacyField) {
          
          if (isBcryptHash(row.password)) {
            
            if (bcrypt.compareSync(String(oldPassword), String(row.password))) {
              okOld = true;
              db.prepare(`UPDATE users SET passwordHash=?, password=NULL WHERE id=?`).run(row.password, effectiveId);
            }
          } else {
            
            if (String(oldPassword) === String(row.password)) {
              okOld = true;
              const migrated = bcrypt.hashSync(String(oldPassword), 10);
              db.prepare(`UPDATE users SET passwordHash=?, password=NULL WHERE id=?`).run(migrated, effectiveId);
            }
          }
        }

        if (!okOld) {
          return NextResponse.json({ error: "كلمة السر الحالية غير صحيحة" }, { status: 400 });
        }
      }
      

      newPasswordHash = bcrypt.hashSync(String(newPassword), 10);
      willUpdatePassword = true;
    } else if (oldPassword && !newPassword) {
      return NextResponse.json({ error: "يرجى إدخال كلمة السر الجديدة" }, { status: 400 });
    }

    
    const sql = `
      UPDATE users
         SET name=?,
             phone=?,
             city=?,
             bio=?,
             avatar=?,
             interests=?,
             nationalId=?
             ${willUpdatePassword ? `, passwordHash=?, password=NULL` : ``}
       WHERE id=?
    `;
    const params: any[] = [
      nextName,
      nextPhone,
      nextCity,
      nextBio,
      nextAvatar,
      nextInterests,
      nextNationalId,
    ];
    if (willUpdatePassword) params.push(newPasswordHash);
    params.push(effectiveId);

    db.prepare(sql).run(...params);

    const after: any = db.prepare(`SELECT * FROM users WHERE id=?`).get(effectiveId);
    const user = {
      id: after.id,
      nationalId: after.nationalId ?? null,
      name: after.name,
      email: after.email,
      role: after.role,
      entityId: after.entityId ?? null,
      interests: P<string[]>(after.interests),
      permissions: P<string[]>(after.permissions),
      phone: after.phone ?? null,
      city: after.city ?? null,
      bio: after.bio ?? null,
      avatar: after.avatar ?? null,
    };
    return NextResponse.json(user, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal Server Error" }, { status: 500 });
  }
}
