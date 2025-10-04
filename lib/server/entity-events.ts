import { getDB, uid } from "./sqlite";

export function logEntityEvent(ev: {
  entityId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
}) {
  const db = getDB();
  db.prepare(`
    INSERT INTO entity_events
      (id, entityId, action, fromStatus, toStatus, reason, actorId, actorName, actorRole, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    uid(),
    ev.entityId,
    ev.action,
    ev.fromStatus ?? null,
    ev.toStatus ?? null,
    ev.reason ?? null,
    ev.actorId ?? null,
    ev.actorName ?? null,
    ev.actorRole ?? null
  );
}
