import { headers as nextHeaders, cookies as nextCookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** الأدوار الأساسية التي تعتمد عليها صلاحيات الـAPI */
export type CoreRole = "unionSupervisor" | "entityManager" | "user";

/** بعض الأنظمة قد تحفظ أدوارًا إضافية كنصوص */
export type UserRole = CoreRole | (string & {});

/** الجلسة القياسية */
export type Session = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  entityId?: string | null;
};

/** تحويل أسماء أدوار متباينة إلى الدور الأساسي */
function normalizeRole(role?: string | null): UserRole | null {
  if (!role) return null;
  const r = String(role);
  if (r === "systemAdmin") return "unionSupervisor";
  if (r === "qualitySupervisor") return "unionSupervisor";
  if (r === "youth") return "user";
  return r as UserRole;
}

/** حارس نوع: هل القيمة واحدة من أدوارنا الأساسية؟ */
function isCoreRole(r: any): r is CoreRole {
  return r === "unionSupervisor" || r === "entityManager" || r === "user";
}

/** دالة مريحة لتحويل أي UserRole إلى CoreRole (مع افتراضي user) */
export function toCoreRole(r: UserRole | null | undefined): CoreRole {
  if (isCoreRole(r)) return r;
  // أدوار غير معروفة/أخرى ← نتعامل معاها كـ "user" افتراضيًا
  return "user";
}

function tryJSON(str: string): any | null {
  try { return JSON.parse(str); } catch { return null; }
}

function fromBase64Any(v: string): string {
  let s = v.trim();
  try { s = decodeURIComponent(s); } catch {}
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad) s = s + "=".repeat(4 - pad);
  return Buffer.from(s, "base64").toString("utf8");
}

function parseMaybeBase64OrJSON(v: string): any | null {
  const j1 = tryJSON(v);
  if (j1 && typeof j1 === "object") return j1;
  try {
    const decoded = fromBase64Any(v);
    const j2 = tryJSON(decoded);
    if (j2 && typeof j2 === "object") return j2;
  } catch {}
  return null;
}

function pickSession(obj: any): Session | null {
  if (!obj || typeof obj !== "object") return null;
  const role = normalizeRole(obj.role);
  if (obj.id && role) {
    return {
      id: String(obj.id),
      name: String(obj.name ?? ""),
      email: String(obj.email ?? ""),
      role,
      entityId: obj.entityId ?? null,
    };
  }
  return null;
}

function readSessionFromHeadersLike(h?: { get(name: string): string | null } | null): Session | null {
  if (!h) return null;

  const b64 = h.get("x-session-b64");
  if (b64) {
    try {
      const txt = fromBase64Any(b64);
      const s = pickSession(tryJSON(txt));
      if (s) return s;
    } catch {}
  }

  const rawJson = h.get("x-session-json");
  if (rawJson) {
    const s = pickSession(tryJSON(rawJson));
    if (s) return s;
  }

  const raw = h.get("x-session");
  if (raw) {
    const s = pickSession(parseMaybeBase64OrJSON(raw));
    if (s) return s;
  }

  const auth = h.get("authorization") || h.get("Authorization");
  if (auth) {
    const m = auth.match(/^(Bearer|Session)\s+(.+)$/i);
    if (m) {
      const token = m[2]?.trim();
      const s = pickSession(parseMaybeBase64OrJSON(token));
      if (s) return s;
    } else {
      const s = pickSession(parseMaybeBase64OrJSON(auth.trim()));
      if (s) return s;
    }
  }

  return null;
}

export async function getSession(req?: NextRequest): Promise<Session | null> {
  if (req) {
    const s1 = readSessionFromHeadersLike(req.headers as any);
    if (s1) return s1;
  }

  try {
    const h = nextHeaders();
    const s2 = readSessionFromHeadersLike(h as any);
    if (s2) return s2;
  } catch {}

  try {
    const ck = await nextCookies();
    const raw = ck?.get?.("session")?.value;
    if (raw) {
      const obj = parseMaybeBase64OrJSON(raw);
      const s3 = pickSession(obj);
      if (s3) return s3;
    }
  } catch {}

  return null;
}

/**
 * تأكيد الصلاحية
 * @returns NextResponse عند الخطأ، أو null عند السماح
 */
export async function ensureRole(allowed: UserRole[], req?: NextRequest) {
  const s = await getSession(req);
  if (!s) {
    return NextResponse.json({ error: "غير مصرح: يجب تسجيل الدخول" }, { status: 401 });
  }
  if (!allowed.includes(s.role)) {
    return NextResponse.json({ error: "غير مصرح: صلاحيات غير كافية" }, { status: 403 });
  }
  return null;
}
