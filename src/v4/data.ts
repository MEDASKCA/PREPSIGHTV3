import type {
  TabKey,
  UpdateSummary,
} from "@/v4/types"
import type { LucideIcon } from "lucide-react"
import { LibraryBig, MessageCircle } from "lucide-react"
import ResourcesIcon from "@/components/icons/ResourcesIcon"
import InsightsIcon from "@/components/icons/InsightsIcon"

type TabIcon = LucideIcon | React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>

export const TAB_ITEMS: Array<{ key: TabKey; label: string; icon: TabIcon; href?: string }> = [
  { key: "comms",     label: "Comms",     icon: MessageCircle, href: "/comms" },
  { key: "library",   label: "Library",   icon: LibraryBig,    href: "/library" },
  { key: "resources", label: "Resources", icon: ResourcesIcon, href: "/resources" },
  { key: "updates",   label: "Updates",   icon: InsightsIcon,  href: "/insights" },
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
