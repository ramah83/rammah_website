import 'server-only'
import { getDB, uid, ensureTables } from './sqlite'

export type UserRole = 'systemAdmin' | 'qualitySupervisor' | 'entityManager' | 'youth'

export type User = {
  id: string
  name: string
  email: string
  password?: string
  role: UserRole
  interests?: string[]
  entityId?: string | null
  permissions?: string[]
}
export type GovernanceItem = {
  id: string
  title: string
  type?: string
  status?: "draft" | "review" | "approved" | "rejected"
  entityId?: string | null
  createdAt: string
  decisionDate?: string | null
  notes?: string | null
}

export type Entity = {
  id: string
  name: string
  type?: string
  contactEmail?: string
  phone?: string
  location?: string
  documents?: string[]
  createdAt: string
}

export type Member = {
  id: string
  name: string
  email?: string
  phone?: string
  entityId?: string | null
  joinedAt: string
}

export type EventItem = {
  id: string
  title: string
  date?: string
  status: 'draft' | 'approved' | 'cancelled' | 'done'
  entityId?: string | null
}

export type ISOForm = {
  id: string
  title: string
  code?: string
  status: 'draft' | 'submitted' | 'review' | 'approved' | 'rejected'
  ownerEntityId?: string | null
}

const J = (v: any) => JSON.stringify(v ?? null)
const P = <T = any>(s: any) => {
  try { return JSON.parse(s ?? 'null') as T }
  catch { return null as any }
}

ensureTables()

export function getUsers(): User[] {
  const rows = getDB().prepare(`SELECT * FROM users`).all()
  return rows.map((r: any) => ({
    ...r,
    interests: P<string[]>(r.interests),
    permissions: P<string[]>(r.permissions),
  }))
}

export function register(u: Omit<User, 'id'>) {
  const db = getDB()
  const exists = db.prepare(`SELECT 1 FROM users WHERE email = ?`).get(u.email)
  if (exists) return null
  const id = uid()
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, interests, entityId, permissions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    u.name,
    u.email,
    u.password ?? null,
    u.role,
    J(u.interests),
    u.entityId ?? null,
    J(u.permissions)
  )
  return { id, ...u }
}

export function login(email: string, password: string) {
  const r: any = getDB()
    .prepare(`SELECT * FROM users WHERE email = ? AND password = ?`)
    .get(email, password)
  if (!r) return null
  return {
    ...r,
    interests: P<string[]>(r.interests),
    permissions: P<string[]>(r.permissions),
  } as User
}

/* ================== Entities ================== */
export function listEntities(): Entity[] {
  const rows = getDB()
    .prepare(`SELECT * FROM entities ORDER BY datetime(createdAt) DESC`)
    .all()
  return rows.map((r: any) => ({ ...r, documents: P<string[]>(r.documents) }))
}

export function addEntity(data: Omit<Entity, 'id' | 'createdAt'>): Entity {
  const id = uid()
  const createdAt = new Date().toISOString()
  getDB()
    .prepare(`
      INSERT INTO entities
        (id, name, type, contactEmail, phone, location, documents, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      data.name,
      data.type ?? null,
      data.contactEmail ?? null,
      data.phone ?? null,
      data.location ?? null,
      J(data.documents),
      createdAt
    )
  return { id, ...data, createdAt }
}

/* ================== Members ================== */
export function listMembers(): Member[] {
  return getDB().prepare(`SELECT * FROM members`).all() as Member[]
}

export function addMember(data: Omit<Member, 'id' | 'joinedAt'>): Member {
  const id = uid()
  const joinedAt = new Date().toISOString()
  getDB()
    .prepare(`
      INSERT INTO members (id, name, email, phone, entityId, joinedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      data.name,
      data.email ?? null,
      data.phone ?? null,
      data.entityId ?? null,
      joinedAt
    )
  return { id, ...data, joinedAt }
}
export function listGovernance(): GovernanceItem[] {
  return getDB().prepare(`SELECT * FROM governance ORDER BY datetime(createdAt) DESC`).all() as GovernanceItem[]
}

export function addGovernance(data: Omit<GovernanceItem, "id" | "createdAt">): GovernanceItem {
  const id = uid()
  const createdAt = new Date().toISOString()
  getDB().prepare(`
    INSERT INTO governance (id, title, type, status, entityId, createdAt, decisionDate, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.title, data.type ?? null, data.status ?? null, data.entityId ?? null, createdAt, data.decisionDate ?? null, data.notes ?? null)
  return { id, createdAt, ...data }
}

/* ================== Events ================== */
export function listEvents(): EventItem[] {
  return getDB().prepare(`SELECT * FROM events`).all() as EventItem[]
}

export function addEvent(data: Omit<EventItem, 'id'>): EventItem {
  const id = uid()
  getDB()
    .prepare(`
      INSERT INTO events (id, title, date, status, entityId)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, data.title, data.date ?? null, data.status, data.entityId ?? null)
  return { id, ...data }
}

/* ================== ISO ================== */
export function listISO(): ISOForm[] {
  return getDB().prepare(`SELECT * FROM iso`).all() as ISOForm[]
}

export function addISO(data: Omit<ISOForm, 'id'>): ISOForm {
  const id = uid()
  getDB()
    .prepare(`
      INSERT INTO iso (id, title, code, status, ownerEntityId)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, data.title, data.code ?? null, data.status, data.ownerEntityId ?? null)
  return { id, ...data }
}

/* ================== Utilities ================== */
export function resetAll() {
  const db = getDB()
  db.exec(`
    DELETE FROM users;
    DELETE FROM entities;
    DELETE FROM members;
    DELETE FROM events;
    DELETE FROM iso;
  `)
}

export function seedIfEmpty() {
  const db = getDB()
  const c = (db.prepare(`SELECT COUNT(*) AS c FROM entities`).get() as any).c as number
  if (c > 0) return

  const e1 = addEntity({
    name: 'مركز تنمية الشباب – القاهرة',
    type: 'مركز شباب',
    contactEmail: 'cairo@youth.org',
    phone: '01010000001',
    location: 'القاهرة',
    documents: ['سجل تجاري.pdf', 'ترخيص المركز.pdf'],
  })
  const e2 = addEntity({
    name: 'جمعية الفنون والإبداع',
    type: 'جمعية',
    contactEmail: 'arts@youth.org',
    phone: '01020000002',
    location: 'الإسكندرية',
    documents: ['اللائحة الداخلية.pdf'],
  })
  const e3 = addEntity({
    name: 'منتدى رواد الأعمال الشباب',
    type: 'منتدى',
    contactEmail: 'entre@youth.org',
    phone: '01030000003',
    location: 'أسيوط',
    documents: [],
  })

  register({
    name: 'Admin',
    email: 'admin@youth-platform.com',
    password: 'admin123',
    role: 'systemAdmin',
    interests: [],
    permissions: [],
  })
  register({
    name: 'Quality Lead',
    email: 'quality@youth.org',
    password: '123456',
    role: 'qualitySupervisor',
    interests: [],
    permissions: [],
  })
  register({
    name: 'Entity Manager',
    email: 'manager@youth.org',
    password: '123456',
    role: 'entityManager',
    entityId: e1.id,
    interests: [],
    permissions: [],
  })
  register({
    name: 'Ahmed Y',
    email: 'ahmed@youth.org',
    password: '123456',
    role: 'youth',
    entityId: e1.id,
    interests: ['ريادة الأعمال', 'الأدب'],
    permissions: [],
  })

  addMember({ name: 'محمد أحمد', email: 'm.ahmed@example.com', phone: '0101111111', entityId: e1.id })
  addMember({ name: 'سارة علي', email: 'sara@example.com', phone: '0102222222', entityId: e1.id })
  addMember({ name: 'نور حسن', email: 'n.hassan@example.com', phone: '0103333333', entityId: e2.id })

  addEvent({ title: 'ورشة إدارة المخاطر', date: new Date().toISOString(), status: 'approved', entityId: e1.id })
  addEvent({ title: 'حفل تكريم متطوعين', date: new Date().toISOString(), status: 'draft', entityId: e2.id })
  addEvent({ title: 'ملتقى ابتكار للشباب', date: new Date().toISOString(), status: 'done', entityId: e3.id })
  addEvent({ title: 'يوم مفتوح للكيانات', date: new Date().toISOString(), status: 'cancelled', entityId: e1.id })

  addISO({ title: 'إجراء تقييم المخاطر', code: 'ISO-PR-01', status: 'submitted', ownerEntityId: e1.id })
  addISO({ title: 'سياسة حماية الطفل', code: 'ISO-PL-09', status: 'approved', ownerEntityId: e2.id })
  addISO({ title: 'نموذج تدقيق داخلي', code: 'ISO-AU-02', status: 'review', ownerEntityId: e1.id })
  addGovernance({ title: "اعتماد لائحة السلوك", type: "policy", status: "approved", entityId: e1.id, decisionDate: new Date().toISOString(), notes: "تمت المراجعة والاعتماد" })
addGovernance({ title: "محضر اجتماع مجلس الإدارة", type: "meeting", status: "review", entityId: e2.id, notes: "قيد المراجعة" })

}

export const dataStore = {
  getUsers, register, login,
  listEntities, listMembers, listEvents, listISO, listGovernance,
  addEntity, addMember, addEvent, addISO, addGovernance,
  resetAll, seedIfEmpty,
}
