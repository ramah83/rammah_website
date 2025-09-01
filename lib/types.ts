export type UserRole = "systemAdmin" | "qualitySupervisor" | "entityManager" | "youth"

export type Session = {
  id: string
  email: string
  name: string
  role: UserRole
  entityId?: string | null
}

export type JoinRequestStatus = "pending" | "approved" | "rejected"

export type JoinRequest = {
  id: string
  userId: string
  userName: string
  userEmail: string
  entityId: string
  entityName: string
  note?: string
  status: JoinRequestStatus
  createdAt: string
  decidedAt?: string
  decidedBy?: string
}
