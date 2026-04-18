import type {
  AssistantMessage,
  ChatFilter,
  ChatThread,
  CollectionSummary,
  LogisticsSummary,
  TabKey,
  UpdateSummary,
} from "@/v4/types"
import type { LucideIcon } from "lucide-react"
import { Bell, BriefcaseMedical, LibraryBig, MessageCircle } from "lucide-react"

export const CHAT_STORAGE_KEY = "prepsight_v4_threads"
export const TOM_STORAGE_KEY = "prepsight_v4_tom"

export const SEED_THREADS: ChatThread[] = [
  {
    id: "direct-tom",
    type: "direct",
    title: "TOM",
    subtitle: "PrepSight assistant",
    preview: "Ask about cards, updates, logistics, or what changed.",
    time: "Now",
    unread: 0,
    online: true,
    accent: "#0F7DBA",
    messages: [
      { id: "tom-1", sender: "tom", author: "TOM", body: "Ask me to find a card, summarise changes, or help draft a message for your group.", time: "Now" },
    ],
  },
  {
    id: "group-ortho",
    type: "group",
    title: "Royal London Ortho",
    subtitle: "12 members",
    preview: "Tray update for the revision knee set is pinned.",
    time: "09:42",
    unread: 3,
    accent: "#0EA5E9",
    members: ["Alex", "Sam", "Nina", "Khalid"],
    messages: [
      { id: "m1", sender: "other", author: "Sam", body: "Morning. The revision knee set note is now pinned.", time: "09:12" },
      { id: "m2", sender: "other", author: "Nina", body: "Also moved the bookmark shortlist into My Groups.", time: "09:17" },
      { id: "m3", sender: "self", author: "You", body: "Good. I will check the instrument list before theatre starts.", time: "09:21" },
    ],
  },
  {
    id: "group-endoscopy",
    type: "group",
    title: "Endoscopy North Wing",
    subtitle: "8 members",
    preview: "2 access requests still need approval.",
    time: "08:25",
    unread: 1,
    accent: "#14B8A6",
    members: ["Alex", "Maya", "Joel"],
    messages: [
      { id: "m4", sender: "other", author: "Maya", body: "Two new starters still need access approval.", time: "08:03" },
      { id: "m5", sender: "self", author: "You", body: "I will review them after the list.", time: "08:25" },
    ],
  },
  {
    id: "direct-nina",
    type: "direct",
    title: "Nina Patel",
    subtitle: "Scrub lead",
    preview: "Can you send the updated shoulder setup?",
    time: "Yesterday",
    unread: 0,
    online: true,
    accent: "#4DA3FF",
    messages: [
      { id: "m6", sender: "other", author: "Nina", body: "Can you send the updated shoulder setup?", time: "Yesterday" },
      { id: "m7", sender: "self", author: "You", body: "Yes. I will pull the latest card from Library.", time: "Yesterday" },
    ],
  },
  {
    id: "direct-james",
    type: "direct",
    title: "James Ford",
    subtitle: "Anaesthetics",
    preview: "Thanks. I have it.",
    time: "Thu",
    unread: 0,
    online: false,
    accent: "#7C5CFC",
    messages: [
      { id: "m8", sender: "self", author: "You", body: "Shared the airway checklist in case you need it.", time: "Thu" },
      { id: "m9", sender: "other", author: "James", body: "Thanks. I have it.", time: "Thu" },
    ],
  },
]

export const SEED_TOM: AssistantMessage[] = [
  {
    id: "t1",
    sender: "tom",
    body: "Ask me to find a card, summarise a group thread, or pull together what changed in a workspace.",
    time: "Now",
  },
]

export const CHAT_FILTERS: Array<{ key: ChatFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "groups", label: "Groups" },
  { key: "direct", label: "Direct" },
]

export const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "chat", label: "Chat", icon: MessageCircle },
  { key: "library", label: "Library", icon: LibraryBig },
  { key: "logistics", label: "Resources", icon: BriefcaseMedical },
  { key: "updates", label: "Updates", icon: Bell },
]

export const COLLECTIONS: CollectionSummary[] = [
  {
    key: "community",
    title: "Community",
    subtitle: "Shared collections for this workspace.",
    summary: "Operating Theatre shared procedures are ready to browse.",
    accent: "#6ACDE5",
    items: [
      { title: "PSH-000/Operating Theatre", meta: "1219 procedures · PrepSight library" },
      { title: "PSH-000/Trauma and Orthopaedics", meta: "164 procedures · PrepSight library" },
    ],
  },
  {
    key: "groups",
    title: "My Groups",
    subtitle: "Collections specific to your organisation or access scope.",
    summary: "Royal London Hospital local cards are in progress.",
    accent: "#5CC7C4",
    items: [
      { title: "Royal London Hospital/My Local Cards", meta: "2 procedures · Royal London Hospital library" },
      { title: "Royal London Hospital/The Royal London Hospital Local Cards", meta: "3 procedures · Royal London Hospital library" },
    ],
  },
  {
    key: "bookmarks",
    title: "Bookmarks",
    subtitle: "Your saved procedure shortcuts.",
    summary: "Jump back into revision knee, shoulder setup, and day-case favourites.",
    accent: "#F2C86B",
    items: [
      { title: "Cemented Total Knee Replacement", meta: "Community · Trauma and Orthopaedics" },
      { title: "Shoulder Arthroscopy Setup", meta: "Community · Orthopaedics" },
    ],
  },
  {
    key: "review",
    title: "Review",
    subtitle: "Validation and moderation.",
    summary: "Items waiting for approval and publication decisions.",
    accent: "#8EC5FF",
    items: [
      { title: "4 local changes awaiting review", meta: "2 from My Groups · 2 from Community" },
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
      { title: "Monday trauma list", meta: "08:00 · Operating Theatre" },
      { title: "Revision hip planning", meta: "14:00 · Royal London Ortho" },
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

export const LOGISTICS_SECTIONS: LogisticsSummary[] = [
  {
    key: "members",
    title: "Members",
    detail: "42 active across 6 groups",
    tone: "#D7F2FB",
    rows: [
      { title: "Royal London Ortho", meta: "12 members · 3 online now" },
      { title: "Endoscopy North Wing", meta: "8 members · 2 pending invites" },
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

export const UPDATES: UpdateSummary[] = [
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
