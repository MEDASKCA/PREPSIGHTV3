"use client"

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore"
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage"
import {
  ArrowLeft,
  Bell,
  Bot,
  BriefcaseMedical,
  ChevronsUpDown,
  ChevronRight,
  CircleDot,
  Clock3,
  FolderClosed,
  Info,
  LibraryBig,
  Menu,
  MessageCircle,
  Plus,
  Search,
  SendHorizontal,
  Settings2,
  Sparkles,
  Sun,
  Moon,
  UserRound,
  Users,
} from "lucide-react"
import { onAuthChange } from "@/lib/auth"
import {
  applyUserPreferences,
  readUserPreferences,
  saveUserPreferences,
  type AppearanceTheme,
  type UserPreferences,
} from "@/lib/user-preferences"
import BookmarksPageClient from "@/components/BookmarksPageClient"
import CalendarPageClient from "@/components/CalendarPageClient"
import { EmbeddedLibrariesDashboardMobile } from "@/components/LibrariesDashboard"
import LibraryPageClient from "@/components/LibraryPageClient"
import { db, storage } from "@/lib/firebase"
import { getBookmarksSnapshot, subscribeBookmarks } from "@/lib/bookmarks"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { getActiveTeamSnapshot, getPendingTeamWorkspacesForProfile, getTeamMembersSnapshot, getTeamWorkspacesForProfile, subscribeTeams } from "@/lib/team-workspaces"
import {
  CHAT_FILTERS,
  CHAT_STORAGE_KEY,
  COLLECTIONS,
  LOGISTICS_SECTIONS,
  SEED_THREADS,
  SEED_TOM,
  TAB_ITEMS,
  TOM_STORAGE_KEY,
  UPDATES,
} from "@/v4/data"
import type {
  AssistantMessage,
  ChatFilter,
  ChatMessage,
  ChatThread,
  CollectionKey,
  CollectionSummary,
  LogisticsKey,
  LogisticsSummary,
  TabKey,
  UpdateKey,
  UpdateSummary,
} from "@/v4/types"
import { formatNow, getInitials, loadStoredState } from "@/v4/utils"

/*
const UNUSED_COLLECTIONS: CollectionSummary[] = [
  {
    key: "community",
    title: "Community",
    subtitle: "Shared collections for this workspace.",
    summary: "Operating Theatre shared procedures are ready to browse.",
    accent: "#6ACDE5",
    items: [
      { title: "PSH-000/Operating Theatre", meta: "1219 procedures Â· PrepSight library" },
      { title: "PSH-000/Trauma and Orthopaedics", meta: "164 procedures Â· PrepSight library" },
    ],
  },
  {
    key: "groups",
    title: "My Groups",
    subtitle: "Collections specific to your organisation or access scope.",
    summary: "Royal London Hospital local cards are in progress.",
    accent: "#5CC7C4",
    items: [
      { title: "Royal London Hospital/My Local Cards", meta: "2 procedures Â· Royal London Hospital library" },
      { title: "Royal London Hospital/The Royal London Hospital Local Cards", meta: "3 procedures Â· Royal London Hospital library" },
    ],
  },
  {
    key: "bookmarks",
    title: "Bookmarks",
    subtitle: "Your saved procedure shortcuts.",
    summary: "Jump back into revision knee, shoulder setup, and day-case favourites.",
    accent: "#F2C86B",
    items: [
      { title: "Cemented Total Knee Replacement", meta: "Community Â· Trauma and Orthopaedics" },
      { title: "Shoulder Arthroscopy Setup", meta: "Community Â· Orthopaedics" },
    ],
  },
  {
    key: "review",
    title: "Review",
    subtitle: "Validation and moderation.",
    summary: "Items waiting for approval and publication decisions.",
    accent: "#8EC5FF",
    items: [
      { title: "4 local changes awaiting review", meta: "2 from My Groups Â· 2 from Community" },
      { title: "1 catalogue item flagged", meta: "Orthopaedic instrument detail mismatch" },
    ],
  },
  {
    key: "calendar",
    title: "Calendar",
    subtitle: "Schedules and case planning.",
    summary: "Planned work, upcoming sessions, and pinned cases.",
    accent: "#9AB7FF",
    items: [
      { title: "Monday trauma list", meta: "08:00 Â· Operating Theatre" },
      { title: "Revision hip planning", meta: "14:00 Â· Royal London Ortho" },
    ],
  },
  {
    key: "catalogue",
    title: "Catalogue",
    subtitle: "Products, stock, and references.",
    summary: "Open the product and stock views without leaving the app.",
    accent: "#AFA8FF",
    items: [
      { title: "Hip system components", meta: "14 linked products" },
      { title: "Stockroom watchlist", meta: "3 items below preferred level" },
    ],
  },
  {
    key: "directory",
    title: "Directory",
    subtitle: "Hospitals and operational contacts.",
    summary: "Quick access to the people and places around the work.",
    accent: "#7FD0D3",
    items: [
      { title: "Royal London Hospital", meta: "Active workspace" },
      { title: "St Thomas' NHS Trust", meta: "Connected reference site" },
    ],
  },
]

const UNUSED_LOGISTICS_SECTIONS: LogisticsSummary[] = [
  {
    key: "members",
    title: "Members",
    detail: "42 active across 6 groups",
    tone: "#D7F2FB",
    rows: [
      { title: "Royal London Ortho", meta: "12 members Â· 3 online now" },
      { title: "Endoscopy North Wing", meta: "8 members Â· 2 pending invites" },
    ],
  },
  {
    key: "access",
    title: "Access requests",
    detail: "5 pending approval",
    tone: "#E5F7ED",
    rows: [
      { title: "2 requests awaiting review", meta: "Royal London Ortho" },
      { title: "3 requests awaiting review", meta: "Endoscopy North Wing" },
    ],
  },
  {
    key: "equipment",
    title: "Equipment readiness",
    detail: "3 items flagged for review",
    tone: "#EAF0FF",
    rows: [
      { title: "Revision knee tray note", meta: "Pinned to group thread" },
      { title: "Shoulder scope tower", meta: "Service check due tomorrow" },
    ],
  },
]

const UNUSED_UPDATES: UpdateSummary[] = [
  {
    key: "community",
    title: "Community update",
    detail: "Operating Theatre now has 4 new shared cards ready for review.",
    time: "5m",
    body: "The latest shared cards cover revision knee setup, arthroscopy shoulder setup, airway handover notes, and day-case cataract flow.",
  },
  {
    key: "logistics",
    title: "Logistics",
    detail: "2 access approvals are waiting in Royal London Ortho.",
    time: "22m",
    body: "Two new joiners requested access this morning. One needs group approval and one needs workspace approval.",
  },
  {
    key: "bookmarks",
    title: "Bookmarks",
    detail: "Your shoulder and revision knee shortcuts were updated yesterday.",
    time: "1d",
    body: "The latest edits touched implants, setup, and closure notes in the cards you saved most often.",
  },
]

function unusedGetInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function unusedFormatNow() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())
}

function unusedLoadStoredState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
*/

function Avatar({
  label,
  accent,
  online = false,
  imageSrc,
  sizeClass = "h-12 w-12",
}: {
  label: string
  accent: string
  online?: boolean
  imageSrc?: string
  sizeClass?: string
}) {
  return (
    <div className="relative shrink-0">
      <div
        className={`flex ${sizeClass} items-center justify-center overflow-hidden rounded-full text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(16,36,62,0.16)]`}
        style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}CC 100%)` }}
      >
        {imageSrc ? <img src={imageSrc} alt={label} className="h-full w-full object-cover" /> : getInitials(label)}
      </div>
      {online ? <span className="absolute right-0 bottom-0 h-3.5 w-3.5 rounded-full border-2 border-[#07111D] bg-[#2DD4BF]" /> : null}
    </div>
  )
}

function MobileFrame({ children, isDark }: { children: React.ReactNode; isDark: boolean }) {
  return (
    <div className={`min-h-screen lg:hidden ${isDark ? "bg-[#06111B] text-white" : "bg-[#EAF4F7] text-[#10243E]"}`}>
      <div className={`mx-auto min-h-screen max-w-[460px] shadow-[0_0_0_1px_rgba(145,190,210,0.08)] ${isDark ? "bg-[linear-gradient(180deg,#07111D_0%,#0A1524_100%)]" : "bg-[linear-gradient(180deg,#F7FCFD_0%,#EEF5F8_100%)]"}`}>
        {children}
      </div>
    </div>
  )
}

function DrawerCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[20px] border border-white/6 bg-white/5 p-4">
      <p className="text-[15px] font-medium text-white">{title}</p>
      <p className="mt-1 text-[13px] leading-5 text-[#9DB0C4]">{description}</p>
    </div>
  )
}

function LibraryCollectionCard({
  title,
  subtitle,
  summary,
  accent,
  infoOpen,
  onClick,
  onToggleInfo,
}: {
  title: string
  subtitle: string
  summary: string
  accent: string
  infoOpen: boolean
  onClick: () => void
  onToggleInfo: () => void
}) {
  return (
    <div className="w-full rounded-[24px] border border-[#A9DBEA] bg-[#F7FCFE] px-4 py-4 text-left shadow-[0_12px_28px_rgba(16,36,62,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-start gap-3 text-left">
          <div
            className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white"
            style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}D8 100%)` }}
          >
            <FolderClosed size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#10243E]">{title}</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleInfo}
            aria-label={`Show information about ${title}`}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F4FA] text-[#4D6B80]"
          >
            <Info size={15} />
          </button>
          <ChevronRight size={18} className="mt-0.5 shrink-0 text-[#5A7288]" />
        </div>
      </div>
      {infoOpen ? (
        <div className="ml-14 mt-3 rounded-[16px] bg-[#EAF6FB] px-3 py-3">
          <p className="text-[13px] text-[#597389]">{subtitle}</p>
          <p className="mt-2 text-[14px] leading-6 text-[#35516A]">{summary}</p>
        </div>
      ) : null}
    </div>
  )
}

function DesktopRailMessage({
  message,
  threadAccent,
}: {
  message: ChatMessage
  threadAccent: string
}) {
  const isSelf = message.sender === "self"
  const isTom = message.sender === "tom"

  return (
    <div className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[84%]">
        {!isSelf ? (
          <div className="mb-1 flex items-center gap-2 px-1">
            {isTom ? (
              <Avatar label="TOM" accent="#0F7DBA" imageSrc="/logo-medaskca.png" sizeClass="h-8 w-8" />
            ) : (
              <Avatar label={message.author} accent={threadAccent} sizeClass="h-8 w-8" />
            )}
          </div>
        ) : null}
        <div
          className={`rounded-[20px] px-4 py-3 text-[14px] leading-6 ${
            isSelf
              ? "rounded-br-[8px] bg-[#0096C7] text-white"
              : isTom
                ? "rounded-bl-[8px] bg-[#D7F2FB] text-[#10243E]"
                : "rounded-bl-[8px] bg-[#D7F2FB] text-[#10243E]"
          }`}
        >
          {message.imageUrl ? (
            <div className={message.body ? "space-y-3" : ""}>
              <img src={message.imageUrl} alt={message.imageName ?? "Shared image"} className="max-h-64 w-full rounded-[14px] object-cover" />
              {message.body ? <p>{message.body}</p> : null}
            </div>
          ) : (
            message.body
          )}
        </div>
      </div>
    </div>
  )
}

type CommsThreadRecord = {
  id: string
  organizationId: string
  type: "group" | "direct"
  title: string
  subtitle: string
  accent: string
  memberUids: string[]
  memberNames: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
  lastMessageBody?: string
  lastMessageImageUrl?: string
}

type CommsMessageRecord = {
  id: string
  threadId: string
  organizationId: string
  senderUid?: string
  senderKind: "user" | "tom"
  author: string
  body: string
  imageUrl?: string
  imageName?: string
  createdAt: string
}

type CommsReadRecord = {
  id: string
  organizationId: string
  threadId: string
  uid: string
  readAt: string
}

function formatThreadTime(value?: string) {
  if (!value) return "Now"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Now"

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function buildThreadPreview(input: { body?: string; imageUrl?: string }) {
  const trimmedBody = input.body?.trim()
  if (trimmedBody) return trimmedBody
  if (input.imageUrl) return "Photo"
  return "No messages yet"
}

function buildCommsReadDocId(uid: string, threadId: string) {
  return `${uid}__${threadId}`.replace(/[^a-zA-Z0-9:_-]+/g, "-")
}

function buildCommsReadStorageKey(uid?: string | null, organizationId?: string) {
  if (!uid || !organizationId) return "prepsight_comms_reads_local"
  return `prepsight_comms_reads_${uid}_${organizationId}`
}

function readCommsReadState(uid?: string | null, organizationId?: string) {
  if (typeof window === "undefined") return {} as Record<string, string>
  try {
    const raw = window.localStorage.getItem(buildCommsReadStorageKey(uid, organizationId))
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function saveCommsReadState(state: Record<string, string>, uid?: string | null, organizationId?: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(buildCommsReadStorageKey(uid, organizationId), JSON.stringify(state))
}

function ThemeButton({
  isDark,
  onToggle,
  subtle = false,
}: {
  isDark: boolean
  onToggle: () => void
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-11 w-11 items-center justify-center rounded-full ${
        subtle ? (isDark ? "bg-white/6 text-white" : "border border-[#A8D6E5] bg-white text-[#22425C]") : "border border-[#0F4C5C] bg-white/88 text-[#22425C]"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

export default function PrepSightV4App() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences>(() => readUserPreferences())
  const [activeTab, setActiveTab] = useState<TabKey>("chat")
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all")
  const [threads, setThreads] = useState<ChatThread[]>(SEED_THREADS)
  const [remoteThreads, setRemoteThreads] = useState<CommsThreadRecord[]>([])
  const [remoteMessages, setRemoteMessages] = useState<CommsMessageRecord[]>([])
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>("group-ortho")
  const [threadDraft, setThreadDraft] = useState("")
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)
  const [threadReadState, setThreadReadState] = useState<Record<string, string>>({})
  const [remoteThreadReadState, setRemoteThreadReadState] = useState<Record<string, string>>({})
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [newChatMode, setNewChatMode] = useState<"direct" | "group">("direct")
  const [newChatTitle, setNewChatTitle] = useState("")
  const [newChatMemberIds, setNewChatMemberIds] = useState<string[]>([])
  const [threadManagerOpen, setThreadManagerOpen] = useState(false)
  const [threadManagerTitle, setThreadManagerTitle] = useState("")
  const [threadManagerMemberIds, setThreadManagerMemberIds] = useState<string[]>([])
  const [uid, setUid] = useState<string | null>(null)
  const [commsUsingRemote, setCommsUsingRemote] = useState(false)
  const [tomOpen, setTomOpen] = useState(false)
  const [tomMessages, setTomMessages] = useState<AssistantMessage[]>(SEED_TOM)
  const [tomDraft, setTomDraft] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false)
  const [activeCollection, setActiveCollection] = useState<CollectionKey | null>(null)
  const [activeEmbeddedLibraryId, setActiveEmbeddedLibraryId] = useState<string | null>(null)
  const [activeLibraryPanel, setActiveLibraryPanel] = useState<"collections" | "review" | "calendar" | "catalogue" | "directory">("collections")
  const [expandedCollectionInfo, setExpandedCollectionInfo] = useState<CollectionKey | null>(null)
  const [openLibrarySections, setOpenLibrarySections] = useState<Record<"community" | "groups" | "bookmarks", boolean>>({
    community: true,
    groups: false,
    bookmarks: false,
  })
  const [activeLogistics, setActiveLogistics] = useState<LogisticsKey | null>(null)
  const [activeLogisticsPanel, setActiveLogisticsPanel] = useState<LogisticsKey>("members")
  const [activeUpdate, setActiveUpdate] = useState<UpdateKey | null>(null)
  const mobileFileInputRef = useRef<HTMLInputElement | null>(null)
  const desktopFileInputRef = useRef<HTMLInputElement | null>(null)
  const isDark = preferences.access.appearance === "dark"
  const libraries = useSyncExternalStore(subscribeLibraries, getLibrariesSnapshot, getLibrariesSnapshot)
  const bookmarks = useSyncExternalStore(subscribeBookmarks, getBookmarksSnapshot, getBookmarksSnapshot)
  useSyncExternalStore(subscribeTeams, () => 0, () => 0)
  const profile = getProfile()

  useEffect(() => {
    setThreads(loadStoredState(CHAT_STORAGE_KEY, SEED_THREADS))
    setTomMessages(loadStoredState(TOM_STORAGE_KEY, SEED_TOM))
  }, [])

  useEffect(() => onAuthChange((user) => setUid(user?.uid ?? null)), [])

  useEffect(() => {
    return () => {
      if (pendingImagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingImagePreview)
      }
    }
  }, [pendingImagePreview])

  useEffect(() => {
    function syncPreferences() {
      setPreferences(readUserPreferences())
    }

    syncPreferences()
    window.addEventListener("prepsight:preferences-changed", syncPreferences)
    return () => window.removeEventListener("prepsight:preferences-changed", syncPreferences)
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(threads))
    }
  }, [threads])

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOM_STORAGE_KEY, JSON.stringify(tomMessages))
    }
  }, [tomMessages])

  const baseWorkspaceLabel = useMemo(() => {
    const settings = profile ? getRelevantSettings(profile) : []
    return settings[0] ?? "Operating Theatre"
  }, [profile])
  const activeTeam = getActiveTeamSnapshot(profile)
  const teamWorkspaces = getTeamWorkspacesForProfile(profile)
  const pendingTeamWorkspaces = getPendingTeamWorkspacesForProfile(profile)
  const workspaceOptions = useMemo(() => {
    if (!teamWorkspaces.length) {
      return [
        {
          key: baseWorkspaceLabel,
          label: baseWorkspaceLabel,
          detail: "Current workspace",
        },
      ]
    }

    const seen = new Set<string>()
    return teamWorkspaces
      .map((team) => {
        const label = team.internalName?.trim() || team.publicAlias?.trim() || baseWorkspaceLabel
        const detail =
          team.publicAlias && team.publicAlias !== label
            ? team.publicAlias
            : team.visibility
        return { key: label, label, detail }
      })
      .filter((option) => {
        if (seen.has(option.key)) return false
        seen.add(option.key)
        return true
      })
  }, [baseWorkspaceLabel, teamWorkspaces])
  const [workspaceLabel, setWorkspaceLabel] = useState<string>(baseWorkspaceLabel)
  useEffect(() => {
    setWorkspaceLabel((current) =>
      workspaceOptions.some((option) => option.label === current) ? current : workspaceOptions[0]?.label ?? baseWorkspaceLabel,
    )
  }, [baseWorkspaceLabel, workspaceOptions])
  const activeTeamMembers = getTeamMembersSnapshot(activeTeam?.id)
  const totalCards = useMemo(
    () => libraries.reduce((sum, library) => sum + getLibraryCardsSnapshot(library.id).length, 0),
    [libraries],
  )
  const globalLibraries = useMemo(
    () => libraries.filter((library) => library.libraryType === "shared" && library.name === workspaceLabel),
    [libraries, workspaceLabel],
  )
  const localLibraries = useMemo(
    () => libraries.filter((library) => library.libraryType === "local"),
    [libraries],
  )
  const localCollectionsTitle = localLibraries.length === 1 ? "My Group" : "My Groups"
  const collectionDetails = useMemo<Record<CollectionKey, CollectionSummary>>(
    () => ({
      community: {
        key: "community",
        title: "Community",
        subtitle: "Shared collections for this workspace.",
        summary: globalLibraries.length
          ? `${workspaceLabel} shared procedures are ready to browse.`
          : `Browse shared reference collections for ${workspaceLabel}.`,
        accent: "#6ACDE5",
        items: globalLibraries.map((library) => ({
          title: `${library.ownerPublicAlias ?? library.ownerName}/${library.name}`,
          meta: `${getLibraryCardsSnapshot(library.id).length} procedures Â· PrepSight library`,
        })),
      },
      groups: {
        key: "groups",
        title: "My Groups",
        subtitle: "Collections specific to your organisation or access scope.",
        summary: localLibraries.length
          ? `${localLibraries.length} group collection${localLibraries.length === 1 ? "" : "s"} available to open.`
          : "Collections for your teams and local access.",
        accent: "#5CC7C4",
        items: localLibraries.map((library) => ({
          title: `${library.ownerName}/${library.name}`,
          meta: `${getLibraryCardsSnapshot(library.id).length} procedures Â· ${library.ownerName} library`,
        })),
      },
      bookmarks: {
        key: "bookmarks",
        title: "Bookmarks",
        subtitle: "Your saved procedure shortcuts.",
        summary: bookmarks.length
          ? "Jump back into the cards and procedures you have already saved."
          : "No bookmarks yet.",
        accent: "#F2C86B",
        items: bookmarks.slice(0, 8).map((bookmark) => ({
          title: bookmark.title,
          meta: bookmark.subtitle,
        })),
      },
      review: {
        key: "review",
        title: "Review",
        subtitle: "Validation and moderation.",
        summary: "Moderation and validation stay tied to the existing V3 review workflows.",
        accent: "#8EC5FF",
        items: [
          { title: "Open review", meta: "Validation and moderation workspace" },
          { title: "Open moderation", meta: "Detailed moderation queue" },
        ],
      },
      calendar: {
        key: "calendar",
        title: "Calendar",
        subtitle: "Schedules and case planning.",
        summary: "Calendar remains available as the existing PrepSight planning view.",
        accent: "#9AB7FF",
        items: [
          { title: "Open calendar", meta: "PrepSight schedule and case planning" },
        ],
      },
      catalogue: {
        key: "catalogue",
        title: "Catalogue",
        subtitle: "Products, stock, and references.",
        summary: "Catalogue remains the same V3 implementation under this V4 tab.",
        accent: "#AFA8FF",
        items: [
          { title: "Open catalogue", meta: "Products, implants, and stockroom" },
          { title: "Products", meta: "Open the product list directly" },
          { title: "Implants", meta: "Jump into implant references" },
          { title: "Stockroom", meta: "Open stock and supply views" },
        ],
      },
      directory: {
        key: "directory",
        title: "Directory",
        subtitle: "Hospitals and operational contacts.",
        summary: "Directory stays linked to the existing PrepSight route.",
        accent: "#7FD0D3",
        items: [
          { title: "Open directory", meta: "Hospitals and trusts" },
        ],
      },
    }),
    [activeTeam?.internalName, bookmarks, globalLibraries, libraries, localLibraries, profile?.hospital, workspaceLabel],
  )
  const logisticsDetails = useMemo<Record<LogisticsKey, LogisticsSummary>>(
    () => ({
      members: {
        key: "members",
        title: "Members",
        detail: `${activeTeamMembers.length || teamWorkspaces.length || 0} active across ${teamWorkspaces.length || 1} groups`,
        tone: "#D7F2FB",
        rows: (activeTeamMembers.length
          ? activeTeamMembers.slice(0, 8).map((member) => ({
              title: member.displayName ?? member.publicAlias,
              meta: `${member.internalRole} Â· ${member.platformRole}`,
            }))
          : teamWorkspaces.slice(0, 8).map((team) => ({
              title: team.internalName,
              meta: `${team.publicAlias} Â· ${team.visibility}`,
            }))),
      },
      access: {
        key: "access",
        title: "Access requests",
        detail: `${pendingTeamWorkspaces.length} pending approval`,
        tone: "#E5F7ED",
        rows: (pendingTeamWorkspaces.length
          ? pendingTeamWorkspaces.map((team) => ({
              title: team.internalName,
              meta: `${team.publicAlias} awaiting approval`,
            }))
          : [{ title: "No pending requests", meta: "Nothing is waiting for approval right now." }]),
      },
      equipment: {
        key: "equipment",
        title: "Equipment readiness",
        detail: "Catalogue and stockroom will feed this view",
        tone: "#EAF0FF",
        rows: [
          { title: "Catalogue", meta: "Products, implants, and stockroom stay in the V3 catalogue routes." },
          { title: "Stockroom", meta: "This section will expand as equipment workflows grow." },
        ],
      },
    }),
    [activeTeamMembers, pendingTeamWorkspaces, teamWorkspaces],
  )
  const updateDetails = useMemo<Record<UpdateKey, UpdateSummary>>(
    () => ({
      community: {
        key: "community",
        title: "Community update",
        detail: globalLibraries.length
          ? `${workspaceLabel} currently has ${getLibraryCardsSnapshot(globalLibraries[0].id).length} shared cards available.`
          : `No shared collections are available yet for ${workspaceLabel}.`,
        time: "Now",
        body: globalLibraries.length
          ? "This update is using the real shared library data behind the existing PrepSight collections view."
          : "As more shared libraries become available, this updates surface will reflect them here.",
      },
      logistics: {
        key: "logistics",
        title: "Logistics",
        detail: pendingTeamWorkspaces.length
          ? `${pendingTeamWorkspaces.length} access approvals are waiting.`
          : "No access approvals are waiting right now.",
        time: "Now",
        body: "This section will eventually unify members, approvals, staffing, and equipment signals into one operational feed.",
      },
      bookmarks: {
        key: "bookmarks",
        title: "Bookmarks",
        detail: bookmarks.length ? `${bookmarks.length} saved shortcuts are available.` : "No bookmarks have been saved yet.",
        time: "Now",
        body: bookmarks.length
          ? "Your bookmark count and list are now coming from the real V3 bookmark store."
          : "Once users save cards or procedures, this feed can surface those changes here.",
      },
    }),
    [bookmarks.length, globalLibraries, pendingTeamWorkspaces.length, workspaceLabel],
  )
  const activeCollectionDetail = activeCollection ? collectionDetails[activeCollection] : null
  const activeLogisticsDetail = activeLogistics ? logisticsDetails[activeLogistics] : null
  const activeUpdateDetail = activeUpdate ? updateDetails[activeUpdate] : null

  useEffect(() => {
    setThreadReadState(readCommsReadState(uid, activeTeam?.id))
  }, [activeTeam?.id, uid])

  useEffect(() => {
    saveCommsReadState(threadReadState, uid, activeTeam?.id)
  }, [activeTeam?.id, threadReadState, uid])

  async function markThreadRead(threadId: string, readAt?: string) {
    const nextReadAt = readAt ?? new Date().toISOString()
    const existingReadAt = (commsUsingRemote ? remoteThreadReadState : threadReadState)[threadId]

    if (existingReadAt && existingReadAt >= nextReadAt) {
      return
    }

    if (commsUsingRemote && db && uid && activeTeam?.id) {
      try {
        await setDoc(doc(db, "comms_reads", buildCommsReadDocId(uid, threadId)), {
          id: buildCommsReadDocId(uid, threadId),
          organizationId: activeTeam.id,
          threadId,
          uid,
          readAt: nextReadAt,
        } satisfies CommsReadRecord)
      } catch (error) {
        console.warn("[PrepSight] comms read sync failed", error)
      }
      setRemoteThreadReadState((current) => (
        current[threadId] === nextReadAt ? current : { ...current, [threadId]: nextReadAt }
      ))
      return
    }

    setThreadReadState((current) => (
      current[threadId] === nextReadAt ? current : { ...current, [threadId]: nextReadAt }
    ))
  }

  useEffect(() => {
    if (!db || !uid || !activeTeam?.id) {
      setCommsUsingRemote(false)
      setRemoteThreads([])
      setRemoteMessages([])
      setRemoteThreadReadState({})
      return
    }

    setCommsUsingRemote(true)
    const threadQuery = query(collection(db, "comms_threads"), where("organizationId", "==", activeTeam.id))
    const messageQuery = query(collection(db, "comms_messages"), where("organizationId", "==", activeTeam.id))
    const readQuery = query(collection(db, "comms_reads"), where("organizationId", "==", activeTeam.id), where("uid", "==", uid))

    const unsubscribeThreads = onSnapshot(
      threadQuery,
      (snapshot) => {
        const next = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as CommsThreadRecord))
        setRemoteThreads(next)
      },
      (error) => {
        console.warn("[PrepSight] comms_threads listener failed", error)
        setCommsUsingRemote(false)
      },
    )

    const unsubscribeMessages = onSnapshot(
      messageQuery,
      (snapshot) => {
        const next = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as CommsMessageRecord))
        setRemoteMessages(next)
      },
      (error) => {
        console.warn("[PrepSight] comms_messages listener failed", error)
        setCommsUsingRemote(false)
      },
    )

    const unsubscribeReads = onSnapshot(
      readQuery,
      (snapshot) => {
        const next = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() } as CommsReadRecord))
        setRemoteThreadReadState(
          next.reduce<Record<string, string>>((accumulator, record) => {
            accumulator[record.threadId] = record.readAt
            return accumulator
          }, {}),
        )
      },
      (error) => {
        console.warn("[PrepSight] comms_reads listener failed", error)
      },
    )

    return () => {
      unsubscribeThreads()
      unsubscribeMessages()
      unsubscribeReads()
    }
  }, [activeTeam?.id, uid])

  useEffect(() => {
    if (!commsUsingRemote || !db || !uid || !activeTeam?.id || remoteThreads.length > 0) return

    const threadId = `group-${activeTeam.id}`
    void setDoc(doc(db, "comms_threads", threadId), {
      organizationId: activeTeam.id,
      type: "group",
      title: activeTeam.internalName || workspaceLabel,
      subtitle: `${Math.max(activeTeamMembers.length, 1)} member${Math.max(activeTeamMembers.length, 1) === 1 ? "" : "s"}`,
      accent: "#0EA5E9",
      memberUids: [uid],
      memberNames: [profile?.name?.trim() || "You"],
      createdBy: uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageBody: "Group created",
    }).catch((error) => {
      console.warn("[PrepSight] default comms thread creation failed", error)
    })
  }, [activeTeam?.id, activeTeam?.internalName, activeTeamMembers.length, commsUsingRemote, db, profile?.name, remoteThreads.length, uid, workspaceLabel])

  const chatThreads = useMemo(() => {
    if (!commsUsingRemote || !activeTeam?.id) return threads

    const messagesByThread = remoteMessages.reduce<Record<string, ChatMessage[]>>((accumulator, message) => {
      const nextMessage: ChatMessage = {
        id: message.id,
        sender: message.senderKind === "tom" ? "tom" : message.senderUid === uid ? "self" : "other",
        author: message.author,
        body: message.body,
        time: formatThreadTime(message.createdAt),
        imageUrl: message.imageUrl,
        imageName: message.imageName,
        createdAt: message.createdAt,
      }

      accumulator[message.threadId] = [...(accumulator[message.threadId] ?? []), nextMessage].sort(
        (left, right) => (left.createdAt ?? "").localeCompare(right.createdAt ?? ""),
      )
      return accumulator
    }, {})

    const mappedThreads = remoteThreads
      .map<ChatThread>((thread) => {
        const threadMessages = messagesByThread[thread.id] ?? []
        const lastMessage = threadMessages[threadMessages.length - 1]
        const lastReadAt = remoteThreadReadState[thread.id] ?? ""
        const lastMessageFromCurrentUser = lastMessage?.sender === "self"
        const unread =
          lastMessage && !lastMessageFromCurrentUser && (lastMessage.createdAt ?? thread.updatedAt ?? "") > lastReadAt ? 1 : 0
        return {
          id: thread.id,
          type: thread.type,
          title: thread.title,
          subtitle: thread.subtitle,
          preview: buildThreadPreview({
            body: lastMessage?.body ?? thread.lastMessageBody,
            imageUrl: lastMessage?.imageUrl ?? thread.lastMessageImageUrl,
          }),
          time: formatThreadTime(lastMessage?.createdAt ?? thread.updatedAt),
          unread,
          accent: thread.accent,
          members: thread.memberNames,
          memberUids: thread.memberUids,
          messages: threadMessages,
          organizationId: thread.organizationId,
          updatedAt: thread.updatedAt,
        }
      })
      .sort((left, right) => (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""))

    return [
      {
        ...SEED_THREADS[0],
        messages: tomMessages.map((message) => ({
          id: message.id,
          sender: message.sender,
          author: message.sender === "tom" ? "TOM" : "You",
          body: message.body,
          time: message.time,
          imageUrl: undefined,
          imageName: undefined,
          createdAt: undefined,
        })),
      },
      ...mappedThreads,
    ]
  }, [activeTeam?.id, commsUsingRemote, remoteMessages, remoteThreadReadState, remoteThreads, threads, tomMessages, uid])

  const filteredThreads = useMemo(() => {
    switch (chatFilter) {
      case "unread":
        return chatThreads.filter((thread) => thread.unread > 0)
      case "groups":
        return chatThreads.filter((thread) => thread.type === "group")
      case "direct":
        return chatThreads.filter((thread) => thread.type === "direct")
      default:
        return chatThreads
    }
  }, [chatFilter, chatThreads])

  const selectedThread = chatThreads.find((thread) => thread.id === selectedThreadId) ?? null

  useEffect(() => {
    if (!chatThreads.length) {
      setSelectedThreadId(null)
      return
    }

    setSelectedThreadId((current) => (current && chatThreads.some((thread) => thread.id === current) ? current : chatThreads[0].id))
  }, [chatThreads])

  useEffect(() => {
    if (!selectedThreadId) return
    const selected = chatThreads.find((thread) => thread.id === selectedThreadId)
    if (!selected?.updatedAt) return
    void markThreadRead(selectedThreadId, selected.updatedAt)
  }, [chatThreads, selectedThreadId])

  function clearPendingImage() {
    if (pendingImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImagePreview)
    }
    setPendingImage(null)
    setPendingImagePreview(null)
  }

  function handlePickImage(file: File | null) {
    if (!file) return
    if (pendingImagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(pendingImagePreview)
    }
    setPendingImage(file)
    setPendingImagePreview(URL.createObjectURL(file))
  }

  async function uploadCommsImage(threadId: string, organizationId: string, file: File) {
    if (!storage) {
      return {
        imageUrl: pendingImagePreview ?? "",
        imageName: file.name,
      }
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-")
    const assetRef = storageRef(storage, `comms-media/${organizationId}/${threadId}/${Date.now()}-${safeName}`)
    await uploadBytes(assetRef, file)
    const imageUrl = await getDownloadURL(assetRef)
    return { imageUrl, imageName: file.name }
  }

  function openThread(threadId: string) {
    setWorkspacePickerOpen(false)
    setSelectedThreadId(threadId)
    const openedThread = chatThreads.find((thread) => thread.id === threadId)
    void markThreadRead(threadId, openedThread?.updatedAt ?? new Date().toISOString())
    if (!commsUsingRemote) {
      setThreads((current) =>
        current.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread)),
      )
    }
  }

  function closeThread() {
    setSelectedThreadId(null)
  }

  async function sendThreadMessage() {
    const value = threadDraft.trim()
    if ((!value && !pendingImage) || !selectedThread) return

    const nextMessage: ChatMessage = {
      id: `self-${Date.now()}`,
      sender: "self",
      author: "You",
      body: value,
      time: formatNow(),
      imageUrl: pendingImagePreview ?? undefined,
      imageName: pendingImage?.name,
      createdAt: new Date().toISOString(),
    }

    if (selectedThread.id === "direct-tom") {
      const outgoing: AssistantMessage = {
        id: nextMessage.id,
        sender: "self",
        body: value || (pendingImage ? "Photo shared" : ""),
        time: nextMessage.time,
      }
      const reply: AssistantMessage = {
        id: `tom-reply-${Date.now() + 1}`,
        sender: "tom",
        body: "I can help with that. I would pull the relevant card, highlight any logistics impact, and give you something you can forward into the group.",
        time: formatNow(),
      }
      setTomMessages((current) => [...current, outgoing, reply])
      setThreadDraft("")
      clearPendingImage()
      return
    }

    if (commsUsingRemote && db && uid && selectedThread.organizationId) {
      try {
        const uploadedImage = pendingImage
          ? await uploadCommsImage(selectedThread.id, selectedThread.organizationId, pendingImage)
          : null
        const createdAt = new Date().toISOString()
        await addDoc(collection(db, "comms_messages"), {
          threadId: selectedThread.id,
          organizationId: selectedThread.organizationId,
          senderUid: uid,
          senderKind: "user",
          author: profile?.name?.trim() || "You",
          body: value,
          imageUrl: uploadedImage?.imageUrl,
          imageName: uploadedImage?.imageName,
          createdAt,
        } satisfies Omit<CommsMessageRecord, "id">)
        await updateDoc(doc(db, "comms_threads", selectedThread.id), {
          updatedAt: createdAt,
          lastMessageBody: value,
          lastMessageImageUrl: uploadedImage?.imageUrl ?? null,
        })
      } catch (error) {
        console.warn("[PrepSight] comms message send failed", error)
      }
      setThreadDraft("")
      clearPendingImage()
      return
    }

    const tomReply: ChatMessage | null = null

    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThread.id
          ? {
              ...thread,
              preview: buildThreadPreview({ body: value, imageUrl: nextMessage.imageUrl }),
              time: "Now",
              messages: [...thread.messages, nextMessage],
            }
          : thread,
      ),
    )
    setThreadDraft("")
    clearPendingImage()
  }

  async function forwardTomMessage(body: string) {
    const targetGroup = chatThreads.find((thread) => thread.type === "group")
    if (!targetGroup) return

    const forwardedMessage: ChatMessage = {
      id: `forwarded-${Date.now()}`,
      sender: "self",
      author: "You",
      body: `Forwarded from TOM:\n${body}`,
      time: formatNow(),
    }

    if (commsUsingRemote && db && uid && targetGroup.organizationId) {
      try {
        const createdAt = new Date().toISOString()
        await addDoc(collection(db, "comms_messages"), {
          threadId: targetGroup.id,
          organizationId: targetGroup.organizationId,
          senderUid: uid,
          senderKind: "user",
          author: profile?.name?.trim() || "You",
          body: forwardedMessage.body,
          createdAt,
        } satisfies Omit<CommsMessageRecord, "id">)
        await updateDoc(doc(db, "comms_threads", targetGroup.id), {
          updatedAt: createdAt,
          lastMessageBody: forwardedMessage.body,
        })
      } catch (error) {
        console.warn("[PrepSight] comms TOM forward failed", error)
      }
      return
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === targetGroup.id
          ? {
              ...thread,
              preview: forwardedMessage.body,
              time: "Now",
              unread: selectedThreadId === thread.id ? 0 : thread.unread,
              messages: [...thread.messages, forwardedMessage],
            }
          : thread,
      ),
    )
  }

  function sendTomMessage() {
    const value = tomDraft.trim()
    if (!value) return

    const outgoing: AssistantMessage = {
      id: `tom-self-${Date.now()}`,
      sender: "self",
      body: value,
      time: formatNow(),
    }

    const reply: AssistantMessage = {
      id: `tom-reply-${Date.now() + 1}`,
      sender: "tom",
      body: "I can help with that. I would surface the relevant library card, flag any logistics impact, and draft something shareable back into the group thread.",
      time: formatNow(),
    }

    setTomMessages((current) => [...current, outgoing, reply])
    setTomDraft("")
  }

  const availableCommsMembers = useMemo(
    () =>
      activeTeamMembers.filter((member) => member.status === "active" && member.uid && member.uid !== uid),
    [activeTeamMembers, uid],
  )

  useEffect(() => {
    if (!selectedThread || selectedThread.type !== "group") {
      setThreadManagerTitle("")
      setThreadManagerMemberIds([])
      return
    }

    setThreadManagerTitle(selectedThread.title)
    setThreadManagerMemberIds(selectedThread.memberUids?.filter(Boolean) ?? [])
  }, [selectedThread])

  function openNewChatComposer(defaultMode: "direct" | "group" = "direct") {
    setWorkspacePickerOpen(false)
    setNewChatMode(defaultMode)
    setNewChatTitle("")
    setNewChatMemberIds([])
    setNewChatOpen(true)
  }

  function toggleNewChatMember(memberUid: string) {
    setNewChatMemberIds((current) => {
      if (newChatMode === "direct") {
        return current[0] === memberUid ? [] : [memberUid]
      }
      return current.includes(memberUid) ? current.filter((value) => value !== memberUid) : [...current, memberUid]
    })
  }

  function toggleThreadManagerMember(memberUid: string) {
    setThreadManagerMemberIds((current) =>
      current.includes(memberUid) ? current.filter((value) => value !== memberUid) : [...current, memberUid],
    )
  }

  async function saveThreadManager() {
    if (!selectedThread || selectedThread.type !== "group") return

    const nextMemberIds = Array.from(new Set([uid, ...threadManagerMemberIds].filter(Boolean) as string[]))
    const nextMembers = activeTeamMembers
      .filter((member) => nextMemberIds.includes(member.uid))
      .map((member) => member.displayName ?? member.publicAlias)

    if (commsUsingRemote && db && selectedThread.organizationId) {
      try {
        await updateDoc(doc(db, "comms_threads", selectedThread.id), {
          title: threadManagerTitle.trim() || selectedThread.title,
          subtitle: `${nextMemberIds.length} members`,
          memberUids: nextMemberIds,
          memberNames: nextMembers.length ? nextMembers : selectedThread.members,
          updatedAt: new Date().toISOString(),
        })
        setThreadManagerOpen(false)
      } catch (error) {
        console.warn("[PrepSight] comms thread update failed", error)
      }
      return
    }

    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThread.id
          ? {
              ...thread,
              title: threadManagerTitle.trim() || selectedThread.title,
              subtitle: `${nextMemberIds.length} members`,
              memberUids: nextMemberIds,
              members: nextMembers.length ? nextMembers : thread.members,
              updatedAt: new Date().toISOString(),
            }
          : thread,
      ),
    )
    setThreadManagerOpen(false)
  }

  async function createSelectedChat() {
    if (!uid) return
    const selectedMembers = availableCommsMembers.filter((member) => newChatMemberIds.includes(member.uid))
    if (selectedMembers.length === 0) return

    if (commsUsingRemote && db && activeTeam?.id) {
      if (newChatMode === "direct" && selectedMembers.length === 1) {
        const directMember = selectedMembers[0]
        const directPair = [uid, directMember.uid].sort().join("__")
        const existingDirect = remoteThreads.find(
          (thread) => thread.type === "direct" && [...thread.memberUids].sort().join("__") === directPair,
        )
        if (existingDirect) {
          setNewChatOpen(false)
          openThread(existingDirect.id)
          return
        }
      }

      const id =
        newChatMode === "direct" && selectedMembers.length === 1
          ? `direct-${[uid, selectedMembers[0].uid].sort().join("-")}`
          : `group-${activeTeam.id}-${Date.now()}`
      const createdAt = new Date().toISOString()
      const memberUids = [uid, ...selectedMembers.map((member) => member.uid)]
      const memberNames = [profile?.name?.trim() || "You", ...selectedMembers.map((member) => member.displayName ?? member.publicAlias)]
      const title =
        newChatMode === "direct" && selectedMembers.length === 1
          ? selectedMembers[0].displayName ?? selectedMembers[0].publicAlias
          : newChatTitle.trim() || selectedMembers.map((member) => member.displayName ?? member.publicAlias).join(", ")
      const subtitle =
        newChatMode === "direct" && selectedMembers.length === 1
          ? selectedMembers[0].internalRole
          : `${memberUids.length} members`

      try {
        await setDoc(doc(db, "comms_threads", id), {
          id,
          organizationId: activeTeam.id,
          type: newChatMode,
          title,
          subtitle,
          accent: newChatMode === "direct" ? "#4DA3FF" : "#0EA5E9",
          memberUids,
          memberNames,
          createdBy: uid,
          createdAt,
          updatedAt: createdAt,
          lastMessageBody: "Thread created",
        } satisfies CommsThreadRecord)
        setNewChatOpen(false)
        setActiveTab("chat")
        setSelectedThreadId(id)
        setThreadReadState((current) => ({ ...current, [id]: createdAt }))
      } catch (error) {
        console.warn("[PrepSight] comms thread creation failed", error)
      }
      return
    }

    const memberNames = selectedMembers.map((member) => member.displayName ?? member.publicAlias)
    const newThread: ChatThread = {
      id: `${newChatMode}-${Date.now()}`,
      type: newChatMode,
      title:
        newChatMode === "direct" && memberNames[0]
          ? memberNames[0]
          : newChatTitle.trim() || memberNames.join(", "),
      subtitle:
        newChatMode === "direct" && selectedMembers[0]
          ? selectedMembers[0].internalRole
          : `${memberNames.length + 1} members`,
      preview: "Thread created",
      time: "Now",
      unread: 0,
      accent: newChatMode === "direct" ? "#4DA3FF" : "#0EA5E9",
      members: ["You", ...memberNames],
      memberUids: [uid, ...selectedMembers.map((member) => member.uid)],
      messages: [],
      organizationId: activeTeam?.id,
      updatedAt: new Date().toISOString(),
    }

    setThreads((current) => [newThread, ...current])
    setNewChatOpen(false)
    setActiveTab("chat")
    setSelectedThreadId(newThread.id)
  }

  function renderNewChatComposer() {
    if (!newChatOpen) return null

    const canCreate =
      newChatMode === "direct"
        ? newChatMemberIds.length === 1
        : newChatMemberIds.length > 0 && newChatTitle.trim().length > 0
    const composerOrganizationLabel =
      profile?.hospital?.trim() || activeTeam?.publicAlias?.trim() || activeTeam?.internalName?.trim() || "Your organisation"

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,36,62,0.34)] px-4 py-6">
        <div className={`w-full max-w-[460px] rounded-[28px] p-4 shadow-[0_24px_60px_rgba(16,36,62,0.22)] ${isDark ? "bg-[#102137] text-white" : "bg-white text-[#10243E]"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[20px] font-semibold tracking-[-0.03em]">New conversation</p>
              <p className={`mt-1 text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>Choose people from {composerOrganizationLabel}.</p>
            </div>
            <button type="button" onClick={() => setNewChatOpen(false)} className={`rounded-full px-3 py-1.5 text-[12px] ${isDark ? "bg-white/8 text-white" : "bg-[#EEF5F8] text-[#5F788C]"}`}>
              Close
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            {([
              { key: "direct", label: "Direct" },
              { key: "group", label: "Group" },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  setNewChatMode(option.key)
                  setNewChatMemberIds([])
                  if (option.key === "direct") setNewChatTitle("")
                }}
                className={`rounded-full px-4 py-2 text-[13px] font-medium ${
                  newChatMode === option.key
                    ? "bg-[#5CC7C4] text-white"
                    : isDark
                      ? "border border-[#27415D] bg-[#132238] text-[#A0B7CB]"
                      : "border border-[#D7E9EE] bg-white text-[#0F4C5C]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {newChatMode === "group" ? (
            <div className="mt-4">
              <input
                value={newChatTitle}
                onChange={(event) => setNewChatTitle(event.target.value)}
                placeholder="Group name"
                className={`w-full rounded-[18px] px-4 py-3 text-[14px] outline-none ${isDark ? "border border-[#27415D] bg-[#132238] text-white placeholder:text-[#8EA5BA]" : "border border-[#D7E9EE] bg-[#F8FBFD] text-[#10243E] placeholder:text-[#7C93A7]"}`}
              />
            </div>
          ) : null}

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {availableCommsMembers.map((member) => {
              const selected = newChatMemberIds.includes(member.uid)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleNewChatMember(member.uid)}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left ${
                    selected
                      ? isDark
                        ? "bg-[#17314B]"
                        : "bg-[#E8F6FB]"
                      : isDark
                        ? "bg-[#132238]"
                        : "bg-[#F8FBFD]"
                  }`}
                >
                  <Avatar label={member.displayName ?? member.publicAlias} accent={newChatMode === "direct" ? "#4DA3FF" : "#0EA5E9"} sizeClass="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{member.displayName ?? member.publicAlias}</p>
                    <p className={`truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{member.internalRole}</p>
                  </div>
                  {selected ? <span className="text-[12px] font-semibold text-[#0D8CCB]">Selected</span> : null}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => void createSelectedChat()}
              className={`rounded-full px-5 py-2.5 text-[14px] font-medium text-white ${canCreate ? "bg-[#0D8CCB]" : "bg-[#9DCBDE]"}`}
            >
              Create chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderThreadManager() {
    if (!threadManagerOpen || !selectedThread || selectedThread.type !== "group") return null

    const managedMembers = availableCommsMembers.filter((member) => threadManagerMemberIds.includes(member.uid))

    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(16,36,62,0.34)] px-4 py-6">
        <div className={`w-full max-w-[460px] rounded-[28px] p-4 shadow-[0_24px_60px_rgba(16,36,62,0.22)] ${isDark ? "bg-[#102137] text-white" : "bg-white text-[#10243E]"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[20px] font-semibold tracking-[-0.03em]">Manage group</p>
              <p className={`mt-1 text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>Rename this group and update members from the same organisation.</p>
            </div>
            <button type="button" onClick={() => setThreadManagerOpen(false)} className={`rounded-full px-3 py-1.5 text-[12px] ${isDark ? "bg-white/8 text-white" : "bg-[#EEF5F8] text-[#5F788C]"}`}>
              Close
            </button>
          </div>

          <div className="mt-4">
            <input
              value={threadManagerTitle}
              onChange={(event) => setThreadManagerTitle(event.target.value)}
              placeholder="Group name"
              className={`w-full rounded-[18px] px-4 py-3 text-[14px] outline-none ${isDark ? "border border-[#27415D] bg-[#132238] text-white placeholder:text-[#8EA5BA]" : "border border-[#D7E9EE] bg-[#F8FBFD] text-[#10243E] placeholder:text-[#7C93A7]"}`}
            />
          </div>

          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {availableCommsMembers.map((member) => {
              const selected = threadManagerMemberIds.includes(member.uid)
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleThreadManagerMember(member.uid)}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left ${
                    selected
                      ? isDark
                        ? "bg-[#17314B]"
                        : "bg-[#E8F6FB]"
                      : isDark
                        ? "bg-[#132238]"
                        : "bg-[#F8FBFD]"
                  }`}
                >
                  <Avatar label={member.displayName ?? member.publicAlias} accent="#0EA5E9" sizeClass="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{member.displayName ?? member.publicAlias}</p>
                    <p className={`truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{member.internalRole}</p>
                  </div>
                  {selected ? <span className="text-[12px] font-semibold text-[#0D8CCB]">Included</span> : null}
                </button>
              )
            })}
          </div>

          <div className={`mt-4 rounded-[18px] px-3 py-3 text-[13px] ${isDark ? "bg-[#132238] text-[#A0B7CB]" : "bg-[#F8FBFD] text-[#61758B]"}`}>
            {managedMembers.length > 0 ? `Members: ${managedMembers.map((member) => member.displayName ?? member.publicAlias).join(", ")}` : "No additional members selected yet."}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => void saveThreadManager()}
              className="rounded-full bg-[#0D8CCB] px-5 py-2.5 text-[14px] font-medium text-white"
            >
              Save group
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function addNewChat() {
    setWorkspacePickerOpen(false)
    openNewChatComposer("direct")
  }

  function openTab(tab: TabKey) {
    setActiveTab(tab)
    if (tab !== "chat") setSelectedThreadId(null)
    setWorkspacePickerOpen(false)
    setActiveCollection(null)
    setActiveLogistics(null)
    setActiveUpdate(null)
  }

  function setAppearance(appearance: AppearanceTheme) {
    setPreferences((current) => {
      const next: UserPreferences = {
        ...current,
        access: {
          ...current.access,
          appearance,
        },
      }
      saveUserPreferences(next)
      applyUserPreferences(next)
      return next
    })
  }

  function toggleAppearance() {
    setAppearance(isDark ? "light" : "dark")
  }

  function selectWorkspace(nextWorkspace: string) {
    setWorkspaceLabel(nextWorkspace)
    setWorkspacePickerOpen(false)
  }

  function openLibraryDestination(key: CollectionKey) {
    if (key === "community" && globalLibraries[0]) {
      router.push(`/libraries/${globalLibraries[0].id}`)
      return
    }
    if (key === "groups" && localLibraries[0]) {
      router.push(`/libraries/${localLibraries[0].id}`)
      return
    }
    if (key === "bookmarks") {
      router.push("/bookmarks")
      return
    }
    if (key === "review") {
      router.push("/review")
      return
    }
    if (key === "calendar") {
      router.push("/calendar")
      return
    }
    if (key === "catalogue") {
      router.push("/catalogue")
      return
    }
    if (key === "directory") {
      router.push("/directory")
    }
  }

  function openCollectionItem(key: CollectionKey, index: number) {
    if (key === "community" && globalLibraries[index]) {
      router.push(`/libraries/${globalLibraries[index].id}`)
      return
    }
    if (key === "groups" && localLibraries[index]) {
      router.push(`/libraries/${localLibraries[index].id}`)
      return
    }
    if (key === "bookmarks" && bookmarks[index]) {
      router.push(bookmarks[index].href)
      return
    }
    if (key === "review") {
      router.push(index === 1 ? "/review/moderation" : "/review")
      return
    }
    if (key === "catalogue") {
      if (index === 1) {
        router.push("/catalogue/products")
        return
      }
      if (index === 2) {
        router.push("/catalogue/implants")
        return
      }
      if (index === 3) {
        router.push("/catalogue/stockroom")
        return
      }
    }
    openLibraryDestination(key)
  }

  function openLogisticsItem(key: LogisticsKey, index: number) {
    if (key === "members") {
      router.push("/settings/profile")
      return
    }
    if (key === "access") {
      router.push("/settings/access")
      return
    }
    if (key === "equipment") {
      if (index === 1) {
        router.push("/catalogue/stockroom")
        return
      }
      router.push("/catalogue")
      return
    }
  }

  function openUpdateItem(key: UpdateKey) {
    if (key === "community") {
      setActiveTab("library")
      setActiveUpdate(null)
      setActiveCollection("community")
      return
    }
    if (key === "logistics") {
      setActiveTab("logistics")
      setActiveUpdate(null)
      setActiveLogistics("access")
      return
    }
    if (key === "bookmarks") {
      router.push("/bookmarks")
    }
  }

  function renderMobileTopBar() {
    if (selectedThread) {
      const threadMeta =
        selectedThread.type === "group"
          ? `${selectedThread.members?.slice(0, 2).join(", ")}${selectedThread.members && selectedThread.members.length > 2 ? ` +${selectedThread.members.length - 2}` : ""}`
          : selectedThread.online
            ? "Online now"
            : selectedThread.subtitle

      return (
        <div className={`fixed inset-x-0 top-0 z-20 mx-auto max-w-[460px] px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2 ${isDark ? "border-b border-white/6 bg-[#091321]/96 backdrop-blur-xl" : "border-b border-[#0085B2] bg-[#0096C7]"}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={closeThread}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${isDark ? "bg-white/6 text-white" : "border border-white/35 bg-white/12 text-white"}`}
            >
              <ArrowLeft size={20} />
            </button>
            <Avatar
              label={selectedThread.title}
              accent={selectedThread.accent}
              online={selectedThread.online}
              imageSrc={selectedThread.id === "direct-tom" ? "/logo-medaskca.png" : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[18px] font-semibold leading-5 ${isDark ? "text-white" : "text-white"}`}>{selectedThread.title}</p>
              <p className={`truncate text-[12px] leading-5 ${isDark ? "text-[#97ABC0]" : "text-white/78"}`}>{threadMeta}</p>
            </div>
            <button
              type="button"
              onClick={() => (selectedThread.type === "group" ? setThreadManagerOpen(true) : setDrawerOpen(true))}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${isDark ? "bg-white/6 text-white" : "border border-white/35 bg-white/12 text-white"}`}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      )
    }

    const canGoBack = Boolean(activeCollectionDetail || activeLogisticsDetail || activeUpdateDetail)
    const topLevelSectionLabel =
      activeTab === "chat" ? "Comms" : activeTab === "library" ? "Library" : activeTab === "logistics" ? "Resources" : "Updates"
    const organizationLabel = profile?.hospital?.trim() || activeTeam?.publicAlias?.trim() || activeTeam?.internalName?.trim() || "Your organisation"

    return (
      <div className={`fixed inset-x-0 top-0 z-20 mx-auto max-w-[460px] px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2 ${isDark ? "bg-[#091321]/96 backdrop-blur-xl" : "border-b border-[#0085B2] bg-[#0096C7]"}`}>
        <div className="flex items-center justify-between gap-3">
          {canGoBack ? (
            <button
              type="button"
              onClick={() => {
                setActiveCollection(null)
                setActiveLogistics(null)
                setActiveUpdate(null)
              }}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${isDark ? "bg-white/6 text-white" : "border border-white/35 bg-white/12 text-white"}`}
            >
              <ArrowLeft size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={`flex h-11 w-11 items-center justify-center rounded-full ${isDark ? "bg-white/6 text-white" : "border border-white/35 bg-white/12 text-white"}`}
            >
              <Menu size={20} />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <span className={`block truncate text-[18px] font-semibold leading-5 ${isDark ? "text-white" : "text-white"}`}>
              <span>PrepSight </span>
              <span className={`${isDark ? "text-[#8FD3FF]" : "text-white/88"} font-serif italic font-medium`}>{topLevelSectionLabel}</span>
            </span>
            <span className={`truncate text-[12px] leading-5 ${isDark ? "text-[#97ABC0]" : "text-white/78"}`}>
              {organizationLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open quick links"
            className={`flex h-11 w-11 items-center justify-center rounded-full ${isDark ? "bg-white/6 text-white" : "border border-white/35 bg-white/12 text-white"}`}
          >
            <Settings2 size={18} />
          </button>
        </div>
      </div>
    )
  }

  function renderChatList() {
    return (
      <div className="px-2 pt-[calc(env(safe-area-inset-top,0px)+84px)] pb-[calc(env(safe-area-inset-bottom,0px)+168px)]">
        <div className="px-2">
          <div className={`flex w-full items-center gap-3 rounded-[18px] px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D7E9EE] bg-white"}`}>
            <Search size={18} className={isDark ? "text-[#8EA5BA]" : "text-[#0F4C5C]"} />
            <span className={`text-[15px] ${isDark ? "text-[#8EA5BA]" : "text-[#0F4C5C]"}`}>Search chats</span>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CHAT_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setChatFilter(filter.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-medium ${
                  chatFilter === filter.key
                    ? "bg-[#5CC7C4] text-white"
                    : isDark
                      ? "border border-[#27415D] bg-[#132238] text-[#A0B7CB]"
                      : "border border-[#D7E9EE] bg-white text-[#0F4C5C]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 border-t border-[#D7E9EE]">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => openThread(thread.id)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${isDark ? "border-b border-white/6 hover:bg-white/4" : "border-b border-[#D7E9EE] hover:bg-[#F7FBFD]"}`}
            >
              <Avatar
                label={thread.title}
                accent={thread.accent}
                online={thread.online}
                imageSrc={thread.id === "direct-tom" ? "/logo-medaskca.png" : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className={`truncate text-[16px] font-semibold ${isDark ? "text-white" : "text-[#10243E]"}`}>{thread.title}</p>
                  <span className={`shrink-0 pt-0.5 text-[12px] ${thread.unread > 0 ? (isDark ? "text-[#68E1FF]" : "text-[#0D8CCB]") : (isDark ? "text-[#7F93A9]" : "text-[#0F4C5C]")}`}>{thread.time}</span>
                </div>
                <p className={`mt-0.5 text-[12px] ${isDark ? "text-[#7F93A9]" : "text-[#0F4C5C]"}`}>
                  {thread.type === "group" ? thread.subtitle : thread.online ? "Online now" : thread.subtitle}
                </p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className={`truncate text-[14px] ${isDark ? "text-[#91A6BA]" : "text-[#0F4C5C]"}`}>{thread.preview}</p>
                  {thread.unread > 0 ? (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#18A9D8] px-2 text-[12px] font-semibold text-white">
                      {thread.unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderThreadMobile() {
    if (!selectedThread) return null

    const canSendThreadMessage = threadDraft.trim().length > 0 || Boolean(pendingImage)

    return (
      <div className={`flex min-h-[calc(100vh-80px)] flex-col ${isDark ? "bg-[#0A1524]" : "bg-[#EEF2F5]"}`}>
        <div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(13,140,203,0.08),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.35),rgba(255,255,255,0))] px-4 pt-[calc(env(safe-area-inset-top,0px)+78px)] pb-[calc(env(safe-area-inset-bottom,0px)+166px)]">
          <div className="flex justify-center">
            <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-white/8 text-[#A8B8C8]" : "bg-white/80 text-[#5F788C] shadow-[0_8px_18px_rgba(16,36,62,0.06)]"}`}>
              Today
            </span>
          </div>
          {selectedThread.messages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "self" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] ${message.sender === "self" ? "pr-0.5" : "pr-8"}`}>
                {!["self"].includes(message.sender) ? (
                  <div className="mb-0.5 flex items-center gap-2 px-1">
                    {message.sender === "tom" ? (
                      <Avatar label="TOM" accent="#0F7DBA" imageSrc="/logo-medaskca.png" sizeClass="h-8 w-8" />
                    ) : (
                      <Avatar label={message.author} accent={selectedThread.accent} sizeClass="h-8 w-8" />
                    )}
                    <span className={`text-[12px] font-medium ${isDark ? "text-[#8EA5BA]" : "text-[#6B7280]"}`}>{message.author}</span>
                  </div>
                ) : null}
                <div
                  className={`rounded-[24px] px-4 py-3 text-[15px] leading-6 ${
                    message.sender === "self"
                      ? "rounded-br-[10px] bg-[#0096C7] text-white"
                      : message.sender === "tom"
                        ? "rounded-bl-[10px] bg-[#D7F2FB] text-[#10243E]"
                        : "rounded-bl-[10px] bg-[#D7F2FB] text-[#10243E]"
                  }`}
                >
                  {message.imageUrl ? (
                    <div className={message.body ? "space-y-3" : ""}>
                      <img src={message.imageUrl} alt={message.imageName ?? "Shared image"} className="max-h-72 w-full rounded-[16px] object-cover" />
                      {message.body ? <p>{message.body}</p> : null}
                    </div>
                  ) : (
                    message.body
                  )}
                </div>
                {selectedThread.id === "direct-tom" && message.sender === "tom" ? (
                  <button
                    type="button"
                    onClick={() => forwardTomMessage(message.body)}
                    className={`mt-2 ml-2 inline-flex rounded-full px-3 py-1.5 text-[11px] font-medium ${isDark ? "bg-white/8 text-[#A8B8C8]" : "bg-white/80 text-[#5F788C]"}`}
                  >
                    Forward to group
                  </button>
                ) : null}
                <p className={`mt-0.5 px-2 text-[11px] ${isDark ? "text-[#7F93A9]" : "text-[#6B7280]"} ${message.sender === "self" ? "text-right" : "text-left"}`}>{message.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+92px)] z-10 mx-auto max-w-[460px] border-t px-3 pt-2 pb-3 ${isDark ? "border-white/6 bg-[#091321]/96 backdrop-blur-xl" : "border-[#D6E7EE] bg-[#E9EEF2]/96 backdrop-blur-xl"}`}>
          {pendingImagePreview ? (
            <div className={`mb-2 flex items-center gap-3 rounded-[18px] px-3 py-2 ${isDark ? "bg-white/8" : "border border-[#D6E7EE] bg-white"}`}>
              <img src={pendingImagePreview} alt="Pending attachment" className="h-12 w-12 rounded-[12px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className={`truncate text-[13px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{pendingImage?.name ?? "Photo attachment"}</p>
                <p className={`text-[12px] ${isDark ? "text-[#8EA5BA]" : "text-[#61758B]"}`}>Will send with your next message</p>
              </div>
              <button type="button" onClick={clearPendingImage} className={`rounded-full px-3 py-1 text-[12px] ${isDark ? "bg-white/8 text-white" : "bg-[#EEF5F8] text-[#5F788C]"}`}>
                Clear
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <div className={`flex min-h-12 flex-1 items-center gap-3 rounded-[26px] px-3 ${isDark ? "bg-white/8" : "border border-[#D6E7EE] bg-white shadow-[0_10px_24px_rgba(16,36,62,0.08)]"}`}>
              <input
                ref={mobileFileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => handlePickImage(event.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button type="button" onClick={() => mobileFileInputRef.current?.click()} className={`flex h-9 w-9 items-center justify-center rounded-full ${isDark ? "bg-white/8 text-white" : "bg-[#EEF5F8] text-[#5F788C]"}`}>
                <Plus size={18} />
              </button>
              <input
                value={threadDraft}
                onChange={(event) => setThreadDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void sendThreadMessage()
                }}
                placeholder="Message"
                className={`w-full bg-transparent text-[15px] outline-none ${isDark ? "text-white placeholder:text-[#8EA5BA]" : "text-[#10243E] placeholder:text-[#7C93A7]"}`}
              />
              <button type="button" className={`flex h-9 w-9 items-center justify-center rounded-full ${isDark ? "bg-white/8 text-white" : "bg-[#EEF5F8] text-[#5F788C]"}`}>
                <CircleDot size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => void sendThreadMessage()}
              disabled={!canSendThreadMessage}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white transition-opacity ${
                canSendThreadMessage ? "bg-[#0D8CCB]" : "bg-[#9DCBDE]"
              }`}
            >
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderLibraryHomeMobile() {
    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+156px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <button
          type="button"
          onClick={() => setActiveCollection("community")}
          className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
        >
          <Search size={18} className={isDark ? "text-[#8EA5BA]" : "text-[#6B859B]"} />
          <span className={`text-[15px] ${isDark ? "text-[#8EA5BA]" : "text-[#7C93A7]"}`}>Search library...</span>
        </button>

        <div className="mt-4">
          <p className={`text-[14px] ${isDark ? "text-[#8EA5BA]" : "text-[#6A8297]"}`}>Workspace</p>
          <h2 className={`mt-1 text-[32px] tracking-[-0.05em] ${isDark ? "text-white" : "text-[#10243E]"}`}>{workspaceLabel}</h2>
          <p className={`mt-2 text-[15px] ${isDark ? "text-[#A0B7CB]" : "text-[#748AA0]"}`}>{libraries.length} collections · {totalCards} procedure cards</p>
        </div>

        <div className="mt-6">
          <h3 className={`text-[24px] font-medium tracking-[-0.03em] ${isDark ? "text-white" : "text-[#10243E]"}`}>Collections</h3>
        </div>

        <div className="mt-4 space-y-4">
          {(["community", "groups", "bookmarks"] as CollectionKey[]).map((key) => {
            const collection = collectionDetails[key]
            return (
            <LibraryCollectionCard
              key={collection.key}
              title={collection.title}
              subtitle={collection.subtitle}
              summary={collection.summary}
              accent={collection.accent}
              infoOpen={expandedCollectionInfo === collection.key}
              onClick={() => setActiveCollection(collection.key)}
              onToggleInfo={() => setExpandedCollectionInfo((current) => (current === collection.key ? null : collection.key))}
            />
            )
          })}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["review", "calendar", "catalogue", "directory"] as CollectionKey[]).map((key) => {
            const collection = collectionDetails[key]
            return (
            <button
              key={collection.key}
              type="button"
              onClick={() => setActiveCollection(collection.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] shadow-[0_6px_14px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#27415D] bg-[#132238] text-[#A0B7CB]" : "border border-[#D6E7EE] bg-white text-[#4E657A]"}`}
            >
              {collection.title}
            </button>
            )
          })}
        </div>

        <div className={`mt-5 rounded-[24px] p-4 shadow-[0_10px_24px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D8E8EE] bg-white"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={`text-[18px] font-semibold ${isDark ? "text-white" : "text-[#10243E]"}`}>Library in one place</p>
              <p className={`mt-1 text-[14px] leading-6 ${isDark ? "text-[#A0B7CB]" : "text-[#5F788C]"}`}>
                The current PrepSight library stays intact underneath this tab. Collections, cards, bookmarks, review, calendar, and catalogue all live here.
              </p>
            </div>
            <LibraryBig size={22} className="shrink-0 text-[#0F7DBA]" />
          </div>
        </div>
      </div>
    )
  }

  function renderCollectionDetailMobile() {
    if (!activeCollectionDetail) return null

    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+156px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <div className={`rounded-[24px] p-4 shadow-[0_10px_24px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}>
          <p className="text-[18px] font-semibold">{activeCollectionDetail.title}</p>
          <p className={`mt-1 text-[14px] leading-6 ${isDark ? "text-[#A0B7CB]" : "text-[#5F788C]"}`}>{activeCollectionDetail.subtitle}</p>
          <p className={`mt-3 text-[14px] leading-6 ${isDark ? "text-[#D6E4EF]" : "text-[#35516A]"}`}>{activeCollectionDetail.summary}</p>
        </div>

        <div className="mt-4 space-y-3">
          {activeCollectionDetail.items.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => openCollectionItem(activeCollectionDetail.key, index)}
              className={`flex w-full items-center justify-between rounded-[22px] px-4 py-4 text-left shadow-[0_8px_18px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
            >
              <div className="min-w-0">
                <p className={`truncate text-[16px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{item.title}</p>
                <p className={`mt-1 truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{item.meta}</p>
              </div>
              <ChevronRight size={18} className={`shrink-0 ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`} />
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderLibraryHomeMobileRefined() {
    const librarySections = [
      {
        key: "community" as const,
        title: "Community",
        tone: "bg-[#DFF3FA] text-[#0F4C5C]",
        items: globalLibraries.map((library) => ({
          title: `${library.ownerPublicAlias ?? library.ownerName}/${library.name}`,
          meta: `${getLibraryCardsSnapshot(library.id).length} procedures · PrepSight library`,
          onClick: () => router.push(`/libraries/${library.id}`),
        })),
      },
      {
        key: "groups" as const,
        title: "My Groups",
        tone: "bg-[#DDF6F4] text-[#124A4B]",
        items: localLibraries.map((library) => ({
          title: `${library.ownerName}/${library.name}`,
          meta: `${getLibraryCardsSnapshot(library.id).length} procedures · ${library.ownerName} library`,
          onClick: () => router.push(`/libraries/${library.id}`),
        })),
      },
      {
        key: "bookmarks" as const,
        title: "Bookmarks",
        tone: "bg-[#FFF4D6] text-[#6F4D00]",
        items: bookmarks.slice(0, 6).map((bookmark) => ({
          title: bookmark.title,
          meta: bookmark.subtitle,
          onClick: () => router.push(bookmark.href),
        })),
      },
    ]

    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+156px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <button
          type="button"
          onClick={() => setActiveCollection("community")}
          className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
        >
          <Search size={18} className={isDark ? "text-[#8EA5BA]" : "text-[#6B859B]"} />
          <span className={`text-[15px] ${isDark ? "text-[#8EA5BA]" : "text-[#7C93A7]"}`}>Search library...</span>
        </button>

        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["review", "calendar", "catalogue", "directory"] as CollectionKey[]).map((key) => {
            const collection = collectionDetails[key]
            return (
              <button
                key={collection.key}
                type="button"
                onClick={() => setActiveCollection(collection.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] shadow-[0_6px_14px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#5CC7C4] bg-[#1A3B3F] text-white" : "border border-[#5CC7C4] bg-[#5CC7C4] text-white"}`}
              >
                {collection.title}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          <h3 className={`text-[22px] font-medium tracking-[-0.03em] ${isDark ? "text-white" : "text-[#10243E]"}`}>Collections</h3>
        </div>

        <div className="mt-4 space-y-3">
          {librarySections.map((section) => {
            const collection = collectionDetails[section.key]
            const isOpen = openLibrarySections[section.key]
            const isInfoOpen = expandedCollectionInfo === section.key
            return (
              <div
                key={section.key}
                className={`overflow-hidden rounded-[24px] shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
              >
                <div className="flex items-center gap-3 px-4 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenLibrarySections((current) => ({
                        ...current,
                        [section.key]: !current[section.key],
                      }))
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${section.tone}`}>
                      <FolderClosed size={20} />
                    </div>
                    <p className={`truncate text-[18px] font-semibold tracking-[-0.03em] ${isDark ? "text-white" : "text-[#10243E]"}`}>{section.title}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedCollectionInfo((current) => (current === section.key ? null : section.key))}
                    aria-label={`Show information about ${section.title}`}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isDark ? "bg-white/8 text-[#A0B7CB]" : "bg-[#E7F4FA] text-[#4D6B80]"}`}
                  >
                    <Info size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenLibrarySections((current) => ({
                        ...current,
                        [section.key]: !current[section.key],
                      }))
                    }
                    aria-label={isOpen ? `Collapse ${section.title}` : `Expand ${section.title}`}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isDark ? "bg-white/8 text-[#A0B7CB]" : "bg-[#F3F8FB] text-[#5A7288]"}`}
                  >
                    <ChevronRight size={18} className={isOpen ? "rotate-90 transition-transform" : "transition-transform"} />
                  </button>
                </div>
                {isInfoOpen ? (
                  <div className={`${isDark ? "border-t border-white/8 bg-white/4" : "border-t border-[#E2EDF2] bg-[#F6FBFD]"} px-4 py-3`}>
                    <p className={`text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#597389]"}`}>{collection.subtitle}</p>
                    <p className={`mt-2 text-[14px] leading-6 ${isDark ? "text-[#D6E4EF]" : "text-[#35516A]"}`}>{collection.summary}</p>
                  </div>
                ) : null}
                {isOpen ? (
                  <div className={`${isDark ? "border-t border-white/8" : "border-t border-[#E2EDF2]"} px-4 py-2`}>
                    {section.items.length > 0 ? (
                      <div className="space-y-1">
                        {section.items.map((item, index) => (
                          <button
                            key={`${section.key}-${index}-${item.title}`}
                            type="button"
                            onClick={item.onClick}
                            className={`flex w-full items-center justify-between gap-3 rounded-[16px] px-3 py-3 text-left ${isDark ? "hover:bg-white/4" : "hover:bg-[#F6FBFD]"}`}
                          >
                            <div className="min-w-0">
                              <p className={`truncate text-[14px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{item.title}</p>
                              <p className={`mt-0.5 truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{item.meta}</p>
                            </div>
                            <ChevronRight size={16} className={`shrink-0 ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={`py-3 text-[14px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{collection.summary}</p>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

      </div>
    )
  }

  function renderLibraryHomeMobileV3Embedded() {
    const inlineCollection =
      activeLibraryPanel === "collections" ? null : collectionDetails[activeLibraryPanel]

    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+156px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <button
          type="button"
          className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
        >
          <Search size={18} className={isDark ? "text-[#8EA5BA]" : "text-[#6B859B]"} />
          <span className={`text-[15px] ${isDark ? "text-[#8EA5BA]" : "text-[#7C93A7]"}`}>Search library...</span>
        </button>

        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {([
            { key: "collections" as const, label: "Collections" },
            { key: "review" as const, label: "Review" },
            { key: "calendar" as const, label: "Calendar" },
            { key: "catalogue" as const, label: "Catalogue" },
            { key: "directory" as const, label: "Directory" },
          ]).map((item) => {
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveLibraryPanel(item.key)
                  setActiveEmbeddedLibraryId(null)
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-[13px] shadow-[0_6px_14px_rgba(16,36,62,0.05)] ${
                  activeLibraryPanel === item.key
                    ? isDark
                      ? "border border-[#5CC7C4] bg-[#1A3B3F] text-white"
                      : "border border-[#5CC7C4] bg-[#5CC7C4] text-white"
                    : isDark
                      ? "border border-[#27415D] bg-[#132238] text-[#A0B7CB]"
                      : "border border-[#D6E7EE] bg-white text-[#4E657A]"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="mt-6">
          {activeEmbeddedLibraryId ? (
            <LibraryPageClient libraryId={activeEmbeddedLibraryId} embedded />
          ) : inlineCollection ? (
            <div className="space-y-3">
              <div className={`rounded-[26px] p-5 shadow-[0_12px_26px_rgba(16,36,62,0.08)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}>
                <p className={`text-[13px] uppercase tracking-[0.16em] ${isDark ? "text-[#79CFE6]" : "text-[#0D8CCB]"}`}>{inlineCollection.title}</p>
                <p className="mt-2 text-[15px] leading-6">{inlineCollection.summary}</p>
              </div>

              <div className="space-y-3">
                {inlineCollection.items.map((item, index) => (
                  <button
                    key={`${inlineCollection.key}-${index}-${item.title}`}
                    type="button"
                    onClick={() => openCollectionItem(inlineCollection.key, index)}
                    className={`flex w-full items-center justify-between rounded-[22px] px-4 py-4 text-left shadow-[0_8px_18px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-[16px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{item.title}</p>
                      <p className={`mt-1 truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{item.meta}</p>
                    </div>
                    <ChevronRight size={18} className={`shrink-0 ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <EmbeddedLibrariesDashboardMobile onSelectLibrary={setActiveEmbeddedLibraryId} />
          )}
        </div>
      </div>
    )
  }

  function renderCollectionDetailMobileRefined() {
    if (!activeCollectionDetail) return null

    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+156px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <div className={`rounded-[26px] p-5 shadow-[0_12px_26px_rgba(16,36,62,0.08)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}>
          <p className={`text-[13px] uppercase tracking-[0.16em] ${isDark ? "text-[#79CFE6]" : "text-[#0D8CCB]"}`}>Collection</p>
          <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em]">{activeCollectionDetail.title}</p>
          <p className={`mt-2 text-[14px] leading-6 ${isDark ? "text-[#A0B7CB]" : "text-[#5F788C]"}`}>{activeCollectionDetail.subtitle}</p>
          <p className={`mt-3 text-[14px] leading-6 ${isDark ? "text-[#D6E4EF]" : "text-[#35516A]"}`}>{activeCollectionDetail.summary}</p>
        </div>

        <div className="mt-4 space-y-3">
          {activeCollectionDetail.items.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => openCollectionItem(activeCollectionDetail.key, index)}
              className={`flex w-full items-center justify-between rounded-[22px] px-4 py-4 text-left shadow-[0_8px_18px_rgba(16,36,62,0.05)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
            >
              <div className="min-w-0">
                <p className={`truncate text-[16px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{item.title}</p>
                <p className={`mt-1 truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{item.meta}</p>
              </div>
              <ChevronRight size={18} className={`shrink-0 ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`} />
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderLogisticsHomeMobile() {
    const activePanelDetail = logisticsDetails[activeLogisticsPanel]

    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+156px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <button
          type="button"
          className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
        >
          <Search size={18} className={isDark ? "text-[#8EA5BA]" : "text-[#6B859B]"} />
          <span className={`text-[15px] ${isDark ? "text-[#8EA5BA]" : "text-[#7C93A7]"}`}>Search logistics...</span>
        </button>

        <div className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[
            { label: "Workforce", key: "members" as LogisticsKey },
            { label: "Equipment", key: "equipment" as LogisticsKey },
            { label: "Supplies", key: "access" as LogisticsKey },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActiveLogisticsPanel(item.key)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] shadow-[0_6px_14px_rgba(16,36,62,0.05)] ${
                activeLogisticsPanel === item.key
                  ? isDark
                    ? "border border-[#5CC7C4] bg-[#1A3B3F] text-white"
                    : "border border-[#5CC7C4] bg-[#5CC7C4] text-white"
                  : isDark
                    ? "border border-[#27415D] bg-[#132238] text-[#A0B7CB]"
                    : "border border-[#D6E7EE] bg-white text-[#4E657A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className={`rounded-[26px] p-5 shadow-[0_12px_26px_rgba(16,36,62,0.08)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}>
            <p className={`text-[13px] uppercase tracking-[0.16em] ${isDark ? "text-[#79CFE6]" : "text-[#0D8CCB]"}`}>{activePanelDetail.title}</p>
            <p className={`mt-2 text-[14px] leading-6 ${isDark ? "text-[#D6E4EF]" : "text-[#35516A]"}`}>{activePanelDetail.detail}</p>
          </div>

          {activePanelDetail.rows.map((row, index) => (
            <button
              key={`${activePanelDetail.key}-${index}-${row.title}`}
              type="button"
              onClick={() => openLogisticsItem(activePanelDetail.key, index)}
              className="block w-full rounded-[24px] p-4 text-left text-[#10243E]"
              style={{ backgroundColor: activePanelDetail.tone }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold">{row.title}</p>
                  <p className="mt-1 text-[14px] text-[#35516A]">{row.meta}</p>
                </div>
                <ChevronRight size={18} className="shrink-0 text-[#35516A]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderLogisticsDetailMobile() {
    if (!activeLogisticsDetail) return null

    return (
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]">
        <div className="rounded-[24px] border border-white/6 bg-white/5 p-4">
          <p className="text-[18px] font-semibold text-white">{activeLogisticsDetail.title}</p>
          <p className="mt-1 text-[14px] leading-6 text-[#A0B7CB]">{activeLogisticsDetail.detail}</p>
        </div>

        <div className="mt-4 space-y-3">
          {activeLogisticsDetail.rows.map((row, index) => (
            <button
              key={row.title}
              type="button"
              onClick={() => openLogisticsItem(activeLogisticsDetail.key, index)}
              className="block w-full rounded-[22px] bg-white/8 px-4 py-4 text-left"
            >
              <p className="text-[16px] font-medium text-white">{row.title}</p>
              <p className="mt-1 text-[13px] text-[#A0B7CB]">{row.meta}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  function renderUpdatesHomeMobile() {
    return (
      <div className={`${isDark ? "bg-[#0B1626] text-white" : "bg-[#EEF5F8] text-[#10243E]"} px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]`}>
        <button
          type="button"
          onClick={() => setActiveUpdate("community")}
          className={`flex w-full items-center gap-3 rounded-[20px] px-4 py-3 text-left shadow-[0_10px_24px_rgba(16,36,62,0.06)] ${isDark ? "border border-[#27415D] bg-[#132238]" : "border border-[#D6E7EE] bg-white"}`}
        >
          <Search size={18} className={isDark ? "text-[#8EA5BA]" : "text-[#6B859B]"} />
          <span className={`text-[15px] ${isDark ? "text-[#8EA5BA]" : "text-[#7C93A7]"}`}>Search updates...</span>
        </button>

        <div className="mt-4 space-y-3">
          {(["community", "logistics", "bookmarks"] as UpdateKey[]).map((key) => {
            const item = updateDetails[key]
            return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveUpdate(item.key)}
              className="block w-full rounded-[24px] border border-white/6 bg-white/5 p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[17px] font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-[14px] leading-6 text-[#A0B7CB]">{item.detail}</p>
                </div>
                <span className="shrink-0 text-[12px] text-[#7F93A9]">{item.time}</span>
              </div>
            </button>
            )
          })}
        </div>
      </div>
    )
  }

  function renderUpdateDetailMobile() {
    if (!activeUpdateDetail) return null

    return (
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom,0px)+92px)] pt-[calc(env(safe-area-inset-top,0px)+84px)]">
        <button
          type="button"
          onClick={() => openUpdateItem(activeUpdateDetail.key)}
          className="block w-full rounded-[24px] border border-white/6 bg-white/5 p-4 text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[18px] font-semibold text-white">{activeUpdateDetail.title}</p>
              <p className="mt-1 text-[14px] leading-6 text-[#A0B7CB]">{activeUpdateDetail.detail}</p>
            </div>
            <span className="shrink-0 text-[12px] text-[#7F93A9]">{activeUpdateDetail.time}</span>
          </div>
          <p className="mt-4 text-[14px] leading-6 text-[#D6E4EF]">{activeUpdateDetail.body}</p>
        </button>
      </div>
    )
  }

  function renderDesktopMain() {
    if (activeTab === "chat") {
      return (
        <div className="space-y-4">
          <div className="rounded-[26px] border border-[#D8E8EE] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]">
            <p className="text-[14px] text-[#5B7A8A]">Chat</p>
            <h1 className="mt-1 text-[34px] tracking-[-0.05em] text-[#10243E]">Group and direct communication</h1>
            <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#61758B]">
              Desktop V4 keeps the PrepSight shell and puts communication into the working layout rather than turning it into a separate mobile-style surface.
            </p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {chatThreads.filter((thread) => thread.type === "group").map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => openThread(thread.id)}
                className="rounded-[22px] border border-[#D8E8EE] bg-white p-5 text-left shadow-[0_12px_28px_-24px_rgba(16,36,62,0.28)]"
              >
                <div className="flex items-center gap-3">
                  <Avatar label={thread.title} accent={thread.accent} online={thread.online} />
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-semibold text-[#10243E]">{thread.title}</p>
                    <p className="truncate text-[14px] text-[#61758B]">{thread.preview}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (activeTab === "library") {
      if (activeCollectionDetail) {
        if (activeCollectionDetail.key === "bookmarks") {
          return (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveCollection(null)} className="inline-flex items-center gap-2 text-[14px] text-[#0F4C5C]">
                <ArrowLeft size={16} />
                Back to library
              </button>
              <div className="rounded-[26px] border border-[#D8E8EE] bg-white shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]">
                <BookmarksPageClient embedded />
              </div>
            </div>
          )
        }

        if (activeCollectionDetail.key === "calendar") {
          return (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveCollection(null)} className="inline-flex items-center gap-2 text-[14px] text-[#0F4C5C]">
                <ArrowLeft size={16} />
                Back to library
              </button>
              <CalendarPageClient embedded />
            </div>
          )
        }

        return (
          <div className="space-y-4">
            <button type="button" onClick={() => setActiveCollection(null)} className="inline-flex items-center gap-2 text-[14px] text-[#0F4C5C]">
              <ArrowLeft size={16} />
              Back to library
            </button>
            <div className="rounded-[26px] border border-[#D8E8EE] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]">
              <p className="text-[34px] tracking-[-0.05em] text-[#10243E]">{activeCollectionDetail.title}</p>
              <p className="mt-2 text-[15px] leading-7 text-[#61758B]">{activeCollectionDetail.subtitle}</p>
              <div className="mt-5 space-y-3">
                {activeCollectionDetail.items.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => openCollectionItem(activeCollectionDetail.key, index)}
                    className="block w-full rounded-[18px] border border-[#DCEAF0] bg-[#F8FBFD] px-4 py-4 text-left"
                  >
                    <p className="text-[16px] font-medium text-[#10243E]">{item.title}</p>
                    <p className="mt-1 text-[14px] text-[#61758B]">{item.meta}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="space-y-4">
          <div className="rounded-[26px] border border-[#D8E8EE] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]">
            <p className="text-[14px] text-[#5B7A8A]">Workspace</p>
            <h1 className="mt-1 text-[34px] tracking-[-0.05em] text-[#10243E]">{workspaceLabel}</h1>
            <p className="mt-2 text-[15px] text-[#61758B]">{libraries.length} collections · {totalCards} procedure cards</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {(["community", "groups", "bookmarks", "review"] as CollectionKey[]).map((key) => {
              const collection = collectionDetails[key]
              return (
              <LibraryCollectionCard
                key={collection.key}
                title={collection.title}
                subtitle={collection.subtitle}
                summary={collection.summary}
                accent={collection.accent}
                infoOpen={expandedCollectionInfo === collection.key}
                onClick={() => (key === "review" ? openLibraryDestination(key) : setActiveCollection(collection.key))}
                onToggleInfo={() => setExpandedCollectionInfo((current) => (current === collection.key ? null : collection.key))}
              />
              )
            })}
          </div>
          <div className="rounded-[26px] border border-[#D8E8EE] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[14px] text-[#5B7A8A]">More from V3</p>
                <p className="mt-1 text-[24px] tracking-[-0.04em] text-[#10243E]">Calendar, catalogue, and directory</p>
              </div>
              <LibraryBig size={22} className="shrink-0 text-[#0F7DBA]" />
            </div>
            <div className="mt-5 grid gap-3 xl:grid-cols-3">
              {(["calendar", "catalogue", "directory"] as CollectionKey[]).map((key) => {
                const collection = collectionDetails[key]
                return (
                  <button
                    key={collection.key}
                    type="button"
                    onClick={() => setActiveCollection(collection.key)}
                    className="rounded-[20px] border border-[#DCEAF0] bg-[#F8FBFD] p-4 text-left"
                  >
                    <p className="text-[18px] font-medium text-[#10243E]">{collection.title}</p>
                    <p className="mt-2 text-[14px] leading-6 text-[#61758B]">{collection.summary}</p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === "logistics") {
      if (activeLogisticsDetail) {
        return (
          <div className="space-y-4">
            <button type="button" onClick={() => setActiveLogistics(null)} className="inline-flex items-center gap-2 text-[14px] text-[#0F4C5C]">
              <ArrowLeft size={16} />
              Back to logistics
            </button>
            <div className="rounded-[26px] border border-[#D8E8EE] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]">
              <p className="text-[34px] tracking-[-0.05em] text-[#10243E]">{activeLogisticsDetail.title}</p>
              <p className="mt-2 text-[15px] leading-7 text-[#61758B]">{activeLogisticsDetail.detail}</p>
              <div className="mt-5 space-y-3">
                {activeLogisticsDetail.rows.map((row, index) => (
                  <button
                    key={row.title}
                    type="button"
                    onClick={() => openLogisticsItem(activeLogisticsDetail.key, index)}
                    className="block w-full rounded-[18px] border border-[#DCEAF0] bg-[#F8FBFD] px-4 py-4 text-left"
                  >
                    <p className="text-[16px] font-medium text-[#10243E]">{row.title}</p>
                    <p className="mt-1 text-[14px] text-[#61758B]">{row.meta}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="grid gap-4 xl:grid-cols-3">
          {(["members", "access", "equipment"] as LogisticsKey[]).map((key) => {
            const section = logisticsDetails[key]
            return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveLogistics(section.key)}
              className="rounded-[24px] p-5 text-left shadow-[0_18px_36px_-28px_rgba(16,36,62,0.22)]"
              style={{ backgroundColor: section.tone }}
            >
              <p className="text-[22px] font-semibold tracking-[-0.04em] text-[#10243E]">{section.title}</p>
              <p className="mt-2 text-[15px] text-[#35516A]">{section.detail}</p>
            </button>
            )
          })}
        </div>
      )
    }

    if (activeUpdateDetail) {
      return (
        <div className="space-y-4">
          <button type="button" onClick={() => setActiveUpdate(null)} className="inline-flex items-center gap-2 text-[14px] text-[#0F4C5C]">
            <ArrowLeft size={16} />
            Back to updates
          </button>
          <button
            type="button"
            onClick={() => openUpdateItem(activeUpdateDetail.key)}
            className="block w-full rounded-[26px] border border-[#D8E8EE] bg-white p-6 text-left shadow-[0_18px_40px_-30px_rgba(16,36,62,0.24)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[34px] tracking-[-0.05em] text-[#10243E]">{activeUpdateDetail.title}</p>
                <p className="mt-2 text-[15px] leading-7 text-[#61758B]">{activeUpdateDetail.detail}</p>
              </div>
              <span className="text-[13px] text-[#61758B]">{activeUpdateDetail.time}</span>
            </div>
            <p className="mt-5 text-[15px] leading-7 text-[#35516A]">{activeUpdateDetail.body}</p>
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {(["community", "logistics", "bookmarks"] as UpdateKey[]).map((key) => {
          const item = updateDetails[key]
          return (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveUpdate(item.key)}
            className="block w-full rounded-[24px] border border-[#D8E8EE] bg-white p-5 text-left shadow-[0_18px_36px_-28px_rgba(16,36,62,0.22)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[22px] font-semibold tracking-[-0.04em] text-[#10243E]">{item.title}</p>
                <p className="mt-2 text-[15px] text-[#61758B]">{item.detail}</p>
              </div>
              <span className="text-[13px] text-[#61758B]">{item.time}</span>
            </div>
          </button>
          )
        })}
      </div>
    )
  }

  function renderDesktopShell() {
    return (
      <div className={`hidden min-h-screen overflow-hidden lg:block ${isDark ? "bg-[linear-gradient(180deg,#0B1422_0%,#0F1B2D_100%)]" : "bg-[linear-gradient(180deg,#E5F5F8_0%,#F4F8FB_100%)]"}`}>
        <header className={`flex h-[72px] items-center justify-between px-6 text-white ${isDark ? "border-b border-[#20344C] bg-[#0F1B2D]" : "border-b border-[#0F4C5C] bg-[#0077B6]"}`}>
          <div className="flex items-center gap-4">
            <button type="button" className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${isDark ? "border border-[#20344C] bg-white/10 text-white" : "border border-[#0F4C5C] bg-white/88 text-[#22425C]"}`}>
              <Menu size={18} />
            </button>
            <p className="text-[28px] tracking-[-0.05em]">PrepSight</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex w-[420px] items-center gap-2 rounded-[12px] px-3 py-2.5 ${isDark ? "border border-[#20344C] bg-[#132238] text-[#A0B7CB]" : "border border-[#0F4C5C] bg-white text-[#61758B]"}`}>
              <Search size={16} />
              <span className="text-[14px]">Search anywhere...</span>
            </div>
            <ThemeButton isDark={isDark} onToggle={toggleAppearance} />
            <button type="button" className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${isDark ? "border border-[#20344C] bg-white/10 text-white" : "border border-[#0F4C5C] bg-white/88 text-[#22425C]"}`}>
              <UserRound size={18} />
            </button>
          </div>
        </header>

        <main className="grid min-h-[calc(100vh-72px)] grid-cols-[210px_minmax(0,1fr)_380px] gap-x-0">
          <aside className={`px-3 py-4 text-white ${isDark ? "border-r border-[#20344C] bg-[#102137]" : "border-r border-[#CFE4EB] bg-[#0096C7]"}`}>
            <div className="space-y-2">
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon
                const active = item.key === activeTab
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => openTab(item.key)}
                    className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left ${active ? "bg-white/14" : "hover:bg-white/8"}`}
                  >
                    <Icon size={18} />
                    <span className="text-[15px]">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          <section className="overflow-y-auto px-6 py-6">{renderDesktopMain()}</section>

          <aside className={`${isDark ? "border-l border-[#20344C] bg-[#0F1B2D]" : "border-l border-[#D8E8EE] bg-[#F8FBFD]"}`}>
            <div className="flex h-full flex-col">
              <div className={`${isDark ? "border-b border-[#20344C]" : "border-b border-[#D8E8EE]"} px-5 py-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-[22px] tracking-[-0.04em] ${isDark ? "text-white" : "text-[#10243E]"}`}>Chat</p>
                    <p className={`mt-1 text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{selectedThread ? selectedThread.title : "Select a thread"}</p>
                  </div>
                  <button type="button" onClick={addNewChat} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0D8CCB] text-white">
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className={`${isDark ? "border-b border-[#20344C]" : "border-b border-[#D8E8EE]"} px-4 py-3`}>
                <div className="space-y-2">
                  {chatThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => openThread(thread.id)}
                      className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left ${
                        selectedThreadId === thread.id
                          ? isDark
                            ? "bg-[#132238]"
                            : "bg-[#E8F6FB]"
                          : isDark
                            ? "bg-[#16283F] hover:bg-[#1B304A]"
                            : "bg-white hover:bg-[#F3F9FB]"
                      }`}
                    >
                      <Avatar label={thread.title} accent={thread.accent} online={thread.online} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`truncate text-[15px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{thread.title}</p>
                          <span className={`text-[11px] ${isDark ? "text-[#8EA5BA]" : "text-[#7A90A4]"}`}>{thread.time}</span>
                        </div>
                        <p className={`mt-1 truncate text-[13px] ${isDark ? "text-[#A0B7CB]" : "text-[#61758B]"}`}>{thread.preview}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {selectedThread ? (
                  selectedThread.messages.map((message) => (
                    <DesktopRailMessage key={message.id} message={message} threadAccent={selectedThread.accent} />
                  ))
                ) : (
                  <div className={`rounded-[20px] p-4 text-[14px] leading-6 ${isDark ? "border border-[#20344C] bg-[#132238] text-[#A0B7CB]" : "border border-[#D8E8EE] bg-white text-[#61758B]"}`}>
                    Open a thread on the left. TOM is now treated like a normal chat contact.
                  </div>
                )}
              </div>

              <div className={`${isDark ? "border-t border-[#20344C] bg-[#0F1B2D]" : "border-t border-[#D8E8EE] bg-white"} px-4 py-3`}>
                {pendingImagePreview ? (
                  <div className={`mb-3 flex items-center gap-3 rounded-[18px] px-3 py-2 ${isDark ? "bg-[#132238]" : "border border-[#D8E8EE] bg-[#F8FBFD]"}`}>
                    <img src={pendingImagePreview} alt="Pending attachment" className="h-12 w-12 rounded-[12px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[13px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{pendingImage?.name ?? "Photo attachment"}</p>
                      <p className={`text-[12px] ${isDark ? "text-[#8EA5BA]" : "text-[#61758B]"}`}>Will send with your next message</p>
                    </div>
                    <button type="button" onClick={clearPendingImage} className={`rounded-full px-3 py-1 text-[12px] ${isDark ? "bg-white/8 text-white" : "bg-white text-[#5F788C]"}`}>
                      Clear
                    </button>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <div className={`flex min-h-12 flex-1 items-center gap-2 rounded-full px-4 ${isDark ? "bg-[#132238]" : "bg-[#F3F8FB]"}`}>
                    <input
                      ref={desktopFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handlePickImage(event.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                    <button type="button" onClick={() => desktopFileInputRef.current?.click()} className={`flex h-8 w-8 items-center justify-center rounded-full ${isDark ? "bg-white/8 text-white" : "bg-white text-[#5F788C]"}`}>
                      <Plus size={16} />
                    </button>
                    <input
                      value={threadDraft}
                      onChange={(event) => setThreadDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void sendThreadMessage()
                      }}
                      placeholder="Message"
                      className={`w-full bg-transparent text-[14px] outline-none ${isDark ? "text-white placeholder:text-[#8EA5BA]" : "text-[#10243E] placeholder:text-[#7E93A6]"}`}
                    />
                  </div>
                  <button type="button" onClick={() => void sendThreadMessage()} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0D8CCB] text-white">
                    <SendHorizontal size={18} />
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </main>

        {renderTomOverlayDesktop()}
      </div>
    )
  }

  function renderTomOverlayMobile() {
    if (!tomOpen) return null

    return (
      <div className="fixed inset-0 z-40 mx-auto max-w-[460px] bg-[linear-gradient(180deg,#07111D_0%,#0A1524_100%)] lg:hidden">
        <div className="border-b border-white/6 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setTomOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-white">
              <ArrowLeft size={20} />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F7DBA] text-white">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-semibold text-white">TOM</p>
              <p className="text-[13px] text-[#97ABC0]">Private assistant for chat, library, and logistics</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 overflow-y-auto px-4 py-4 pb-28">
          {tomMessages.map((message) => (
            <div key={message.id} className={`flex ${message.sender === "self" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[84%]">
                {message.sender !== "self" ? (
                  <div className="mb-1 flex items-center gap-2 px-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F7DBA] text-white">
                      <Sparkles size={14} />
                    </div>
                    <span className="text-[12px] font-medium text-[#88A0B4]">TOM</span>
                  </div>
                ) : null}
                <div className={`rounded-[24px] px-4 py-3 text-[15px] leading-6 ${message.sender === "self" ? "rounded-br-[8px] bg-[#A9F0F1] text-[#0F2940]" : "rounded-bl-[8px] bg-[#E2F4FF] text-[#10243E]"}`}>
                  {message.body}
                </div>
                <p className={`mt-1 px-2 text-[11px] text-[#7F93A9] ${message.sender === "self" ? "text-right" : "text-left"}`}>{message.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[460px] border-t border-white/6 bg-[#091321] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
          <div className="flex items-center gap-2">
            <button type="button" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/6 text-white">
              <Plus size={18} />
            </button>
            <div className="flex min-h-12 flex-1 items-center rounded-full bg-white/8 px-4">
              <input
                value={tomDraft}
                onChange={(event) => setTomDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendTomMessage()
                }}
                placeholder="Ask TOM"
                className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#8EA5BA]"
              />
            </div>
            <button type="button" onClick={sendTomMessage} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0D8CCB] text-white">
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderTomOverlayDesktop() {
    if (!tomOpen) return null

    return (
      <div className="hidden lg:fixed lg:inset-0 lg:z-50 lg:flex lg:items-center lg:justify-center lg:bg-black/32">
        <div className="w-full max-w-[760px] rounded-[30px] bg-[linear-gradient(180deg,#07111D_0%,#0A1524_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0F7DBA] text-white">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[22px] tracking-[-0.04em] text-white">TOM</p>
                <p className="text-[13px] text-[#97ABC0]">Private assistant for chat, library, and logistics</p>
              </div>
            </div>
            <button type="button" onClick={() => setTomOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-white">
              <ArrowLeft size={20} />
            </button>
          </div>

          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pb-4">
            {tomMessages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "self" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%]">
                  <div className={`rounded-[24px] px-4 py-3 text-[15px] leading-6 ${message.sender === "self" ? "rounded-br-[8px] bg-[#A9F0F1] text-[#0F2940]" : "rounded-bl-[8px] bg-[#E2F4FF] text-[#10243E]"}`}>
                    {message.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-white/6 pt-4">
            <div className="flex min-h-12 flex-1 items-center rounded-full bg-white/8 px-4">
              <input
                value={tomDraft}
                onChange={(event) => setTomDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendTomMessage()
                }}
                placeholder="Ask TOM"
                className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-[#8EA5BA]"
              />
            </div>
            <button type="button" onClick={sendTomMessage} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0D8CCB] text-white">
              <SendHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <MobileFrame isDark={isDark}>
        {renderMobileTopBar()}

        {selectedThread ? (
          renderThreadMobile()
        ) : activeTab === "chat" ? (
          renderChatList()
        ) : activeTab === "library" ? (
          activeCollectionDetail ? renderCollectionDetailMobileRefined() : renderLibraryHomeMobileV3Embedded()
        ) : activeTab === "logistics" ? (
          activeLogisticsDetail ? renderLogisticsDetailMobile() : renderLogisticsHomeMobile()
        ) : activeUpdateDetail ? (
          renderUpdateDetailMobile()
        ) : (
          renderUpdatesHomeMobile()
        )}

        <div className={`fixed inset-x-0 bottom-0 mx-auto max-w-[460px] ${selectedThread ? "opacity-84" : ""}`}>
          <div className={`border-t px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] shadow-[0_-10px_36px_rgba(4,10,20,0.22)] ${
            selectedThread
              ? "border-white/6 bg-[rgba(27,39,58,0.9)] backdrop-blur-xl"
              : "border-[#D7E9EE] bg-[#0077B6]"
          }`}>
            <div className="grid grid-cols-4 gap-1">
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon
                const active = item.key === activeTab
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (item.key === "chat" && selectedThread) {
                        closeThread()
                        return
                      }
                      openTab(item.key)
                    }}
                    className={`flex flex-col items-center justify-center rounded-[14px] px-2 py-2.5 ${active ? "bg-white/12 text-white" : "text-[#D7E7F7]"}`}
                  >
                    <Icon size={19} />
                    <span className="mt-1 text-[11px] font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {workspacePickerOpen && activeTab === "chat" && !selectedThread ? (
          <div className="fixed inset-0 z-40 mx-auto max-w-[460px] bg-black/28">
            <div className={`absolute top-[calc(env(safe-area-inset-top,0px)+78px)] right-4 left-12 rounded-[28px] border p-3 shadow-[0_18px_40px_rgba(16,36,62,0.22)] ${isDark ? "border-[#20344C] bg-[#102033]" : "border-[#D6E7EE] bg-white"}`}>
              <div className="px-2 pt-1 pb-2">
                <p className={`text-[13px] font-medium uppercase tracking-[0.16em] ${isDark ? "text-[#8EA5BA]" : "text-[#61758B]"}`}>Workspaces</p>
                <p className={`mt-1 text-[15px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>Choose from My Teams</p>
              </div>
              <div className="mt-1 space-y-2">
                {workspaceOptions.map((option) => {
                  const active = option.label === workspaceLabel
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => selectWorkspace(option.label)}
                      className={`flex w-full items-start gap-3 rounded-[22px] border px-3 py-3 text-left transition-colors ${
                        active
                          ? isDark
                            ? "border-[#2C78A0] bg-[linear-gradient(180deg,#17324B_0%,#11273B_100%)]"
                            : "border-[#8BCBE5] bg-[linear-gradient(180deg,#F2FBFE_0%,#E7F5FB_100%)]"
                          : isDark
                            ? "border-[#20344C] bg-[#0F1D2E] hover:bg-[#13253A]"
                            : "border-[#E3EDF2] bg-[#FBFDFF] hover:bg-[#F5FAFC]"
                      }`}
                    >
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] text-[14px] font-semibold ${
                        active
                          ? "bg-[#0D8CCB] text-white"
                          : isDark
                            ? "bg-[#17324B] text-[#B9D9E7]"
                            : "bg-[#EAF6FB] text-[#0D6F96]"
                      }`}>
                        {getInitials(option.label)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className={`truncate text-[15px] font-medium ${isDark ? "text-white" : "text-[#10243E]"}`}>{option.label}</p>
                          {active ? <span className="shrink-0 rounded-full bg-[#0D8CCB] px-2 py-0.5 text-[11px] font-medium text-white">Current</span> : null}
                        </div>
                        <p className={`mt-1 truncate text-[12px] ${isDark ? "text-[#8EA5BA]" : "text-[#61758B]"}`}>{option.detail}</p>
                        <p className={`mt-2 text-[11px] ${isDark ? "text-[#6F89A2]" : "text-[#7A92A7]"}`}>
                          {active ? "Open workspace" : "Switch into this workspace"}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <button type="button" onClick={() => setWorkspacePickerOpen(false)} className="absolute inset-0 -z-10 w-full" aria-label="Close workspace picker" />
          </div>
        ) : null}

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 mx-auto max-w-[460px] bg-black/52">
            <div className="h-full w-[84%] max-w-[320px] rounded-r-[32px] bg-[linear-gradient(180deg,#101B2A_0%,#0A1524_100%)] px-4 pt-[calc(env(safe-area-inset-top,0px)+18px)] pb-8 shadow-[24px_0_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between">
              <div>
                <p className="text-[28px] font-semibold tracking-[-0.05em] text-white">PrepSight</p>
                  <p className="mt-1 text-[13px] text-[#9DB0C4]">Messaging, library, logistics, and updates</p>
              </div>
                <button type="button" onClick={() => setDrawerOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/6 text-white">
                  <ArrowLeft size={20} />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                <DrawerCard title="Chat" description="Group threads, direct messages, and TOM now sit in the same conversation list." />
                <DrawerCard title="Library" description="Collections, bookmarks, review, calendar, and catalogue stay inside one app shell." />
                <DrawerCard title="Logistics" description="Members, approvals, staffing, access, and equipment continue growing in one operational tab." />
              </div>

              <div className="mt-8 space-y-2 text-[#A6B8C9]">
                <button type="button" onClick={() => { openTab("chat"); setDrawerOpen(false) }} className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left hover:bg-white/6">
                  <Clock3 size={18} />
                  <span>Recent threads</span>
                </button>
                <button type="button" onClick={() => { openTab("library"); setDrawerOpen(false) }} className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left hover:bg-white/6">
                  <UserRound size={18} />
                  <span>Library workspace</span>
                </button>
                <button type="button" onClick={() => { openTab("chat"); closeThread(); setDrawerOpen(false) }} className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left hover:bg-white/6">
                  <Sparkles size={18} />
                  <span>TOM in chat</span>
                </button>
              </div>
            </div>
            <button type="button" onClick={() => setDrawerOpen(false)} className="absolute inset-0 -z-10 w-full" aria-label="Close drawer" />
          </div>
        ) : null}
      </MobileFrame>

      {renderDesktopShell()}
      {renderNewChatComposer()}
      {renderThreadManager()}
    </>
  )
}

