import { getDB, uid } from "./sqlite";

type NotificationType = 
  | "join_request" 
  | "join_approved" 
  | "join_rejected"
  | "leave_request"
  | "leave_approved"
  | "leave_rejected"
  | "entity_suspended"
  | "entity_activated"
  | "manager_assigned"
  | "member_removed"
  | "event_created"
  | "event_approved"
  | "event_rejected"
  | "event_deleted"
  | "iso_submitted"
  | "iso_approved"
  | "iso_rejected"
  | "governance_submitted"
  | "governance_approved"
  | "governance_rejected"
  | "manager_request"
  | "entity_request";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

export function createNotification(params: CreateNotificationParams) {
  const db = getDB();
  
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

  const id = uid();
  db.prepare(`
    INSERT INTO notifications (id, userId, type, title, message, link, createdAt, metadata)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
  `).run(
    id,
    params.userId,
    params.type,
    params.title,
    params.message,
    params.link || null,
    params.metadata ? JSON.stringify(params.metadata) : null
  );

  return id;
}

// دالة لإرسال إشعار لمدير الكيان
export function notifyEntityManager(entityId: string, notification: Omit<CreateNotificationParams, "userId">) {
  const db = getDB();
  
  // جلب مدير الكيان
  const entity = db.prepare(`SELECT managerUserId FROM entities WHERE id = ?`).get(entityId) as { managerUserId?: string } | undefined;
  
  if (entity?.managerUserId) {
    createNotification({
      ...notification,
      userId: entity.managerUserId,
    });
  }

  // جلب المديرين الإضافيين
  const managers = db.prepare(`SELECT userId FROM entity_managers WHERE entityId = ?`).all(entityId) as { userId: string }[];
  
  for (const manager of managers) {
    createNotification({
      ...notification,
      userId: manager.userId,
    });
  }
}

// دالة لإرسال إشعار لمسؤول الاتحاد
export function notifyUnionSupervisors(notification: Omit<CreateNotificationParams, "userId">) {
  const db = getDB();
  
  const supervisors = db.prepare(`SELECT id FROM users WHERE role = 'unionSupervisor'`).all() as { id: string }[];
  
  for (const supervisor of supervisors) {
    createNotification({
      ...notification,
      userId: supervisor.id,
    });
  }
}
