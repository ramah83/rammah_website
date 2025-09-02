import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { getDB } from "@/lib/server/sqlite";

type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
type Session = { id:string; email:string; name:string; role:UserRole; entityId?:string|null };

async function getSession(): Promise<Session | null> {
  try {
    const rawCookie = (await cookies()).get("session")?.value;
    const rawHeader = (await headers()).get("x-session");
    const raw = rawCookie ?? rawHeader ?? null;
    return raw ? JSON.parse(raw) as Session : null;
  } catch { return null; }
}

export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "no session" }, { status: 401 });

  const db = getDB();
  
  const exists = db.prepare(`SELECT * FROM users WHERE id=?`).get(s.id);
  if (!exists) {
    db.prepare(`
      INSERT INTO users (id,name,email,role,entityId)
      VALUES (?,?,?,?,?)
    `).run(s.id, s.name, s.email, s.role, s.entityId ?? null);
  } else {
    
    db.prepare(`UPDATE users SET name=?, email=?, role=? WHERE id=?`)
      .run(s.name, s.email, s.role, s.id);
  }

  const u = db.prepare(`SELECT id,name,email,role,entityId FROM users WHERE id=?`).get(s.id);
  return NextResponse.json(u);
}
