"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { addDoc, collection, doc, getDocs, getDoc, query as fsQuery, where } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Search, X, MessageCircle, Users } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchGroupKey = "messages" | "procedures" | "people" | "resources"

type SearchResult = {
  id: string
  title: string
  line1: string
  line2: string
  keywords: string[]
  badge?: string
}

type SearchGroup = {
  key: SearchGroupKey
  title: string
  results: SearchResult[]
}

type MemberRecord = {
  uid: string
  displayName: string
  clinicalRole?: string
  department?: string
  specialties?: string[]
}

type SessionRecord = {
  theatre: string
  specialty: string
  staff: string[]
}

type GroupCard = {
  id: string
  name: string
  subtitle: string
  memberUids: string[]
  type: "theatre" | "specialty"
}

// ─── Module-level cache (survives unmounts, invalidates daily) ────────────────

let _cachedOrgId: string | null = null
let _cachedMembers: MemberRecord[] = []
let _cachedSessions: SessionRecord[] = []
let _cacheDate = ""

// ─── Static groups (procedures, messages, resources) ─────────────────────────

const DEFAULT_RECENTS = [
  "lap chole",
  "Spinal anaesthesia checklist",
  "Dr Ahmed Khan",
  "ERAS protocol",
  "Theatre 3 schedule",
]

const STATIC_GROUPS: SearchGroup[] = [
  {
    key: "procedures",
    title: "Procedures",
    results: [
      {
        id: "procedure-lap-chole",
        title: "Laparoscopic Cholecystectomy",
        line1: "General Surgery",
        line2: "Royal Free Hospital · Updated 2w ago",
        keywords: ["lap chole", "laparoscopic cholecystectomy", "cholecystectomy", "general surgery"],
      },
      {
        id: "procedure-spinal-checklist",
        title: "Spinal Anaesthesia Checklist",
        line1: "Anaesthetics",
        line2: "Royal Free Hospital · Updated 5d ago",
        keywords: ["spinal anaesthesia checklist", "spinal", "anaesthesia", "checklist"],
      },
      {
        id: "procedure-eras",
        title: "ERAS Protocol",
        line1: "Perioperative pathway",
        line2: "Royal Free Hospital · Updated 1w ago",
        keywords: ["eras protocol", "eras", "protocol", "enhanced recovery"],
      },
    ],
  },
  {
    key: "messages",
    title: "Messages",
    results: [
      {
        id: "message-tom-lap-chole",
        title: "TOM",
        line1: "\"Lap chole set missing clips for 5mm.\"",
        line2: "Theatres Chat · 19:46",
        keywords: ["lap chole", "clips", "5mm", "tom", "theatres chat"],
      },
      {
        id: "message-theatre-3-schedule",
        title: "Theatre Coordination",
        line1: "\"Theatre 3 schedule updated for the afternoon list.\"",
        line2: "Theatres Chat · 08:15",
        keywords: ["theatre 3 schedule", "theatre 3", "schedule", "afternoon list"],
      },
    ],
  },
  {
    key: "resources",
    title: "Resources",
    results: [
      {
        id: "resource-lap-chole-checklist",
        title: "Laparoscopic Cholecystectomy checklist",
        line1: "PrepSight Library · Updated 3w ago",
        line2: "Royal Free Hospital",
        keywords: ["lap chole", "laparoscopic cholecystectomy checklist", "checklist"],
        badge: "PDF",
      },
      {
        id: "resource-spinal-checklist-pdf",
        title: "Spinal Anaesthesia Checklist",
        line1: "PrepSight Library · Updated 1w ago",
        line2: "Department resource",
        keywords: ["spinal anaesthesia checklist", "spinal", "anaesthesia"],
        badge: "PDF",
      },
      {
        id: "resource-eras-protocol",
        title: "ERAS Protocol",
        line1: "PrepSight Library · Updated 6d ago",
        line2: "Enhanced recovery pathway",
        keywords: ["eras protocol", "eras", "protocol"],
        badge: "DOC",
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function matchesQuery(q: string, result: SearchResult) {
  const nq = normalize(q)
  if (!nq) return true
  const tokens = nq.split(" ").filter(Boolean)
  const haystack = normalize([result.title, result.line1, result.line2, ...result.keywords].join(" "))
  return tokens.every(t => haystack.includes(t))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function renderHighlighted(text: string, q: string) {
  const tokens = Array.from(new Set(normalize(q).split(" ").filter(Boolean))).sort((a, b) => b.length - a.length)
  if (!tokens.length) return text
  const regex = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi")
  return text.split(regex).map((part, i) =>
    tokens.some(t => part.toLowerCase() === t.toLowerCase())
      ? <span key={i} className="text-[#67CFCF]">{part}</span>
      : <Fragment key={i}>{part}</Fragment>
  )
}

const AVATAR_COLORS = ["#0096C7", "#0e7490", "#7c3aed", "#059669", "#b45309", "#0f766e", "#be185d", "#1d4ed8"]

function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?"
}

function MiniAvatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, background: avatarColor(name), fontSize: Math.round(size * 0.37) }}
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    >
      {getInitials(name)}
    </div>
  )
}

// Overlapping stack of up to 3 small avatars
function AvatarStack({ uids, members }: { uids: string[]; members: MemberRecord[] }) {
  const shown = uids.slice(0, 3)
  const width = shown.length === 1 ? 28 : shown.length === 2 ? 42 : 52
  return (
    <div style={{ width, height: 28 }} className="relative shrink-0">
      {shown.map((uid, i) => {
        const m = members.find(x => x.uid === uid)
        const name = m?.displayName ?? uid
        return (
          <div
            key={uid}
            style={{
              position: "absolute",
              left: i * 12,
              zIndex: shown.length - i,
              width: 28,
              height: 28,
              background: avatarColor(name),
              fontSize: 9,
              outline: "2.5px solid #0f0f0f",
            }}
            className="flex items-center justify-center rounded-full font-bold text-white"
          >
            {getInitials(name)}
          </div>
        )
      })}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileGlobalSearchOverlay({
  open,
  onClose,
  halfScreen = false,
  rightHalf = false,
}: {
  open: boolean
  onClose: () => void
  halfScreen?: boolean
  rightHalf?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENTS)
  const [members, setMembers] = useState<MemberRecord[]>(_cachedMembers)
  const [sessions, setSessions] = useState<SessionRecord[]>(_cachedSessions)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState<string | null>(null)

  // ── Fetch contacts + sessions on open ──────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setSearchQuery("")
    window.setTimeout(() => inputRef.current?.focus(), 120)

    const today = new Date().toISOString().slice(0, 10)
    if (_cachedOrgId && _cacheDate === today && _cachedMembers.length > 0) {
      setMembers(_cachedMembers)
      setSessions(_cachedSessions)
      return
    }

    const uid = auth?.currentUser?.uid
    if (!uid || !db) return

    setLoadingContacts(true)
    const firestore = db

    getDocs(fsQuery(
      collection(firestore, "comms_v5_memberships"),
      where("uid", "==", uid),
      where("status", "==", "active"),
    ))
      .then(async snap => {
        if (snap.empty) { setLoadingContacts(false); return }

        const orgId = snap.docs[0].data().orgId as string
        _cachedOrgId = orgId
        _cacheDate = today

        const msSnap = await getDocs(fsQuery(
          collection(firestore, "comms_v5_memberships"),
          where("orgId", "==", orgId),
          where("status", "==", "active"),
        ))
        const uids = [...new Set(msSnap.docs.map(d => d.data().uid as string).filter(Boolean))]
        const users: MemberRecord[] = []
        await Promise.all(uids.map(async u => {
          const ud = await getDoc(doc(firestore, "comms_v5_users", u))
          if (ud.exists()) users.push({ uid: u, ...(ud.data() as Omit<MemberRecord, "uid">) })
        }))
        _cachedMembers = users
        setMembers(users)

        const sSnap = await getDocs(fsQuery(
          collection(firestore, "theatre_sessions"),
          where("date", "==", today),
        ))
        const sess: SessionRecord[] = sSnap.docs.map(d => {
          const data = d.data()
          const staffRaw: unknown[] = Array.isArray(data.staff) ? data.staff : []
          return {
            theatre: (data.theatre as string) ?? "",
            specialty: (data.specialty as string) ?? "",
            staff: staffRaw.map(s => typeof s === "string" ? s : ((s as Record<string, string>)?.name ?? "")).filter(Boolean),
          }
        })
        _cachedSessions = sess
        setSessions(sess)
        setLoadingContacts(false)
      })
      .catch(() => setLoadingContacts(false))
  }, [open])

  // ── On Shift Now: unique staff across all today's sessions ─────────────────
  const onShiftMembers = useMemo<MemberRecord[]>(() => {
    const seen = new Set<string>()
    const result: MemberRecord[] = []
    for (const s of sessions) {
      for (const name of s.staff) {
        const key = name.toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)
        const match = members.find(m => m.displayName?.toLowerCase() === key)
        result.push(match ?? { uid: name, displayName: name })
      }
    }
    return result
  }, [sessions, members])

  // ── uid → theatre names (for augmenting people search keywords) ────────────
  const memberTheatreMap = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const session of sessions) {
      for (const staffName of session.staff) {
        const m = members.find(x => x.displayName?.toLowerCase() === staffName.toLowerCase())
        if (!m) continue
        const list = map.get(m.uid) ?? []
        list.push(session.theatre)
        map.set(m.uid, list)
      }
    }
    return map
  }, [sessions, members])

  // ── Group cards: theatres + specialties matching the query ─────────────────
  const groupCards = useMemo<GroupCard[]>(() => {
    const q = normalize(searchQuery.trim())
    if (!q) return []
    const cards: GroupCard[] = []

    // Theatre matches
    for (const session of sessions) {
      if (!session.theatre) continue
      if (!normalize(session.theatre).includes(q)) continue
      const staffUids = session.staff
        .map(name => members.find(m => m.displayName?.toLowerCase() === name.toLowerCase())?.uid)
        .filter((uid): uid is string => Boolean(uid))
      cards.push({
        id: `theatre-${session.theatre}`,
        name: session.theatre,
        subtitle: `${session.staff.length} on shift today${session.specialty ? ` · ${session.specialty}` : ""}`,
        memberUids: staffUids,
        type: "theatre",
      })
    }

    // Specialty / department matches (deduplicated)
    const seen = new Set<string>()
    for (const m of members) {
      const labels = [m.department, ...(m.specialties ?? [])].filter(Boolean) as string[]
      for (const label of labels) {
        if (seen.has(label)) continue
        if (!normalize(label).includes(q)) continue
        seen.add(label)
        const matched = members.filter(x => x.department === label || x.specialties?.includes(label))
        cards.push({
          id: `specialty-${label}`,
          name: label,
          subtitle: `${matched.length} member${matched.length === 1 ? "" : "s"}`,
          memberUids: matched.map(x => x.uid),
          type: "specialty",
        })
      }
    }

    return cards
  }, [searchQuery, sessions, members])

  // ── People search: name / role / department / specialties / theatre ─────────
  const peopleResults = useMemo<SearchResult[]>(() => {
    const q = normalize(searchQuery.trim())
    if (!q || !members.length) return []
    const tokens = q.split(" ").filter(Boolean)
    return members
      .filter(m => {
        const haystack = normalize([
          m.displayName,
          m.clinicalRole ?? "",
          m.department ?? "",
          ...(m.specialties ?? []),
          ...(memberTheatreMap.get(m.uid) ?? []),
        ].join(" "))
        return tokens.every(t => haystack.includes(t))
      })
      .slice(0, 8)
      .map(m => ({
        id: m.uid,
        title: m.displayName,
        line1: m.clinicalRole ?? m.department ?? "",
        line2: m.department && m.clinicalRole ? m.department : "",
        keywords: [],
      }))
  }, [searchQuery, members, memberTheatreMap])

  // ── Static search results (procedures, messages, resources) ───────────────
  const staticGroups = useMemo<SearchGroup[]>(() => {
    if (!searchQuery.trim()) return []
    return STATIC_GROUPS
      .map(g => ({ ...g, results: g.results.filter(r => matchesQuery(searchQuery, r)) }))
      .filter(g => g.results.length > 0)
  }, [searchQuery])

  const hasAnyResults = groupCards.length > 0 || peopleResults.length > 0 || staticGroups.length > 0

  // ── Find or create group thread, navigate to Comms ─────────────────────────
  async function handleGroupTap(card: GroupCard) {
    if (!db || !_cachedOrgId || !auth?.currentUser) return
    setCreatingGroup(card.id)
    const firestore = db
    const currentUid = auth.currentUser.uid
    const allMemberUids = [...new Set([currentUid, ...card.memberUids])]

    try {
      const snap = await getDocs(fsQuery(
        collection(firestore, "comms_v5_threads"),
        where("organizationId", "==", _cachedOrgId),
        where("name", "==", card.name),
        where("type", "==", "channel"),
      ))
      const existing = snap.docs.find(d => (d.data().memberUids as string[])?.includes(currentUid))
      let threadId: string

      if (existing) {
        threadId = existing.id
      } else {
        const ref = await addDoc(collection(firestore, "comms_v5_threads"), {
          type: "channel",
          subtype: "group",
          name: card.name,
          organizationId: _cachedOrgId,
          memberUids: allMemberUids,
          createdBy: currentUid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
        threadId = ref.id
      }

      onClose()
      router.push(`/comms?threadId=${threadId}`)
    } catch {
      setCreatingGroup(null)
    }
  }

  function goToPerson(displayName: string) {
    onClose()
    router.push(`/comms?dmWith=${encodeURIComponent(displayName)}`)
  }

  if (!open) return null

  return (
    <>
      <style jsx global>{`
        @keyframes mobileGlobalSearchFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes mobileGlobalSearchDrawerIn {
          from { transform: translateX(-28px) scale(0.985); opacity: 0; }
          to   { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="fixed z-[35] bg-black/58 text-white lg:hidden"
        style={{
          animation: "mobileGlobalSearchFadeIn 260ms ease-out both",
          top: 0, bottom: 0,
          left: rightHalf ? "50%" : 0,
          right: halfScreen ? "50%" : 0,
        }}
        onClick={onClose}
      >
        <div
          className="h-full overflow-y-auto rounded-r-[32px] rounded-tl-[24px] border-r border-t border-[#2d2d2d] bg-[linear-gradient(180deg,#111111_0%,#0a0a0a_100%)] px-4 shadow-[18px_0_44px_rgba(0,0,0,0.5)]"
          style={{
            width: (halfScreen || rightHalf) ? "min(88%,29rem)" : "min(88vw,29rem)",
            animation: "mobileGlobalSearchDrawerIn 300ms cubic-bezier(0.22,1,0.36,1) both",
            paddingTop: "calc(env(safe-area-inset-top,0px) + 12px)",
            paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 108px)",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close */}
          <div className="mb-2 flex items-start justify-end">
            <button type="button" onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#d8d8d8] transition-colors hover:bg-[#1a1a1a] hover:text-white"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search input */}
          <label className="flex min-w-0 items-center rounded-full border border-[#2d2d2d] bg-[#161616] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <Search size={14} className="mr-2.5 shrink-0 text-white" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people, teams, procedures…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="ml-2 shrink-0 text-[#555]">
                <X size={13} />
              </button>
            )}
          </label>

          {/* ── Default state ── */}
          {!searchQuery.trim() ? (
            <div className="pt-5">

              {/* On Shift Now */}
              {(onShiftMembers.length > 0 || loadingContacts) && (
                <section className="mb-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-white">On Shift Now</h2>
                    {loadingContacts && <span className="text-[11px] text-[#333]">Loading…</span>}
                  </div>
                  {onShiftMembers.length > 0 ? (
                    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {onShiftMembers.map(m => (
                        <button key={m.uid} type="button" onClick={() => goToPerson(m.displayName)}
                          className="flex shrink-0 flex-col items-center gap-1.5"
                        >
                          <div className="relative">
                            <MiniAvatar name={m.displayName} size={44} />
                            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111111] bg-[#22c55e]" />
                          </div>
                          <span className="w-[48px] truncate text-center text-[10.5px] leading-tight text-white">
                            {m.displayName.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
                          <div className="h-[44px] w-[44px] animate-pulse rounded-full bg-[#1c1c1c]" />
                          <div className="h-2 w-10 animate-pulse rounded bg-[#1c1c1c]" />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Recent searches */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-white">Recent</h2>
                  {recentSearches.length > 0 && (
                    <button type="button" onClick={() => setRecentSearches([])}
                      className="text-[12px] text-[#0096C7] hover:text-[#67cfcf]">
                      Clear
                    </button>
                  )}
                </div>
                {recentSearches.length === 0 ? (
                  <p className="text-[13px] text-[#444]">No recent searches</p>
                ) : recentSearches.map(item => (
                  <button key={item} type="button" onClick={() => setSearchQuery(item)}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2.5 text-left transition-colors hover:bg-[#141414]"
                  >
                    <Search size={13} className="shrink-0 text-white" />
                    <span className="text-[13.5px] text-[#c8c8c8]">{item}</span>
                  </button>
                ))}
              </section>
            </div>

          ) : (
            /* ── Active query state ── */
            <div className="pt-5">
              {hasAnyResults ? (
                <div className="space-y-6">

                  {/* ── Group cards ── */}
                  {groupCards.length > 0 && (
                    <section>
                      <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-white">Groups</h2>
                      <div className="space-y-2">
                        {groupCards.map(card => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => handleGroupTap(card)}
                            disabled={creatingGroup === card.id}
                            className="flex w-full items-center gap-3.5 rounded-2xl border border-[#1d1d1d] bg-[#0d0d0d] px-3.5 py-3 text-left transition-colors hover:bg-[#121212] active:bg-[#1a1a1a] disabled:opacity-60"
                          >
                            {/* Stacked avatars or icon */}
                            {card.memberUids.length > 0 ? (
                              <AvatarStack uids={card.memberUids} members={members} />
                            ) : (
                              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                                card.type === "theatre" ? "bg-[#0096C7]/15" : "bg-[#7c3aed]/15"
                              }`}>
                                <Users size={13} className={card.type === "theatre" ? "text-[#38bdf8]" : "text-[#a78bfa]"} />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-semibold text-white">
                                {renderHighlighted(card.name, searchQuery)}
                              </p>
                              <p className="mt-0.5 text-[12px] text-white">{card.subtitle}</p>
                            </div>

                            {creatingGroup === card.id ? (
                              <span className="shrink-0 text-[11px] text-[#444]">Opening…</span>
                            ) : (
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                card.type === "theatre"
                                  ? "bg-[#0096C7]/12 text-[#38bdf8]"
                                  : "bg-[#7c3aed]/12 text-[#a78bfa]"
                              }`}>
                                {card.type === "theatre" ? "Shift group" : "Team"}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── People ── */}
                  {peopleResults.length > 0 && (
                    <section>
                      <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.07em] text-white">People</h2>
                      <div className="space-y-0.5">
                        {peopleResults.map(result => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => goToPerson(result.title)}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-[#141414] active:bg-[#1a1a1a]"
                          >
                            <MiniAvatar name={result.title} size={36} />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium text-white">
                                {renderHighlighted(result.title, searchQuery)}
                              </p>
                              {result.line1 && (
                                <p className="mt-0.5 text-[12px] text-white">
                                  {renderHighlighted(result.line1, searchQuery)}
                                </p>
                              )}
                            </div>
                            <MessageCircle size={14} className="shrink-0 text-[#2a2a2a]" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* ── Static groups (procedures, messages, resources) ── */}
                  {staticGroups.map(group => (
                    <section key={group.key}>
                      <div className="mb-2.5 flex items-center justify-between">
                        <h2 className="text-[12px] font-semibold uppercase tracking-[0.07em] text-white">{group.title}</h2>
                        {group.results.length > 3 && (
                          <button type="button" className="text-[12px] text-[#0096C7] hover:text-[#67cfcf]">View all</button>
                        )}
                      </div>
                      <div>
                        {group.results.map(result => (
                          <div key={result.id}
                            className="flex items-start justify-between gap-3 border-b border-[#161616] px-1 py-3 last:border-b-0 hover:bg-[#0f0f0f]"
                          >
                            <div className="min-w-0">
                              <p className="text-[13.5px] text-white">{renderHighlighted(result.title, searchQuery)}</p>
                              {result.line1 && <p className="mt-0.5 text-[12px] text-white">{renderHighlighted(result.line1, searchQuery)}</p>}
                              {result.line2 && <p className="mt-0.5 text-[11px] text-white">{renderHighlighted(result.line2, searchQuery)}</p>}
                            </div>
                            {result.badge && (
                              <span className="shrink-0 rounded-full border border-[#1f1f1f] bg-[#101010] px-2 py-0.5 text-[10px] text-[#0096C7]">
                                {result.badge}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}

                </div>
              ) : (
                <div className="pt-20 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#151515] text-[#0096C7]">
                    <Search size={24} />
                  </div>
                  <p className="mt-5 text-[20px] text-white">No results</p>
                  <p className="mt-2 text-[13px] text-[#555]">Try a name, role, theatre, or procedure.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}