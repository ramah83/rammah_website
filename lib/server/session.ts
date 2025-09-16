import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export type UserRole = "unionSupervisor" | "entityManager" | "user" | string;

export type Session = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  entityId?: string | null;
};

function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;
  if (role === "systemAdmin") return "unionSupervisor";
  if (role === "youth") return "user";
  if (role === "qualitySupervisor") return "unionSupervisor";
  return role as UserRole;
}

function parseMaybeBase64(v: string): any | null {
  try {
    const raw = Buffer.from(v, "base64").toString("utf8");
    return JSON.parse(raw);
  } catch {}
  try { return JSON.parse(v); } catch {}
  return null;
}

function readSessionFromHeaders(h?: { get(name: string): string | null } | null): Session | null {
  if (!h) return null;

  const b64 = h.get("x-session-b64");
  if (b64) {
    try {
      const raw = Buffer.from(b64, "base64").toString("utf8");
      const json = JSON.parse(raw);
      const role = normalizeRole(json?.role);
      if (json?.id && role) return { ...json, role } as Session;
    } catch {}
  }

  const rawJson = h.get("x-session-json");
  if (rawJson) {
    try {
      const json = JSON.parse(rawJson);
      const role = normalizeRole(json?.role);
      if (json?.id && role) return { ...json, role } as Session;
    } catch {}
  }

  const raw = h.get("x-session");
  if (raw) {
    const json = parseMaybeBase64(raw);
    const role = normalizeRole(json?.role);
    if (json?.id && role) return { ...json, role } as Session;
  }
  return null;
}

export async function getSession(req?: NextRequest): Promise<Session | null> {
  if (req) {
    const s = readSessionFromHeaders(req.headers as any);
    if (s) return s;
  }
  try {
    const h = (await (nextHeaders() as any)) as { get(name: string): string | null };
    const s = readSessionFromHeaders(h);
    if (s) return s;
  } catch {}

  try {
    const ck = (await (nextCookies() as any));
    const raw = ck?.get?.("session")?.value;
    if (raw) {
      const json = parseMaybeBase64(raw);
      const role = normalizeRole(json?.role);
      if (json?.id && role) return { ...json, role } as Session;
    }
  } catch {}

  return null;
}
function ensureMembersHasRoleInEntity(d: Database.Database) {
  try {
    const has = d.prepare(`PRAGMA table_info(members)`).all() as any[];
    if (!has.some((r) => String(r.name) === "roleInEntity")) {
      d.exec(`ALTER TABLE members ADD COLUMN roleInEntity TEXT`);
    }
  } catch {}
}
export async function ensureRole(allowed: UserRole[], req?: NextRequest) {
  const s = await getSession(req);
  if (!s) return NextResponse.json({ error: "غير مصرح: يجب تسجيل الدخول" }, { status: 401 });
  if (!allowed.includes(s.role))
    return NextResponse.json({ error: "غير مصرح: صلاحيات غير كافية" }, { status: 403 });
  return null;
}
