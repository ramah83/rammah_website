import "server-only";
import { getDB } from "@/lib/server/sqlite";

const P = <T=any>(s:any)=>{ try{return JSON.parse(s??"null") as T}catch{return null as any} };
const J = (v:any)=> JSON.stringify(v ?? null);

export function getUserSafeById(id: string) {
  const db = getDB();
  const r: any = db.prepare(`SELECT * FROM users WHERE id=?`).get(id);
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    entityId: r.entityId ?? null,
    interests: P<string[]>(r.interests),
    permissions: P<string[]>(r.permissions),
    phone: r.phone ?? null,
    city: r.city ?? null,
    bio: r.bio ?? null,
    avatar: r.avatar ?? null,
  };
}

export function updateUserProfile(input: {
  id: string,
  name?: string,
  phone?: string | null,
  city?: string | null,
  bio?: string | null,
  interests?: string[] | null,
  avatar?: string | null,
  // اختياري: تغيير كلمة السر
  oldPassword?: string,
  newPassword?: string
}) {
  const db = getDB();
  const row: any = db.prepare(`SELECT * FROM users WHERE id=?`).get(input.id);
  if (!row) return { ok: false, error: "المستخدم غير موجود" };

  // لو عايز تغيّر كلمة السر
  if (input.newPassword) {
    if (!input.oldPassword || input.oldPassword !== (row.password ?? "")) {
      return { ok: false, error: "كلمة السر الحالية غير صحيحة" };
    }
  }

  const name  = input.name  ?? row.name;
  const phone = input.phone ?? row.phone ?? null;
  const city  = input.city  ?? row.city ?? null;
  const bio   = input.bio   ?? row.bio ?? null;
  const avatar= input.avatar?? row.avatar ?? null;
  const interests = J(input.interests ?? (row.interests ? JSON.parse(row.interests) : []));

  db.prepare(`
    UPDATE users
       SET name=?, phone=?, city=?, bio=?, avatar=?, interests=? ${input.newPassword ? `, password=?` : ``}
     WHERE id=?
  `).run(
    name, phone, city, bio, avatar, interests,
    ...(input.newPassword ? [input.newPassword] : []),
    input.id
  );

  return { ok: true, user: getUserSafeById(input.id) };
}
