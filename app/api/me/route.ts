// app/api/me/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getDB } from "@/lib/server/sqlite";

const P = <T=any>(s:any)=>{ try{return JSON.parse(s??"null") as T}catch{return null as any} };
const J = (v:any)=> JSON.stringify(v ?? null);

// ===== GET /api/me?id=... أو /api/me?email=... =====
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
    name: row.name,
    email: row.email,
    role: row.role,
    entityId: row.entityId ?? null,
    interests: P<string[]>(row.interests),
    permissions: P<string[]>(row.permissions),
    // حقول الملف الشخصي الاختيارية
    phone: row.phone ?? null,
    city: row.city ?? null,
    bio: row.bio ?? null,
    avatar: row.avatar ?? null,
  };

  return NextResponse.json(user, { status: 200 });
}

// ===== PATCH /api/me  (body: { id, name?, phone?, city?, bio?, interests?, avatar?, oldPassword?, newPassword? }) =====
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, name, phone, city, bio, interests, avatar, oldPassword, newPassword } = body || {};
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const db = getDB();
  const row: any = db.prepare(`SELECT * FROM users WHERE id=?`).get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  // تغيير كلمة السر (اختياري وبسيط — يفضل استخدام hashing في الإنتاج)
  if (newPassword) {
    const current = row.password ?? "";
    if (!oldPassword || oldPassword !== current) {
      return NextResponse.json({ error: "كلمة السر الحالية غير صحيحة" }, { status: 400 });
    }
  }

  const next = {
    name: typeof name === "string" && name.trim() ? name.trim() : row.name,
    phone: typeof phone === "string" ? (phone.trim() || null) : (row.phone ?? null),
    city:  typeof city  === "string" ? (city.trim()  || null) : (row.city  ?? null),
    bio:   typeof bio   === "string" ? (bio.trim()   || null) : (row.bio   ?? null),
    avatar: typeof avatar === "string" ? (avatar.trim() || null) : (row.avatar ?? null),
    interests: Array.isArray(interests)
      ? J(interests)
      : (row.interests ?? J([])),
    password: newPassword ? String(newPassword) : (row.password ?? null),
  };

  // نفّذ التحديث
  db.prepare(`
    UPDATE users
       SET name=?, phone=?, city=?, bio=?, avatar=?, interests=?, password=?
     WHERE id=?
  `).run(
    next.name, next.phone, next.city, next.bio, next.avatar, next.interests, next.password, id
  );

  // أرجع نسخة آمنة للمستخدم بعد التحديث
  const after: any = db.prepare(`SELECT * FROM users WHERE id=?`).get(id);
  const user = {
    id: after.id,
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
}
