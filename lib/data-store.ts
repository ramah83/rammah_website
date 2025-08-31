export type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

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
  status: "draft" | "approved" | "cancelled" | "done"
  entityId?: string | null
}

export type ISOForm = {
  id: string
  title: string
  code?: string
  status: "draft" | "submitted" | "review" | "approved" | "rejected"
  ownerEntityId?: string | null
}

export type GovernanceType = "policy" | "procedure" | "minutes" | "decision" | "inquiry" | "response"
export type GovernanceStatus = "draft" | "review" | "approved" | "archived"

export type GovernanceItem = {
  id: string
  type: GovernanceType
  title: string
  content?: string
  entityId?: string | null
  status: GovernanceStatus
  date?: string       
  attachments?: string[]
}

type DB = {
  _seeded?: boolean
  users: User[]
  entities: Entity[]
  members: Member[]
  events: EventItem[]
  iso: ISOForm[]
  governance: GovernanceItem[]
}

const STORAGE_KEY = "youth_db_v1"
const isBrowser = typeof window !== "undefined"

const mem: DB = { users: [], entities: [], members: [], events: [], iso: [], governance: [] }

function readDB(): DB {
  if (!isBrowser) return mem
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { users: [], entities: [], members: [], events: [], iso: [], governance: [] }
    return JSON.parse(raw) as DB
  } catch {
    return { users: [], entities: [], members: [], events: [], iso: [], governance: [] }
  }
}

function writeDB(db: DB) {
  if (!isBrowser) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {/* ignore */}
}

function uid() {

  if (isBrowser && typeof crypto?.randomUUID === "function") return crypto.randomUUID()
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function seedDemoIfNeeded() {
  if (!isBrowser) return
  const db = readDB()
  if (db._seeded) return

  const ent1: Entity = {
    id: uid(),
    name: "مركز تنمية الشباب – القاهرة",
    type: "مركز شباب",
    contactEmail: "cairo@youth.org",
    phone: "01010000001",
    location: "القاهرة",
    documents: ["سجل تجاري.pdf", "ترخيص المركز.pdf"],
    createdAt: new Date().toISOString(),
  }
  const ent2: Entity = {
    id: uid(),
    name: "جمعية الفنون والإبداع",
    type: "جمعية",
    contactEmail: "arts@youth.org",
    phone: "01020000002",
    location: "الإسكندرية",
    documents: ["اللائحة الداخلية.pdf"],
    createdAt: new Date().toISOString(),
  }
  const ent3: Entity = {
    id: uid(),
    name: "منتدى رواد الأعمال الشباب",
    type: "منتدى",
    contactEmail: "entre@youth.org",
    phone: "01030000003",
    location: "أسيوط",
    createdAt: new Date().toISOString(),
  }

  const admin: User = { id: uid(), name: "Admin", email: "admin@youth-platform.com", password: "admin123", role: "systemAdmin", permissions: [] }
  const qm:    User = { id: uid(), name: "Quality Lead", email: "quality@youth.org", password: "123456", role: "qualitySupervisor", permissions: [] }
  const mngr:  User = { id: uid(), name: "Entity Manager", email: "manager@youth.org", password: "123456", role: "entityManager", entityId: ent1.id, permissions: [] }
  const youthUser: User = { id: uid(), name: "Ahmed Y", email: "ahmed@youth.org", password: "123456", role: "youth", entityId: ent1.id, interests: ["ريادة الأعمال", "الأدب"] }

  const m1: Member = { id: uid(), name: "محمد أحمد", email: "m.ahmed@example.com", phone: "0101111111", entityId: ent1.id, joinedAt: new Date().toISOString() }
  const m2: Member = { id: uid(), name: "سارة علي",  email: "sara@example.com",  phone: "0102222222", entityId: ent1.id, joinedAt: new Date().toISOString() }
  const m3: Member = { id: uid(), name: "نور حسن",  email: "n.hassan@example.com", phone: "0103333333", entityId: ent2.id, joinedAt: new Date().toISOString() }

  const e1: EventItem = { id: uid(), title: "ورشة إدارة المخاطر", date: new Date().toISOString(), status: "approved",  entityId: ent1.id }
  const e2: EventItem = { id: uid(), title: "حفل تكريم متطوعين",   date: new Date().toISOString(), status: "draft",     entityId: ent2.id }
  const e3: EventItem = { id: uid(), title: "ملتقى ابتكار للشباب", date: new Date().toISOString(), status: "done",      entityId: ent3.id }
  const e4: EventItem = { id: uid(), title: "يوم مفتوح للكيانات",  date: new Date().toISOString(), status: "cancelled", entityId: ent1.id }

  const f1: ISOForm = { id: uid(), title: "إجراء تقييم المخاطر", code: "ISO-PR-01", status: "submitted", ownerEntityId: ent1.id }
  const f2: ISOForm = { id: uid(), title: "سياسة حماية الطفل",   code: "ISO-PL-09", status: "approved",  ownerEntityId: ent2.id }
  const f3: ISOForm = { id: uid(), title: "نموذج تدقيق داخلي",   code: "ISO-AU-02", status: "review",    ownerEntityId: ent1.id }

  const g1: GovernanceItem = { id: uid(), type: "policy",    title: "لائحة سلوك المتطوعين", status: "approved", entityId: ent1.id, date: new Date().toISOString(), attachments: ["policy-volunteers.pdf"] }
  const g2: GovernanceItem = { id: uid(), type: "minutes",   title: "محضر اجتماع مجلس الإدارة 2025/08/15", status: "approved", entityId: ent1.id, date: new Date().toISOString() }
  const g3: GovernanceItem = { id: uid(), type: "decision",  title: "قرار اعتماد ميزانية فعالية الابتكار", status: "approved", entityId: ent3.id, date: new Date().toISOString() }
  const g4: GovernanceItem = { id: uid(), type: "inquiry",   title: "استفسار: آلية إصدار الشهادات", status: "review", entityId: ent2.id, date: new Date().toISOString() }

  writeDB({
    _seeded: true,
    users: [admin, qm, mngr, youthUser],
    entities: [ent1, ent2, ent3],
    members: [m1, m2, m3],
    events: [e1, e2, e3, e4],
    iso: [f1, f2, f3],
    governance: [g1, g2, g3, g4],
  })
}

function ensure(): DB {
  seedDemoIfNeeded()
  return readDB()
}

function getUsers() { return ensure().users }
function register(user: Omit<User, "id">) {
  const db = ensure()
  if (db.users.some(u => u.email === user.email)) return null
  const u: User = { id: uid(), ...user }
  db.users.push(u); writeDB(db); return u
}
function login(email: string, password: string) {
  const db = ensure()
  return db.users.find(x => x.email === email && x.password === password) || null
}

function listEntities(): Entity[] { return ensure().entities }
function findEntity(id: string) { return ensure().entities.find(e => e.id === id) || null }
function addEntity(data: Omit<Entity, "id" | "createdAt">) {
  const db = ensure()
  const ent: Entity = { id: uid(), createdAt: new Date().toISOString(), ...data }
  db.entities.push(ent); writeDB(db); return ent
}
function updateEntity(id: string, patch: Partial<Omit<Entity, "id" | "createdAt">>) {
  const db = ensure()
  const i = db.entities.findIndex(e => e.id === id); if (i < 0) return null
  db.entities[i] = { ...db.entities[i], ...patch }; writeDB(db); return db.entities[i]
}
function removeEntity(id: string) {
  const db = ensure()
  db.entities = db.entities.filter(e => e.id !== id)
  db.members  = db.members.filter(m => m.entityId !== id)
  db.events   = db.events.filter(ev => ev.entityId !== id)
  db.iso      = db.iso.filter(f => f.ownerEntityId !== id)
  db.governance = db.governance.filter(g => g.entityId !== id)
  writeDB(db)
}

function listMembers(): Member[] { return ensure().members }
function findMember(id: string) { return ensure().members.find(m => m.id === id) || null }
function addMember(data: Omit<Member, "id" | "joinedAt">) {
  const db = ensure()
  const m: Member = { id: uid(), joinedAt: new Date().toISOString(), ...data }
  db.members.push(m); writeDB(db); return m
}
function updateMember(id: string, patch: Partial<Omit<Member, "id" | "joinedAt">>) {
  const db = ensure()
  const i = db.members.findIndex(m => m.id === id); if (i < 0) return null
  db.members[i] = { ...db.members[i], ...patch }; writeDB(db); return db.members[i]
}
function removeMember(id: string) {
  const db = ensure()
  db.members = db.members.filter(m => m.id !== id); writeDB(db)
}

function listEvents(): EventItem[] { return ensure().events }
function findEvent(id: string) { return ensure().events.find(e => e.id === id) || null }
function addEvent(data: Omit<EventItem, "id">) {
  const db = ensure()
  const ev: EventItem = { id: uid(), ...data }
  db.events.push(ev); writeDB(db); return ev
}
function updateEvent(id: string, patch: Partial<Omit<EventItem, "id">>) {
  const db = ensure()
  const i = db.events.findIndex(e => e.id === id); if (i < 0) return null
  db.events[i] = { ...db.events[i], ...patch }; writeDB(db); return db.events[i]
}
function removeEvent(id: string) {
  const db = ensure()
  db.events = db.events.filter(e => e.id !== id); writeDB(db)
}

function listISO(): ISOForm[] { return ensure().iso }
function findISO(id: string) { return ensure().iso.find(f => f.id === id) || null }
function addISO(data: Omit<ISOForm, "id">) {
  const db = ensure()
  const f: ISOForm = { id: uid(), ...data }
  db.iso.push(f); writeDB(db); return f
}
function updateISO(id: string, patch: Partial<Omit<ISOForm, "id">>) {
  const db = ensure()
  const i = db.iso.findIndex(f => f.id === id); if (i < 0) return null
  db.iso[i] = { ...db.iso[i], ...patch }; writeDB(db); return db.iso[i]
}
function removeISO(id: string) {
  const db = ensure()
  db.iso = db.iso.filter(f => f.id !== id); writeDB(db)
}

function listGovernance(): GovernanceItem[] { return ensure().governance }
function findGovernance(id: string) { return ensure().governance.find(g => g.id === id) || null }
function addGovernance(data: Omit<GovernanceItem, "id">) {
  const db = ensure()
  const item: GovernanceItem = { id: uid(), ...data }
  db.governance.push(item); writeDB(db); return item
}
function updateGovernance(id: string, patch: Partial<Omit<GovernanceItem, "id">>) {
  const db = ensure()
  const i = db.governance.findIndex(g => g.id === id); if (i < 0) return null
  db.governance[i] = { ...db.governance[i], ...patch }; writeDB(db); return db.governance[i]
}
function removeGovernance(id: string) {
  const db = ensure()
  db.governance = db.governance.filter(g => g.id !== id); writeDB(db)
}

const createGov = addGovernance

function getStatistics() {
  const db = ensure()
  const usersByRole: Record<UserRole, number> = {
    systemAdmin: 0, qualitySupervisor: 0, entityManager: 0, youth: 0,
  }
  db.users.forEach(u => { usersByRole[u.role]++ })

  const eventStatus: Record<EventItem["status"], number> = { draft: 0, approved: 0, cancelled: 0, done: 0 }
  db.events.forEach(e => { eventStatus[e.status] = (eventStatus[e.status] || 0) + 1 })

  const isoStatus: Record<ISOForm["status"], number> = { draft: 0, submitted: 0, review: 0, approved: 0, rejected: 0 }
  db.iso.forEach(f => { isoStatus[f.status] = (isoStatus[f.status] || 0) + 1 })

  return {
    totals: {
      users: db.users.length,
      entities: db.entities.length,
      members: db.members.length,
      events: db.events.length,
      iso: db.iso.length,
      governance: db.governance.length,
    },
    usersByRole,
    eventStatus,
    isoStatus,
  }
}

function resetAll(reseed = false) {
  const empty: DB = { users: [], entities: [], members: [], events: [], iso: [], governance: [] }
  writeDB(empty)
  if (reseed) seedDemoIfNeeded()
}
const listGov   = listGovernance
const createEntity = addEntity
const createMember = addMember
const createEvent  = addEvent
const createISO    = addISO

export const dataStore = {
  getUsers,
  register,
  login,

  listEntities,
  listMembers,
  listEvents,
  listISO,

  addEntity,
  addMember,
  addEvent,
  addISO,

  createEntity,
  createMember,
  createEvent,
  createISO,

  listGovernance,
  addGovernance,
  updateGovernance,
  removeGovernance,
  listGov,
  createGov,

  resetAll,
}