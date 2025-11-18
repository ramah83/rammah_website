export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getDB, uid } from "@/lib/server/sqlite";
import { getSession } from "@/lib/server/session";

type Session = { id: string; role: string; entityId?: string | null };

// GET: جلب الإشعارات
export async function GET(req: NextRequest) {
  const session = (await getSession(req)) as Session | null;
  if (!session?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unreadOnly") === "true";

  // إنشاء جدول الإشعارات إذا لم يكن موجوداً
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      isRead INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      readAt TEXT,
      metadata TEXT
    )
  `);

  const query = unreadOnly
    ? `SELECT * FROM notifications WHERE userId = ? AND isRead = 0 ORDER BY datetime(createdAt) DESC LIMIT 50`
    : `SELECT * FROM notifications WHERE userId = ? ORDER BY datetime(createdAt) DESC LIMIT 100`;

  const notifications = db.prepare(query).all(session.id) as any[];

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      ...n,
      isRead: Boolean(n.isRead),
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    })),
    unreadCount: db
      .prepare(`SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0`)
      .get(session.id) as { count: number },
  });
}

// POST: إنشاء إشعار جديد
export async function POST(req: NextRequest) {
  const session = (await getSession(req)) as Session | null;
  if (!session?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const body = await req.json().catch(() => ({}));

  const { userId, type, title, message, link, metadata } = body;

  if (!userId || !type || !title || !message) {
    return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
  }

  const id = uid();
  db.prepare(`
    INSERT INTO notifications (id, userId, type, title, message, link, createdAt, metadata)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `).run(id, userId, type, title, message, link || null, metadata ? JSON.stringify(metadata) : null);

  return NextResponse.json({ ok: true, id });
}

// PATCH: تحديث حالة الإشعار (قراءة/عدم قراءة)
export async function PATCH(req: NextRequest) {
  const session = (await getSession(req)) as Session | null;
  if (!session?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const body = await req.json().catch(() => ({}));
  const { notificationId, markAllAsRead } = body;

  if (markAllAsRead) {
    db.prepare(`
      UPDATE notifications SET isRead = 1, readAt = datetime('now')
      WHERE userId = ? AND isRead = 0
    `).run(session.id);
    return NextResponse.json({ ok: true });
  }

  if (!notificationId) {
    return NextResponse.json({ error: "notificationId مطلوب" }, { status: 400 });
  }

  db.prepare(`
    UPDATE notifications SET isRead = 1, readAt = datetime('now')
    WHERE id = ? AND userId = ?
  `).run(notificationId, session.id);

  return NextResponse.json({ ok: true });
}

// DELETE: حذف إشعار
export async function DELETE(req: NextRequest) {
  const session = (await getSession(req)) as Session | null;
  if (!session?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const db = getDB();
  const { searchParams } = new URL(req.url);
  const notificationId = searchParams.get("id");

  if (!notificationId) {
    return NextResponse.json({ error: "id مطلوب" }, { status: 400 });
  }

  db.prepare(`DELETE FROM notifications WHERE id = ? AND userId = ?`).run(notificationId, session.id);

  return NextResponse.json({ ok: true });
}
