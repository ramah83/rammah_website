import "server-only";
import { getDB, uid } from "./sqlite";

export type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth";
export type GovernanceType = "policy" | "procedure" | "minutes" | "decision" | "inquiry" | "response";
export type GovernanceStatus = "draft" | "review" | "approved" | "archived";

export type User = {
  id: string; name: string; email: string; password?: string; role: UserRole;
  interests?: string[]; entityId?: string | null; permissions?: string[];
};

export type GovernanceItem = {
  id: string; title: string; type: GovernanceType; status: GovernanceStatus;
  entityId?: string | null; createdAt: string; updatedAt: string;
  notes?: string | null; decisionDate?: string | null; attachments?: string[];
};

export type Entity = {
  id: string; name: string; type?: string; contactEmail?: string; phone?: string;
  location?: string; documents?: string[]; createdAt: string; createdBy?: string | null;
};

export type Member = {
  id: string; name: string; email?: string | null; phone?: string | null;
  entityId?: string | null; roleInEntity?: string | null; joinedAt: string;
};

export type EventItem = {
  id: string; title: string; date?: string | null;
  status: "draft" | "approved" | "cancelled" | "done";
  entityId?: string | null;
};

export type ISOForm = {
  id: string; title: string; code?: string;
  status: "draft" | "submitted" | "review" | "approved" | "rejected";
  ownerEntityId?: string | null;
};

const J = (v: any) => JSON.stringify(v ?? null);
const P = <T = any>(s: any) => { try { return JSON.parse(s ?? "null") as T } catch { return null as any } };

export function getUsers(): User[] {
  const rows = getDB().prepare(`SELECT * FROM users`).all() as any[];
  return rows.map(r => ({ ...r, interests: P<string[]>(r.interests), permissions: P<string[]>(r.permissions) }));
}
export function register(u: Omit<User, "id">) {
  const db = getDB();
  const exists = db.prepare(`SELECT 1 FROM users WHERE email=?`).get(u.email);
  if (exists) return null;
  const id = uid();
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, interests, entityId, permissions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, u.name, u.email, u.password ?? null, u.role, J(u.interests), u.entityId ?? null, J(u.permissions));
  return { id, ...u };
}
export function login(email: string, password: string) {
  const r: any = getDB().prepare(`SELECT * FROM users WHERE email=? AND password=?`).get(email, password);
  if (!r) return null;
  return { ...r, interests: P<string[]>(r.interests), permissions: P<string[]>(r.permissions) } as User;
}

export function getEntity(id: string): Entity | null {
  const row: any = getDB().prepare(`SELECT * FROM entities WHERE id=?`).get(id);
  if (!row) return null;
  return { ...row, documents: P<string[]>(row.documents) } as Entity;
}
export function listEntities(): Entity[] {
  const rows = getDB().prepare(`SELECT * FROM entities ORDER BY datetime(createdAt) DESC`).all();
  return (rows as any[]).map(r => ({ ...r, documents: P<string[]>(r.documents) })) as Entity[];
}
export function addEntity(data: Omit<Entity, "id" | "createdAt" | "createdBy"> & { createdBy?: string | null }) {
  const id = uid(); const createdAt = new Date().toISOString();
  getDB().prepare(`
    INSERT INTO entities (id, name, type, contactEmail, phone, location, documents, createdAt, createdBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.type ?? null, data.contactEmail ?? null, data.phone ?? null, data.location ?? null, J(data.documents), createdAt, data.createdBy ?? null);
  return { id, ...data, createdAt } as Entity;
}
export function updateEntity(id: string, patch: Partial<Omit<Entity, "id" | "createdAt">>) {
  const db = getDB();
  const row: any = db.prepare(`SELECT * FROM entities WHERE id=?`).get(id);
  if (!row) return null;
  const name = patch.name ?? row.name;
  const type = patch.type ?? row.type;
  const contactEmail = patch.contactEmail ?? row.contactEmail;
  const phone = patch.phone ?? row.phone;
  const location = patch.location ?? row.location;
  const documents = J(patch.documents ?? (row.documents ? JSON.parse(row.documents) : []));
  db.prepare(`
    UPDATE entities
       SET name=?, type=?, contactEmail=?, phone=?, location=?, documents=?
     WHERE id=?
  `).run(name, type ?? null, contactEmail ?? null, phone ?? null, location ?? null, documents, id);
  const after: any = db.prepare(`SELECT * FROM entities WHERE id=?`).get(id);
  return { ...after, documents: P<string[]>(after.documents) } as Entity;
}
export function removeEntity(id: string) {
  getDB().prepare(`DELETE FROM entities WHERE id=?`).run(id);
  return { ok: true };
}

export function listMembers(): Member[] {
  return getDB().prepare(`SELECT * FROM members`).all() as Member[];
}
export function addMember(data: Omit<Member, "id" | "joinedAt">) {
  const id = uid(); const joinedAt = new Date().toISOString();
  getDB().prepare(`
    INSERT INTO members (id, name, email, phone, entityId, roleInEntity, joinedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.email ?? null, data.phone ?? null, data.entityId ?? null, data.roleInEntity ?? null, joinedAt);
  return { id, ...data, joinedAt } as Member;
}
export function updateMember(id: string, patch: Partial<Omit<Member, "id" | "joinedAt">>) {
  const db = getDB();
  const row: any = db.prepare(`SELECT * FROM members WHERE id=?`).get(id);
  if (!row) return null;
  const name = patch.name ?? row.name;
  const email = patch.email ?? row.email;
  const phone = patch.phone ?? row.phone;
  const entityId = (patch.entityId ?? row.entityId) ?? null;
  const roleInEntity = (patch.roleInEntity ?? row.roleInEntity) ?? null;
  db.prepare(`UPDATE members SET name=?, email=?, phone=?, entityId=?, roleInEntity=? WHERE id=?`)
    .run(name, email ?? null, phone ?? null, entityId, roleInEntity, id);
  return db.prepare(`SELECT * FROM members WHERE id=?`).get(id) as Member;
}
export function deleteMember(id: string) {
  getDB().prepare(`DELETE FROM members WHERE id=?`).run(id);
  return { ok: true };
}

export function listGovernance(): GovernanceItem[] {
  const rows = getDB().prepare(`SELECT * FROM governance ORDER BY datetime(createdAt) DESC`).all() as any[];
  return rows.map(r => {
    const meta = r.meta ? JSON.parse(r.meta) : {};
    return {
      id: r.id, title: r.title, type: r.type as GovernanceType,
      status: (r.status ?? "draft") as GovernanceStatus,
      entityId: r.entityId ?? null, createdAt: r.createdAt, updatedAt: r.updatedAt,
      notes: r.description ?? null, decisionDate: meta.decisionDate ?? null, attachments: meta.attachments ?? [],
    } as GovernanceItem;
  });
}
export function addGovernance(input: {
  title: string; type: GovernanceType; status?: GovernanceStatus; entityId?: string | null;
  notes?: string | null; decisionDate?: string | null; attachments?: string[];
}): GovernanceItem {
  const db = getDB(); const id = uid(); const now = new Date().toISOString();
  const meta = JSON.stringify({ decisionDate: input.decisionDate ?? null, attachments: input.attachments ?? [] });
  db.prepare(`
    INSERT INTO governance (id, type, title, description, entityId, status, meta, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.type, input.title, input.notes ?? null, input.entityId ?? null, input.status ?? "draft", meta, now, now);
  return {
    id, title: input.title, type: input.type, status: input.status ?? "draft",
    entityId: input.entityId ?? null, createdAt: now, updatedAt: now,
    notes: input.notes ?? null, decisionDate: input.decisionDate ?? null, attachments: input.attachments ?? []
  };
}

export function listISO(): ISOForm[] {
  return getDB().prepare(`SELECT * FROM iso`).all() as ISOForm[];
}
export function addISO(data: Omit<ISOForm, "id">) {
  const id = uid();
  getDB().prepare(`INSERT INTO iso (id, title, code, status, ownerEntityId) VALUES (?, ?, ?, ?, ?)`)
    .run(id, data.title, data.code ?? null, data.status, data.ownerEntityId ?? null);
  return { id, ...data } as ISOForm;
}

export function listEvents(): EventItem[] {
  const rows = getDB().prepare(`SELECT id, title, date, status, entityId FROM events ORDER BY datetime(date) DESC, title ASC`).all();
  return rows as EventItem[];
}

export function addEvent(data: Omit<EventItem, "id">) {
  const id = uid();
  getDB().prepare(`
    INSERT INTO events (id, title, date, status, entityId)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.title, data?.date ?? null, data.status, data.entityId ?? null);
  const row = getDB().prepare(`SELECT id, title, date, status, entityId FROM events WHERE id=?`).get(id) as EventItem;
  return row;
}

export function updateEvent(id: string, patch: Partial<Omit<EventItem, "id">>) {
  const db = getDB();
  const row: any = db.prepare(`SELECT * FROM events WHERE id=?`).get(id);
  if (!row) return null;

  const title = typeof patch.title === "string" ? patch.title : row.title;
  const date  = (patch.date === null || typeof patch.date === "string") ? (patch.date ?? null) : row.date;
  const entityId = typeof patch.entityId === "string" ? patch.entityId : row.entityId;
  const status = typeof patch.status === "string" ? patch.status : row.status;

  db.prepare(`UPDATE events SET title=?, date=?, status=?, entityId=? WHERE id=?`)
    .run(title, date, status, entityId, id);

  return db.prepare(`SELECT id, title, date, status, entityId FROM events WHERE id=?`).get(id) as EventItem;
}

export function deleteEvent(id: string) {
  getDB().prepare(`DELETE FROM events WHERE id=?`).run(id);
  return { ok: true };
}

export const dataStore = {
  getUsers, register, login,
  listEntities, getEntity, addEntity, updateEntity, removeEntity,
  listMembers, addMember, updateMember, deleteMember,
  listGovernance, addGovernance,
  listISO, addISO,
  listEvents, addEvent, updateEvent, deleteEvent,
};
