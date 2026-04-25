import type {
  CollectionSummary,
  LogisticsSummary,
  TabKey,
  UpdateSummary,
} from "@/v4/types"
import type { LucideIcon } from "lucide-react"
import { Bell, BriefcaseMedical, LibraryBig } from "lucide-react"

export const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
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
