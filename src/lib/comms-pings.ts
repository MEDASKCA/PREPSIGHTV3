"use client"

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from "firebase/firestore"
import type {
  CommsMessage,
  CommsPing,
  CommsPingQuickReply,
  CommsThread,
  CommsUser,
  PingCategory,
  PingRole,
  PingShortcutSets,
  PingStatus,
} from "@/lib/comms-types"

const PING_SHORTCUTS_STORAGE_KEY = "prepsight_ping_shortcuts"
const PING_SHORTCUTS_EVENT = "prepsight:ping-shortcuts-changed"

export const DEFAULT_PING_SHORTCUTS: PingShortcutSets = {
  Surgeon: [
    "In theatre now",
    "Case ready",
    "Delay 10 mins",
    "Need review",
    "Patient in room",
  ],
  Anaesthetist: [
    "Patient ready",
    "Need you in theatre",
    "Anaesthetic delay?",
    "Recovery update",
    "Proceed now",
  ],
  Scrub: [
    "Need cover",
    "Need instrument",
    "Set not complete",
    "Ready to scrub",
    "Break relief needed",
  ],
  ODP: [
    "Anaes support needed",
    "Patient transfer",
    "Room reset",
    "Equipment check",
    "Recovery handoff",
  ],
}

type PingRule = {
  category: PingCategory
  requiresAck: boolean
  requiresCompletion: boolean
  ackTimeoutMins: number
  completionTimeoutMins: number
}

const DEFAULT_PING_RULE: PingRule = {
  category: "action",
  requiresAck: true,
  requiresCompletion: true,
  ackTimeoutMins: 2,
  completionTimeoutMins: 8,
}

const PING_RULES: Record<string, PingRule> = {
  "In theatre now": { category: "heads_up", requiresAck: false, requiresCompletion: false, ackTimeoutMins: 0, completionTimeoutMins: 0 },
  "Case ready": { category: "confirmed", requiresAck: false, requiresCompletion: false, ackTimeoutMins: 0, completionTimeoutMins: 0 },
  "Delay 10 mins": { category: "change", requiresAck: false, requiresCompletion: false, ackTimeoutMins: 0, completionTimeoutMins: 0 },
  "Need review": { category: "urgent", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 2, completionTimeoutMins: 8 },
  "Patient in room": { category: "heads_up", requiresAck: false, requiresCompletion: false, ackTimeoutMins: 0, completionTimeoutMins: 0 },
  "Patient ready": { category: "confirmed", requiresAck: false, requiresCompletion: false, ackTimeoutMins: 0, completionTimeoutMins: 0 },
  "Need you in theatre": { category: "urgent", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 1, completionTimeoutMins: 6 },
  "Anaesthetic delay?": { category: "question", requiresAck: true, requiresCompletion: false, ackTimeoutMins: 2, completionTimeoutMins: 0 },
  "Recovery update": { category: "question", requiresAck: true, requiresCompletion: false, ackTimeoutMins: 4, completionTimeoutMins: 0 },
  "Proceed now": { category: "action", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 1, completionTimeoutMins: 5 },
  "Need cover": { category: "urgent", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 1, completionTimeoutMins: 5 },
  "Need instrument": { category: "urgent", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 1, completionTimeoutMins: 4 },
  "Set not complete": { category: "change", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 2, completionTimeoutMins: 8 },
  "Ready to scrub": { category: "confirmed", requiresAck: false, requiresCompletion: false, ackTimeoutMins: 0, completionTimeoutMins: 0 },
  "Break relief needed": { category: "urgent", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 1, completionTimeoutMins: 5 },
  "Anaes support needed": { category: "urgent", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 1, completionTimeoutMins: 5 },
  "Patient transfer": { category: "action", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 2, completionTimeoutMins: 10 },
  "Room reset": { category: "action", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 2, completionTimeoutMins: 10 },
  "Equipment check": { category: "action", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 2, completionTimeoutMins: 10 },
  "Recovery handoff": { category: "action", requiresAck: true, requiresCompletion: true, ackTimeoutMins: 2, completionTimeoutMins: 8 },
}

const DEFAULT_PING_QUICK_REPLIES: CommsPingQuickReply[] = [
  { id: "on-it", label: "On it", message: "On it." },
  { id: "unable", label: "Unable", message: "Unable right now." },
]

const PING_QUICK_REPLIES: Record<string, CommsPingQuickReply[]> = {
  "Need you in theatre": [
    { id: "on-my-way", label: "On my way", message: "On my way." },
    { id: "in-theatre", label: "In theatre", message: "I am in theatre." },
    { id: "cant-attend", label: "Can't attend", message: "I can't attend right now." },
  ],
  "Need review": [
    { id: "reviewing", label: "Reviewing", message: "Reviewing now." },
    { id: "attending", label: "Will attend", message: "I will attend shortly." },
    { id: "unable", label: "Unable", message: "Unable to review right now." },
  ],
  "Need cover": [
    { id: "covering", label: "Covering", message: "Covering now." },
    { id: "finding-cover", label: "Finding cover", message: "Finding cover now." },
    { id: "unable", label: "Unable", message: "Unable to cover right now." },
  ],
  "Need instrument": [
    { id: "bringing", label: "Bringing", message: "Bringing it now." },
    { id: "checking", label: "Checking", message: "Checking availability now." },
    { id: "unavailable", label: "Unavailable", message: "It is unavailable right now." },
  ],
  "Break relief needed": [
    { id: "relieving", label: "Relieving", message: "Coming to relieve you now." },
    { id: "arranging", label: "Arranging", message: "Arranging relief now." },
    { id: "unable", label: "Unable", message: "Unable to relieve right now." },
  ],
  "Anaes support needed": [
    { id: "coming", label: "Coming", message: "Coming now." },
    { id: "supporting", label: "Supporting", message: "Supporting now." },
    { id: "unable", label: "Unable", message: "Unable to support right now." },
  ],
}

export function getPingRoleFromClinicalRole(role: string): PingRole {
  const lower = role.trim().toLowerCase()
  if (lower.includes("surgical assistant") || lower.includes("assistant surgeon") || lower.includes("surgeon")) return "Surgeon"
  if (lower.includes("anaesth")) return "Anaesthetist"
  if (lower.includes("odp") || lower.includes("practitioner")) return "ODP"
  return "Scrub"
}

export function getPingRule(text: string): PingRule {
  return PING_RULES[text] ?? DEFAULT_PING_RULE
}

export function getPingQuickReplies(text: string): CommsPingQuickReply[] {
  const replies = PING_QUICK_REPLIES[text]
  return replies ? replies.map((reply) => ({ ...reply })) : DEFAULT_PING_QUICK_REPLIES.map((reply) => ({ ...reply }))
}

export function normalizePingShortcutSets(
  input?: Partial<Record<PingRole, string[]>> | null,
): PingShortcutSets {
  return {
    Surgeon: [...(input?.Surgeon ?? [])].filter(Boolean),
    Anaesthetist: [...(input?.Anaesthetist ?? [])].filter(Boolean),
    Scrub: [...(input?.Scrub ?? [])].filter(Boolean),
    ODP: [...(input?.ODP ?? [])].filter(Boolean),
  }
}

function publishPingShortcutSets(sets: PingShortcutSets) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PING_SHORTCUTS_STORAGE_KEY, JSON.stringify(sets))
  window.dispatchEvent(new CustomEvent<PingShortcutSets>(PING_SHORTCUTS_EVENT, { detail: sets }))
}

export function readCachedPingShortcutSets(): PingShortcutSets {
  if (typeof window === "undefined") return normalizePingShortcutSets()
  try {
    const raw = window.localStorage.getItem(PING_SHORTCUTS_STORAGE_KEY)
    if (!raw) return normalizePingShortcutSets()
    return normalizePingShortcutSets(JSON.parse(raw) as Partial<Record<PingRole, string[]>>)
  } catch {
    return normalizePingShortcutSets()
  }
}

export function subscribePingShortcutSets(listener: (sets: PingShortcutSets) => void): () => void {
  if (typeof window === "undefined") return () => {}

  const handleCustom = (event: Event) => {
    const detail = (event as CustomEvent<PingShortcutSets>).detail
    listener(normalizePingShortcutSets(detail))
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== PING_SHORTCUTS_STORAGE_KEY) return
    listener(readCachedPingShortcutSets())
  }

  window.addEventListener(PING_SHORTCUTS_EVENT, handleCustom as EventListener)
  window.addEventListener("storage", handleStorage)
  return () => {
    window.removeEventListener(PING_SHORTCUTS_EVENT, handleCustom as EventListener)
    window.removeEventListener("storage", handleStorage)
  }
}

export async function loadPingShortcutSets(
  firestore: Firestore,
  uid: string,
): Promise<PingShortcutSets> {
  const snap = await getDoc(doc(firestore, "comms_v5_users", uid))
  const data = snap.exists() ? (snap.data() as Partial<CommsUser>) : null
  const sets = normalizePingShortcutSets(data?.pingShortcutSets)
  publishPingShortcutSets(sets)
  return sets
}

export async function savePingShortcutSets(
  firestore: Firestore,
  uid: string,
  sets: PingShortcutSets,
): Promise<void> {
  await setDoc(
    doc(firestore, "comms_v5_users", uid),
    {
      pingShortcutSets: normalizePingShortcutSets(sets),
      updatedAt: Date.now(),
    },
    { merge: true },
  )
  publishPingShortcutSets(sets)
}

export async function resolveCommsRecipientByDisplayName(
  firestore: Firestore,
  organizationId: string,
  displayName: string,
): Promise<CommsUser | null> {
  const membershipSnap = await getDocs(
    query(
      collection(firestore, "comms_v5_memberships"),
      where("orgId", "==", organizationId),
      where("status", "==", "active"),
    ),
  )
  const membership = membershipSnap.docs
    .map((entry) => entry.data() as { uid: string; displayName?: string })
    .find((entry) => entry.displayName?.trim().toLowerCase() === displayName.trim().toLowerCase())

  if (!membership?.uid) return null

  const userSnap = await getDoc(doc(firestore, "comms_v5_users", membership.uid))
  if (!userSnap.exists()) return null
  return { uid: membership.uid, ...(userSnap.data() as Omit<CommsUser, "uid">) }
}

export async function ensureDirectThread(
  firestore: Firestore,
  organizationId: string,
  senderUid: string,
  recipientUid: string,
): Promise<CommsThread> {
  const threadSnap = await getDocs(
    query(
      collection(firestore, "comms_v5_threads"),
      where("organizationId", "==", organizationId),
    ),
  )

  const existing = threadSnap.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }) as CommsThread)
    .find((thread) => thread.type === "direct" && thread.memberUids.includes(senderUid) && thread.memberUids.includes(recipientUid))

  if (existing) return existing

  const createdAt = Date.now()
  const memberUids = [senderUid, recipientUid]
  const threadRef = await addDoc(collection(firestore, "comms_v5_threads"), {
    type: "direct",
    organizationId,
    memberUids,
    createdBy: senderUid,
    createdAt,
    updatedAt: createdAt,
    lastMessage: "",
    readBy: { [senderUid]: createdAt },
  })

  return {
    id: threadRef.id,
    type: "direct",
    organizationId,
    memberUids,
    createdBy: senderUid,
    createdAt,
    updatedAt: createdAt,
    lastMessage: "",
    readBy: { [senderUid]: createdAt },
  }
}

export async function createDirectPing(
  firestore: Firestore,
  input: {
    organizationId: string
    senderUid: string
    senderDisplayName: string
    recipientUid: string
    recipientDisplayName: string
    pingRole: PingRole
    text: string
    category?: PingCategory
    existingMessageId?: string
  },
): Promise<CommsThread> {
  const thread = await ensureDirectThread(
    firestore,
    input.organizationId,
    input.senderUid,
    input.recipientUid,
  )
  const activePing = await findActivePingForRecipient(
    firestore,
    input.organizationId,
    input.recipientUid,
  )
  if (activePing) {
    throw new Error("ACTIVE_PING_EXISTS")
  }
  const rule = getPingRule(input.text)
  const createdAt = Date.now()
  const pingRef = doc(collection(firestore, "comms_v5_pings"))
  const quickReplies = getPingQuickReplies(input.text)
  let messageId = input.existingMessageId ?? ""

  if (input.existingMessageId) {
    await updateDoc(doc(firestore, "comms_v5_messages", input.existingMessageId), {
      ping: {
        pingId: pingRef.id,
        recipientUid: input.recipientUid,
        recipientDisplayName: input.recipientDisplayName,
        quickReplies,
      },
    })
    messageId = input.existingMessageId
  } else {
    const messageRef = await addDoc(collection(firestore, "comms_v5_messages"), {
      threadId: thread.id,
      uid: input.senderUid,
      displayName: input.senderDisplayName,
      text: input.text.trim(),
      type: "text",
      organizationId: input.organizationId,
      memberUids: thread.memberUids,
      createdAt,
      ping: {
        pingId: pingRef.id,
        recipientUid: input.recipientUid,
        recipientDisplayName: input.recipientDisplayName,
        quickReplies,
      },
    } satisfies Omit<CommsMessage, "id">)
    messageId = messageRef.id
  }

  await setDoc(pingRef, {
    category: input.category ?? rule.category,
    text: input.text.trim(),
    pingRole: input.pingRole,
    quickReplies,
    threadId: thread.id,
    threadName: input.recipientDisplayName,
    organizationId: input.organizationId,
    scope: "direct",
    createdBy: input.senderUid,
    displayName: input.senderDisplayName,
    createdAt,
    messageId,
    memberUids: thread.memberUids,
    recipientUid: input.recipientUid,
    recipientDisplayName: input.recipientDisplayName,
    status: "sent",
    requiresAck: rule.requiresAck,
    requiresCompletion: rule.requiresCompletion,
    ackTimeoutMins: rule.ackTimeoutMins,
    completionTimeoutMins: rule.completionTimeoutMins,
  })

  await updateDoc(doc(firestore, "comms_v5_threads", thread.id), {
    updatedAt: createdAt,
    lastMessage: `Ping: ${input.text.trim()}`,
  })

  return thread
}

export function getEffectivePingStatus(ping: CommsPing, now = Date.now()): PingStatus {
  if (ping.status === "completed" || ping.completedAt) return "completed"
  if (ping.status === "declined" || ping.declinedAt) return "declined"
  if (ping.status === "escalated" || ping.escalatedAt) return "escalated"
  if (ping.requiresCompletion && ping.acceptedAt && ping.completionTimeoutMins && now - ping.acceptedAt > ping.completionTimeoutMins * 60_000) {
    return "escalated"
  }
  if (ping.requiresAck && !ping.acceptedAt && ping.ackTimeoutMins && now - ping.createdAt > ping.ackTimeoutMins * 60_000) {
    return "escalated"
  }
  if (ping.status === "accepted" || ping.acceptedAt) return "accepted"
  if (ping.status === "seen" || ping.seenAt) return "seen"
  return "sent"
}

export function getPingStatusLabel(ping: CommsPing, now = Date.now()): string {
  const status = getEffectivePingStatus(ping, now)
  if (status === "sent") return ping.requiresAck ? "Awaiting ack" : "Sent"
  if (status === "seen") return "Seen"
  if (status === "accepted") return ping.requiresCompletion ? "On it" : "Accepted"
  if (status === "completed") return "Done"
  if (status === "declined") return "Declined"
  return "Redirected"
}

export function isPingActive(ping: CommsPing, now = Date.now()): boolean {
  const status = getEffectivePingStatus(ping, now)
  return status !== "completed" && status !== "declined"
}

export async function markPingStatus(
  firestore: Firestore,
  pingId: string,
  status: PingStatus,
  actorUid: string,
): Promise<void> {
  const now = Date.now()
  const patch: Record<string, number | string> = { status }
  if (status === "seen") patch.seenAt = now
  if (status === "accepted") patch.acceptedAt = now
  if (status === "completed") patch.completedAt = now
  if (status === "declined") patch.declinedAt = now
  if (status === "escalated") {
    patch.escalatedAt = now
    patch.escalatedBy = actorUid
  }
  await updateDoc(doc(firestore, "comms_v5_pings", pingId), patch)
}

export async function markThreadPingsSeen(
  firestore: Firestore,
  threadId: string,
  recipientUid: string,
): Promise<CommsPing[]> {
  const now = Date.now()
  const snap = await getDocs(
    query(collection(firestore, "comms_v5_pings"), where("threadId", "==", threadId)),
  )
  const pending = snap.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }) as CommsPing)
    .filter((ping) => ping.recipientUid === recipientUid)
    .filter((ping) => getEffectivePingStatus(ping) === "sent")

  await Promise.all(
    pending.map((ping) =>
      updateDoc(doc(firestore, "comms_v5_pings", ping.id), {
        status: "completed",
        seenAt: now,
        completedAt: now,
      }),
    ),
  )
  return pending.map((ping) => ({ ...ping, status: "completed", seenAt: now, completedAt: now }))
}

export async function findActiveDuplicatePing(
  firestore: Firestore,
  organizationId: string,
  recipientUid: string,
  text: string,
): Promise<CommsPing | null> {
  const snap = await getDocs(
    query(collection(firestore, "comms_v5_pings"), where("organizationId", "==", organizationId)),
  )
  const now = Date.now()
  const candidate = snap.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }) as CommsPing)
    .filter((ping) => ping.recipientUid === recipientUid && ping.text.trim() === text.trim())
    .filter((ping) => isPingActive(ping, now))
    .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  return candidate
}

export async function findActivePingForRecipient(
  firestore: Firestore,
  organizationId: string,
  recipientUid: string,
): Promise<CommsPing | null> {
  const snap = await getDocs(
    query(collection(firestore, "comms_v5_pings"), where("organizationId", "==", organizationId)),
  )
  const now = Date.now()
  return snap.docs
    .map((entry) => ({ id: entry.id, ...entry.data() }) as CommsPing)
    .filter((ping) => ping.recipientUid === recipientUid)
    .filter((ping) => isPingActive(ping, now))
    .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
}

export function subscribeOrganizationPings(
  firestore: Firestore,
  organizationId: string,
  listener: (pings: CommsPing[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const q = query(collection(firestore, "comms_v5_pings"), where("organizationId", "==", organizationId))
  return onSnapshot(
    q,
    (snap) => listener(snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as CommsPing)),
    (error) => onError?.(error),
  )
}
