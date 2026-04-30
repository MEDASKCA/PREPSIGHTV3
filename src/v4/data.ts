import type {
  LogisticsSummary,
  TabKey,
  UpdateSummary,
} from "@/v4/types"
import type { LucideIcon } from "lucide-react"
import { LibraryBig, MessageCircle } from "lucide-react"
import ResourcesIcon from "@/components/icons/ResourcesIcon"
import InsightsIcon from "@/components/icons/InsightsIcon"

type TabIcon = LucideIcon | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

export const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: TabIcon }> = [
  { key: "comms",    label: "Comms",     icon: MessageCircle   },
  { key: "library",  label: "Library",   icon: LibraryBig      },
  { key: "logistics",label: "Resources", icon: ResourcesIcon   },
  { key: "updates",  label: "Updates",   icon: InsightsIcon    },
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
