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
  primarySpecialty?: string   // nominated main specialty — shown on collapsed row
  isTeamLeader?: boolean      // team leader — renders crown badge on avatar
  band?: string               // NHS/AfC band number e.g. "6", "7"
  staffType?: "permanent" | "bank" | "agency"  // employment classification
  groupLabel?: string
  pinnedThreadIds?: string[]
  unlockedGroupIds?: string[]
  pingShortcutSets?: Partial<Record<PingRole, string[]>>
  updatedAt: number
}

export interface CommsThread {
  id: string
  type: "channel" | "direct"
  subtype?: "feed" | "group"  // channels only — "feed" = auto-generated theatre specialty, "group" = user-created
  teamType?: "theatre" | "specialty"  // channels only — set when seeded from org_teams
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

export interface CommsPingQuickReply {
  id: string
  label: string
  message: string
}

export interface CommsPingMessageMeta {
  pingId: string
  recipientUid: string
  recipientDisplayName: string
  quickReplies: CommsPingQuickReply[]
}

export interface CommsPingReplyMeta {
  pingId: string
  kind: "quick" | "custom"
  label: string
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
  deletedAt?: number
  deletedBy?: string
  deletedByName?: string
  deleteReason?: string
  originalText?: string
  originalAttachments?: CommsAttachment[]
  callAnswered?: boolean
  callDuration?: number
  callMode?: "audio" | "video"
  ping?: CommsPingMessageMeta
  pingReply?: CommsPingReplyMeta
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

export type PingCategory = "action" | "urgent" | "reminder" | "change" | "heads_up" | "question" | "confirmed"
export type PingRole = "Surgeon" | "Anaesthetist" | "Scrub" | "ODP"
export type PingShortcutSets = Record<PingRole, string[]>
export type PingStatus = "sent" | "seen" | "accepted" | "completed" | "declined" | "escalated"

export interface CommsPing {
  id: string
  category: PingCategory
  text: string
  pingRole?: PingRole
  quickReplies?: CommsPingQuickReply[]
  threadId: string
  threadName: string
  organizationId: string
  scope: "direct" | "space" | "org"
  createdBy: string
  displayName: string
  createdAt: number
  messageId?: string
  memberUids: string[]
  recipientUid?: string
  recipientDisplayName?: string
  status?: PingStatus
  seenAt?: number
  acceptedAt?: number
  completedAt?: number
  declinedAt?: number
  escalatedAt?: number
  escalatedBy?: string
  requiresAck?: boolean
  requiresCompletion?: boolean
  ackTimeoutMins?: number
  completionTimeoutMins?: number
}
