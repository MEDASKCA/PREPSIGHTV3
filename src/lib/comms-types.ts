// ─── PrepSight Comms v5 — Shared Types ────────────────────────────────────────

export interface CommsOrg {
  id: string
  name: string
  joinCode: string         // 6-char uppercase, e.g. "HOSP42"
  createdBy: string        // uid
  createdAt: number
}

export interface CommsMembership {
  uid: string
  orgId: string
  displayName: string
  status: "active" | "pending"
  joinedAt: number
}

export interface CommsUser {
  uid: string
  displayName: string
  email: string
  photoURL?: string
  hospital?: string
  department?: string
  clinicalRole?: string
  specialties?: string[]
  groupLabel?: string
  pinnedThreadIds?: string[]
  unlockedGroupIds?: string[]
  updatedAt: number
}

export interface CommsThread {
  id: string
  type: "channel" | "direct"
  name?: string            // channels only
  description?: string     // channels only
  organizationId: string
  memberUids: string[]     // for DMs: [uid1, uid2]; channels: all members
  createdBy: string
  createdAt: number
  updatedAt: number
  lastMessage?: string
  readBy?: Record<string, number>
}

export interface CommsAttachment {
  name: string
  url: string
  type: "image" | "file" | "audio"
  size: number             // bytes
}

export interface CommsReplyRef {
  messageId: string
  uid: string
  displayName: string
  text: string
}

export interface CommsMessage {
  id: string
  threadId: string
  uid: string
  displayName: string
  text: string
  type: "text" | "system" | "file" | "call"
  organizationId: string
  memberUids: string[]
  createdAt: number
  replyTo?: CommsReplyRef
  attachments?: CommsAttachment[]
  reactions?: Record<string, string[]>   // emoji → [uid, ...]
  edited?: boolean
  editedAt?: number
  deleted?: boolean
  callAnswered?: boolean
  callDuration?: number
  callMode?: "audio" | "video"
}

export interface CommsPresence {
  uid: string
  status: "online" | "away" | "offline"
  lastSeen: number
  organizationId: string
  typingThreadId?: string | null
  typingUpdatedAt?: number | null
}

export interface CommsCall {
  id: string
  callerUid: string
  calleeUid: string
  organizationId: string
  mode?: "audio" | "video"
  status: "ringing" | "active" | "ended" | "declined" | "missed"
  createdAt: number
  answeredAt?: number
  endedAt?: number
}
