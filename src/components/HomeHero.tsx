"use client"

import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent, type UIEvent } from "react"
import { createPortal } from "react-dom"
import Fuse from "fuse.js"
import {
  Activity,
  Baby,
  BedSingle,
  Bone,
  Brain,
  Building2,
  CalendarDays,
  ChevronRight,
  Cross,
  Database,
  Eye,
  FolderSearch2,
  HeartPulse,
  LayoutGrid,
  Pill,
  Plus,
  Package,
  Search,
  Scissors,
  ShoppingCart,
  Stethoscope,
  UserRound,
  Waves,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import AssistantCompactCard from "@/components/AssistantCompactCard"
import AssistantCompareMatches from "@/components/AssistantCompareMatches"
import AssistantLauncherBlock from "@/components/AssistantLauncherBlock"
import AssistantResponseState from "@/components/AssistantResponseState"
import AssistantResponseText from "@/components/AssistantResponseText"
import AssistantWalkthroughBlock from "@/components/AssistantWalkthroughBlock"
import ProfileButton from "@/components/ProfileButton"
import {
  buildAssistantContext,
  buildAssistantDecisionTrace,
  buildAssistantPendingState,
  buildAssistantReply,
} from "@/lib/assistant"
import type { AssistantCarryContext, AssistantReply } from "@/lib/assistant-contracts"
import { getActionPrompt, getTableRowPrompt } from "@/lib/assistant-chat"
import { emitAssistantDebugEvent } from "@/lib/assistant-observability"
import { getCatalogueItems } from "@/lib/catalogue"
import { procedures } from "@/lib/data"
import { isAdminSession } from "@/lib/admin"
import { getHistory } from "@/lib/history"
import { getProfile, getRelevantSettings } from "@/lib/profile"
import { getAllProcedureVariants, getProcedureVariantById, getSystemById, getVariantsByProcedure, hasVariantsForProcedure } from "@/lib/variants"
import {
  ClinicalSetting,
  PrepSightProfile,
  Procedure,
  USER_ROLE_LABEL,
} from "@/lib/types"
import { SETTING_SPECIALTIES } from "@/lib/settings"
import { SPECIALTY_SVG_ICON, StomachIcon } from "@/components/SpecialtyIcons"
import { getProcedureLibrarySnapshot, subscribeProcedureLibrary } from "@/lib/procedure-library"

const WORKSPACE_META: Record<
  ClinicalSetting,
  { icon: typeof Stethoscope; tile: string; solid: string }
> = {
  "Operating Theatre": { icon: Stethoscope, tile: "bg-[#4DA3FF]", solid: "#4DA3FF" },
  "Endoscopy Suite": { icon: Waves, tile: "bg-[#14B8A6]", solid: "#14B8A6" },
  "Interventional Radiology / Cath Lab": { icon: Activity, tile: "bg-[#7C5CFC]", solid: "#7C5CFC" },
  "Emergency Department": { icon: HeartPulse, tile: "bg-[#F97316]", solid: "#F97316" },
  "Intensive Care Unit": { icon: BedSingle, tile: "bg-[#2563EB]", solid: "#2563EB" },
  Ward: { icon: Building2, tile: "bg-[#10B981]", solid: "#10B981" },
  "Outpatient / Clinic": { icon: Pill, tile: "bg-[#6366F1]", solid: "#6366F1" },
  "Maternity & Obstetrics": { icon: HeartPulse, tile: "bg-[#EC4899]", solid: "#EC4899" },
}

const SPECIALTY_TILE_COLOURS = [
  "#3B82F6",
  "#14B8A6",
  "#7C5CFC",
  "#F97316",
  "#2563EB",
  "#10B981",
  "#EC4899",
  "#F59E0B",
  "#06B6D4",
  "#8B5CF6",
  "#22C55E",
  "#EF4444",
  "#0EA5E9",
  "#A855F7",
  "#84CC16",
  "#F43F5E",
  "#6366F1",
  "#EAB308",
  "#14B8A6",
  "#FB7185",
]

const WORKFLOW_TOOLS = [
  {
    label: "New card",
    description: "Create a procedure Kardex",
    href: "/procedures/new",
    icon: Plus,
    tileColor: "#4DA3FF",
    available: true,
  },
  {
    label: "Calendar",
    description: "Plan and track upcoming cases",
    href: "/calendar",
    icon: CalendarDays,
    tileColor: "#7C5CFC",
    available: true,
  },
  {
    label: "Catalogue",
    description: "Products, trays and equipment",
    href: "/catalogue",
    icon: Package,
    tileColor: "#14B8A6",
    available: true,
  },
  {
    label: "Stockroom",
    description: "Check and update stock levels",
    href: "/catalogue/stockroom",
    icon: ShoppingCart,
    tileColor: "#8B5CF6",
    available: true,
  },
  {
    label: "Surgeons",
    description: "Preferences and setups",
    href: "",
    icon: UserRound,
    tileColor: "#6366F1",
    available: false,
  },
  {
    label: "Scan",
    description: "Identify any item by barcode",
    href: "/catalogue/products",
    icon: FolderSearch2,
    tileColor: "#F97316",
    available: true,
  },
  {
    label: "Directory",
    description: "Units, locations and contacts",
    href: "/directory",
    icon: Building2,
    tileColor: "#0EA5E9",
    available: true,
  },
  {
    label: "Suppliers",
    description: "Contacts and product lines",
    href: "/suppliers",
    icon: Database,
    tileColor: "#06B6D4",
    available: true,
  },
  {
    label: "Implants",
    description: "Browse implant systems",
    href: "/catalogue/implants",
    icon: LayoutGrid,
    tileColor: "#10B981",
    available: true,
  },
  {
    label: "Data Review",
    description: "Review and publish card content",
    href: "/review",
    icon: Wrench,
    tileColor: "#F59E0B",
    available: true,
  },
] as const

const WORKFLOW_IMAGE_MAP: Record<string, string> = {
  "New card": "/icons/workflow/new-card.png",
  "Calendar": "",
  Catalogue: "/icons/workflow/catalogue.png",
  Suppliers: "/icons/workflow/suppliers.svg",
  Surgeons: "/icons/workflow/surgeons.png",
  Directory: "/icons/workflow/directory.png",
  Implants: "/icons/workflow/implants.png",
  "Scan": "/icons/workflow/product-id.png",
  Stockroom: "/icons/workflow/stockroom.png",
  "Data Review": "/icons/workflow/tray-audit.png",
}

const LIBRARY_NAV_ITEMS = [
  { id: "browse", label: "Browse", href: "/?library=1" },
  { id: "build", label: "Build", href: "/procedures/new" },
  { id: "review", label: "Review", href: "/review" },
] as const

const NOTIFICATIONS = [
  { type: "updated" as const, text: "THR Posterior Approach — card reviewed March 2026", time: "2h ago" },
  { type: "attention" as const, text: "TKR Medial Oxford — review requested", time: "1d ago" },
  { type: "new" as const, text: "DHS Fixation card added to Trauma & Orthopaedics", time: "3d ago" },
]

const TICKER_SLIDES = [
  {
    tag: "Huddle",
    title: "Morning Huddle",
    text: "08:00 · Conference Room 1 · All theatre leads",
    image: "/announcements/huddle.png",
    color: "#4DA3FF",
  },
  {
    tag: "Notice",
    title: "Theatre 3 — Deep clean",
    text: "Scheduled deep clean in progress. Return expected 14:00",
    image: "/announcements/notice.png",
    color: "#F97316",
  },
  {
    tag: "Updated",
    title: "THR Posterior Approach",
    text: "Card reviewed and updated — March 2026 · PrepSight editorial",
    image: "/announcements/update.png",
    color: "#10B981",
  },
  {
    tag: "Reminder",
    title: "Surgeon Preference Cards",
    text: "Check preference cards before first case of the day",
    image: "/announcements/reminder.png",
    color: "#7C5CFC",
  },
] as const

const SPECIALTY_SHORT_LABELS: Record<string, string> = {
  "Trauma and Orthopaedics": "Ortho",
  "General Surgery": "GenSurg",
  Urology: "Urology",
  Obstetrics: "Obs",
  Gynecology: "Gynae",
  "Otolaryngology (Ear, Nose and Throat)": "ENT",
  "Oral and Maxillofacial": "OMFS",
  "Dental and Oral": "Dental",
  "Plastic and Reconstructive": "Plastics",
  Neurosurgery: "Neuro",
  Cardiothoracic: "Cardiac",
  Vascular: "Vascular",
  Paediatric: "Paeds",
  Ophthalmology: "Eyes",
  Podiatric: "Podiatry",
  Anaesthesia: "Anaes",
  "Upper GI": "Upper GI",
  "Lower GI": "Lower GI",
  Hepatobiliary: "HPB",
  Respiratory: "Resp",
  "Interventional Radiology": "IR",
  Cardiology: "Cards",
  Neuroradiology: "Neuro IR",
  Resuscitation: "Resus",
  Trauma: "Trauma",
  Procedural: "Procedural",
  "General ICU": "Gen ICU",
  "Cardiac ICU": "Card ICU",
  "Neuro ICU": "Neuro ICU",
  "General Ward": "Gen Ward",
  "Surgical Ward": "Surg Ward",
  "Medical Ward": "Med Ward",
  Outpatients: "OPD",
  "Minor Procedures": "Minor",
  "Specialist Clinic": "Clinic",
  "Labour Ward": "Labour",
  "Obstetric Theatre": "Obs Thtr",
  Postnatal: "Postnatal",
}

const SPECIALTY_IMAGE_MAP: Record<string, string> = {
  // Operating Theatre
  "Trauma and Orthopaedics":               "/icons/specialties/trauma-and-orthopaedics.png",
  "General Surgery":                        "/icons/specialties/general-surgery.png",
  "Urology":                                "/icons/specialties/urology.png",
  "Obstetrics":                             "/icons/specialties/obstetrics.png",
  "Gynecology":                             "/icons/specialties/gynecology.png",
  "Otolaryngology (Ear, Nose and Throat)":  "/icons/specialties/otolaryngology.png",
  "Oral and Maxillofacial":                 "/icons/specialties/oral-and-maxillofacial.png",
  "Dental and Oral":                        "/icons/specialties/dental-and-oral.png",
  "Plastic and Reconstructive":             "/icons/specialties/plastic-and-reconstructive.png",
  "Neurosurgery":                           "/icons/specialties/neurosurgery.png",
  "Cardiothoracic":                         "/icons/specialties/cardiothoracic.png",
  "Vascular":                               "/icons/specialties/vascular.png",
  "Paediatric":                             "/icons/specialties/paediatric.png",
  "Ophthalmology":                          "/icons/specialties/ophthalmology.png",
  "Podiatric":                              "/icons/specialties/podiatric.png",
  "Anaesthesia":                            "/icons/specialties/anaesthesia.png",
  // Endoscopy Suite
  "Upper GI":                               "/icons/specialties/upper-gi.png",
  "Lower GI":                               "/icons/specialties/lower-gi.png",
  "Hepatobiliary":                          "/icons/specialties/hepatobiliary.png",
  "Respiratory":                            "/icons/specialties/respiratory.png",
  // IR / Cath Lab
  "Interventional Radiology":               "/icons/specialties/interventional-radiology.png",
  "Cardiology":                             "/icons/specialties/cardiology.png",
  "Neuroradiology":                         "/icons/specialties/neuroradiology.png",
  // Emergency Department
  "Resuscitation":                          "/icons/specialties/resuscitation.png",
  "Trauma":                                 "/icons/specialties/trauma.png",
  "Procedural":                             "/icons/specialties/procedural.png",
  // ICU
  "General ICU":                            "/icons/specialties/general-icu.png",
  "Cardiac ICU":                            "/icons/specialties/cardiac-icu.png",
  "Neuro ICU":                              "/icons/specialties/neuro-icu.png",
  // Ward
  "General Ward":                           "/icons/specialties/general-ward.png",
  "Surgical Ward":                          "/icons/specialties/surgical-ward.png",
  "Medical Ward":                           "/icons/specialties/medical-ward.png",
  // Outpatient
  "Outpatients":                            "/icons/specialties/outpatients.png",
  "Minor Procedures":                       "/icons/specialties/minor-procedures.png",
  "Specialist Clinic":                      "/icons/specialties/specialist-clinic.png",
  // Maternity
  "Labour Ward":                            "/icons/specialties/labour-ward.png",
  "Obstetric Theatre":                      "/icons/specialties/obstetric-theatre.png",
  "Postnatal":                              "/icons/specialties/postnatal.png",
}

const SPECIALTY_ICON_MAP: Record<string, typeof Stethoscope> = {
  "Trauma and Orthopaedics": Bone,
  "General Surgery": Scissors,
  Urology: Pill,
  Obstetrics: Baby,
  Gynecology: Cross,
  "Otolaryngology (Ear, Nose and Throat)": Stethoscope,
  "Oral and Maxillofacial": Scissors,
  "Dental and Oral": Scissors,
  "Plastic and Reconstructive": Scissors,
  Neurosurgery: Brain,
  Cardiothoracic: HeartPulse,
  Vascular: Activity,
  Paediatric: Baby,
  Ophthalmology: Eye,
  Podiatric: Bone,
  Anaesthesia: Waves,
  "Upper GI": Pill,
  "Lower GI": Pill,
  Hepatobiliary: Pill,
  Respiratory: Waves,
  "Interventional Radiology": Activity,
  Cardiology: HeartPulse,
  Neuroradiology: Brain,
  Resuscitation: HeartPulse,
  Trauma: Cross,
  Procedural: Stethoscope,
  "General ICU": BedSingle,
  "Cardiac ICU": HeartPulse,
  "Neuro ICU": Brain,
  "General Ward": Building2,
  "Surgical Ward": Scissors,
  "Medical Ward": Pill,
  Outpatients: UserRound,
  "Minor Procedures": Scissors,
  "Specialist Clinic": UserRound,
  "Labour Ward": Baby,
  "Obstetric Theatre": Baby,
  Postnatal: Baby,
}

const MOBILE_SPECIALTY_SVG_ICON: Record<string, typeof StomachIcon> = {
  "General Surgery": StomachIcon,
}

const WORKSPACE_HERO_META: Record<
  ClinicalSetting,
  { surface: string; accent: string; glow: string; blip: string }
> = {
  "Operating Theatre": {
    surface: "from-[#0C3B68] via-[#135A9D] to-[#4DA3FF]",
    accent: "bg-[#7DD3FC]",
    glow: "bg-[#7DD3FC]/35",
    blip: "bg-[#BAE6FD]",
  },
  "Endoscopy Suite": {
    surface: "from-[#0A4D45] via-[#0F766E] to-[#14B8A6]",
    accent: "bg-[#5EEAD4]",
    glow: "bg-[#5EEAD4]/35",
    blip: "bg-[#99F6E4]",
  },
  "Interventional Radiology / Cath Lab": {
    surface: "from-[#392A7A] via-[#5B43C6] to-[#7C5CFC]",
    accent: "bg-[#C4B5FD]",
    glow: "bg-[#C4B5FD]/35",
    blip: "bg-[#DDD6FE]",
  },
  "Emergency Department": {
    surface: "from-[#7C2D12] via-[#C2410C] to-[#F97316]",
    accent: "bg-[#FDBA74]",
    glow: "bg-[#FDBA74]/35",
    blip: "bg-[#FED7AA]",
  },
  "Intensive Care Unit": {
    surface: "from-[#123B7A] via-[#1D4ED8] to-[#60A5FA]",
    accent: "bg-[#93C5FD]",
    glow: "bg-[#93C5FD]/35",
    blip: "bg-[#BFDBFE]",
  },
  Ward: {
    surface: "from-[#065F46] via-[#0F9F6E] to-[#34D399]",
    accent: "bg-[#86EFAC]",
    glow: "bg-[#86EFAC]/35",
    blip: "bg-[#BBF7D0]",
  },
  "Outpatient / Clinic": {
    surface: "from-[#3730A3] via-[#4F46E5] to-[#818CF8]",
    accent: "bg-[#C7D2FE]",
    glow: "bg-[#C7D2FE]/35",
    blip: "bg-[#E0E7FF]",
  },
  "Maternity & Obstetrics": {
    surface: "from-[#9D174D] via-[#DB2777] to-[#F472B6]",
    accent: "bg-[#F9A8D4]",
    glow: "bg-[#F9A8D4]/35",
    blip: "bg-[#FBCFE8]",
  },
}

const MOBILE_DOCK_KEY = "prepsight_mobile_dock"
const HOMEPAGE_IMAGES_KEY = "prepsight_homepage_images"
const PROFILE_STORAGE_KEY = "prepsight_profile"
const HISTORY_STORAGE_KEY = "prepsight_history"
const DEFAULT_DOCK_ITEM_IDS: string[] = []
const EMPTY_HISTORY: ReturnType<typeof getHistory> = []
const DRAGGABLE_ITEM_STYLE: CSSProperties = {
  WebkitTouchCallout: "none",
  touchAction: "pan-x",
}
const emptySubscribe = () => () => undefined

let cachedProfileRaw: string | null | undefined
let cachedProfileSnapshot: PrepSightProfile | null = null
let cachedHistoryRaw: string | null | undefined
let cachedHistorySnapshot: ReturnType<typeof getHistory> = EMPTY_HISTORY

function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alpha}` : hex
}

function mobileIconShellStyle(color: string): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${withAlpha(color, "FF")} 0%, ${withAlpha(color, "F0")} 42%, ${withAlpha(color, "D2")} 100%)`,
    boxShadow: `0 10px 18px ${withAlpha(color, "24")}, inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -12px 18px rgba(15,23,42,0.14)`,
  }
}

function mobileIconGlossStyle(color: string): CSSProperties {
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0) 100%)`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22)`,
  }
}

function mobileSpecialtyIconSize(label: string): number {
  if (label === "Trauma and Orthopaedics") return 26
  return 24
}

function mobileSpecialtyImageClassName(label: string): string {
  if (label === "Trauma and Orthopaedics") return "h-10 w-10 scale-[1.12] object-contain"
  if (label === "General Surgery") return "h-10 w-10 scale-[1.1] object-contain"
  if (label === "Urology") return "h-10 w-10 scale-[1.08] object-contain"
  if (label === "Obstetrics") return "h-9 w-9 scale-105 object-contain"
  return "h-10 w-10 scale-[1.1] object-contain"
}

function mobileWorkflowImageClassName(label: string): string {
  if (label === "New card") return "h-9 w-9 scale-105 object-contain"
  return "h-10 w-10 scale-[1.08] object-contain"
}

function getMobileSpecialtyImageSrc(src?: string): string | undefined {
  if (!src) return undefined
  return src.replace(/(\.[a-z0-9]+)$/i, "-1$1")
}

function getSpecialtyColor(specialty: string): string {
  let hash = 0
  for (const ch of specialty) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  return SPECIALTY_TILE_COLOURS[hash % SPECIALTY_TILE_COLOURS.length] ?? "#0EA5E9"
}

const GREETINGS_MORNING = [
  "Good morning",
  "Morning — ready for the day?",
  "Morning. Let's make it a good one.",
  "Good morning. All set?",
  "Morning. Another day, another save.",
  "Rise and shine.",
  "Good morning. The day is yours.",
  "Morning — let's get you prepped.",
  "Good morning. Start strong.",
  "Morning. The theatre awaits.",
  "Good morning. Ready when you are.",
  "Morning — what's on the list today?",
  "Good morning. Let's do this.",
  "Morning. Fresh start, full focus.",
  "Good morning. How's the day looking?",
  "Morning — something great is ahead.",
  "Good morning. Hit the ground running.",
  "Morning. Let's make every minute count.",
  "Good morning. Prepared is halfway there.",
  "Morning — coffee first, then we go.",
  "Good morning. Big day?",
  "Morning. Whatever's on today, you've got it.",
  "Good morning. Ready to prep?",
  "Morning. Let's make today count.",
  "Good morning. Steady hands, clear mind.",
  "Morning. Let's get ahead of the day.",
  "Good morning. The best preparation starts now.",
  "Morning — time to get sharp.",
  "Good morning. One step at a time.",
  "Morning. Here to help you prepare.",
  "Good morning. Let's make it smooth.",
  "Morning — everything under control?",
  "Good morning. Focus. Prepare. Deliver.",
  "Morning. Let's build today right.",
  "Good morning. What do you need?",
  "Morning. Great things start with great preparation.",
  "Good morning. You've got this.",
  "Morning — no surprises today.",
  "Good morning. Ready to look things up?",
  "Morning. Let's check everything twice.",
  "Good morning. Calm, prepared, confident.",
  "Morning. Let's walk through today together.",
  "Good morning. The detail matters.",
  "Morning — off to a strong start.",
  "Good morning. What are we prepping for?",
  "Morning. Precision starts here.",
  "Good morning. Clear the fog, find the facts.",
  "Morning. Let's keep the team informed.",
  "Good morning. A well-prepped team is a great team.",
  "Morning. Shall we get started?",
]

const GREETINGS_AFTERNOON = [
  "Good afternoon",
  "Afternoon — keeping pace?",
  "Good afternoon. Still going strong?",
  "Afternoon. How's the day treating you?",
  "Good afternoon. Made it past the morning rush.",
  "Afternoon — the hardest part's behind you.",
  "Good afternoon. What do you need?",
  "Afternoon. Let's keep the momentum.",
  "Good afternoon. Plenty of day left.",
  "Afternoon — need anything looked up?",
  "Good afternoon. Still sharp?",
  "Afternoon. Ready for the next one.",
  "Good afternoon. Looking something up?",
  "Afternoon. Let's stay ahead.",
  "Good afternoon. The afternoon belongs to the prepared.",
  "Afternoon — checking in.",
  "Good afternoon. How can I help?",
  "Afternoon. One case at a time.",
  "Good afternoon. Let's make the rest count.",
  "Afternoon — you're doing great.",
  "Good afternoon. Stay focused.",
  "Afternoon. What's next?",
  "Good afternoon. Let's run through it.",
  "Afternoon — any questions?",
  "Good afternoon. Ready when you are.",
  "Afternoon. Need a hand?",
  "Good afternoon. Details matter now more than ever.",
  "Afternoon — let's get you sorted.",
  "Good afternoon. Clear and confident.",
  "Afternoon. The day's moving — let's move with it.",
  "Good afternoon. Back for more?",
  "Afternoon — steady as she goes.",
  "Good afternoon. What are we looking at?",
  "Afternoon. Everything on track?",
  "Good afternoon. Here if you need me.",
  "Afternoon — let's stay sharp together.",
  "Good afternoon. Need to double-check something?",
  "Afternoon. All good?",
  "Good afternoon. Right, let's go.",
  "Afternoon — you've made it this far.",
  "Good afternoon. Prepped and ready?",
  "Afternoon. Let's close the day well.",
  "Good afternoon. What's coming up next?",
  "Afternoon — let's make it smooth.",
  "Good afternoon. What can I help with?",
  "Afternoon. Focused and prepared.",
  "Good afternoon. Still a lot of day left.",
  "Afternoon — onward.",
  "Good afternoon. Let's get it right.",
  "Afternoon. Ready for the next case?",
]

const GREETINGS_EVENING = [
  "Good evening",
  "Evening — winding down?",
  "Good evening. Long day?",
  "Evening. Still at it?",
  "Good evening. What's left on the list?",
  "Evening — almost there.",
  "Good evening. Let's finish strong.",
  "Evening. Need anything before you wrap up?",
  "Good evening. You've earned this moment.",
  "Evening — end of shift check-in?",
  "Good evening. Everything tied up?",
  "Evening. Let's close out well.",
  "Good evening. How did today go?",
  "Evening — the day's nearly done.",
  "Good evening. One last look?",
  "Evening. Need to prep for tomorrow?",
  "Good evening. Thinking ahead?",
  "Evening — planning for the morning?",
  "Good evening. Tomorrow starts tonight.",
  "Evening. Let's make sure nothing's missed.",
  "Good evening. How was the day?",
  "Evening — checking in before you head off?",
  "Good evening. Any last things to sort?",
  "Evening. Let's review what's needed.",
  "Good evening. Calm evening ahead?",
  "Evening — take a breath, then let's go.",
  "Good evening. Looking something up?",
  "Evening. The prepared are never truly off.",
  "Good evening. Ready for tomorrow?",
  "Evening — what can I help with?",
  "Good evening. Let's get ahead of the week.",
  "Evening. Tying up loose ends?",
  "Good evening. Last thing to check?",
  "Evening — nearly done for the day.",
  "Good evening. Great work today.",
  "Evening. Rest well after this.",
  "Good evening. Need a card before you go?",
  "Evening — one more look?",
  "Good evening. Let's make tomorrow easier.",
  "Evening. Detail now means calm later.",
  "Good evening. Prepping for the next shift?",
  "Evening — still thinking about the day?",
  "Good evening. Let's wrap this up right.",
  "Evening. What's on your mind?",
  "Good evening. Here to help.",
  "Evening — night shift prep?",
  "Good evening. The diligent never truly clock off.",
  "Evening. Let's get you sorted.",
  "Good evening. Almost time to rest.",
  "Evening — what do you need?",
]

function getGreeting(): string {
  const now = new Date()
  const h = now.getHours()
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  )
  const pool =
    h < 12 ? GREETINGS_MORNING : h < 17 ? GREETINGS_AFTERNOON : GREETINGS_EVENING
  return pool[dayOfYear % pool.length] ?? pool[0]
}

function getProfileBrowserSnapshot(): PrepSightProfile | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
  if (raw === cachedProfileRaw) return cachedProfileSnapshot

  cachedProfileRaw = raw
  cachedProfileSnapshot = getProfile()
  return cachedProfileSnapshot
}

function getHistoryBrowserSnapshot(): ReturnType<typeof getHistory> {
  if (typeof window === "undefined") return EMPTY_HISTORY
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)
  if (raw === cachedHistoryRaw) return cachedHistorySnapshot

  cachedHistoryRaw = raw
  cachedHistorySnapshot = getHistory()
  return cachedHistorySnapshot
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "").toLowerCase().trim()
}

function getSearchableProcedureAliases(procedure: Procedure): string[] {
  const aliases = (procedure as { aliases?: unknown }).aliases
  if (Array.isArray(aliases)) {
    return aliases
      .filter((alias): alias is string => typeof alias === "string")
      .map(normalizeSearchText)
      .filter(Boolean)
  }

  if (typeof aliases === "string") {
    const alias = normalizeSearchText(aliases)
    return alias ? [alias] : []
  }

  return []
}

function getSearchableProcedureDescription(procedure: Procedure): string {
  const descriptionValue = "description" in procedure ? (procedure as { description?: unknown }).description : ""
  return typeof descriptionValue === "string"
    ? normalizeSearchText(descriptionValue)
    : normalizeSearchText(String(descriptionValue ?? ""))
}

const procedureLookup = new Map(procedures.map((procedure) => [procedure.id, procedure]))
const allProcedureVariants = getAllProcedureVariants()
const catalogueItems = getCatalogueItems()

type SearchResultItem = {
  id: string
  href: string
  title: string
  subtitle: string
  badge: {
    label: string
    className: string
  }
  searchValue: string
  searchAliases: string[]
  rankGroup: number
}

interface ChatMessage {
  id: string
  role: "assistant" | "user"
  reply: AssistantReply
  pendingLabel?: string
  pendingDetail?: string
}

function extractProcedureIdFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const match = href.match(/\/procedures\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

function deriveCarryContext(messages: ChatMessage[]): AssistantCarryContext | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || message.role !== "assistant") continue

    const compactCardHref = message.reply.compactCard?.href
    const compactProcedureId = extractProcedureIdFromHref(compactCardHref)
    if (compactProcedureId || message.reply.compactCard?.title) {
      return {
        procedureId: compactProcedureId,
        procedureName: message.reply.compactCard?.title,
      }
    }

    const firstMatch = message.reply.matchedProcedures?.[0]
    if (firstMatch) {
      return {
        procedureId: firstMatch.id,
        procedureName: firstMatch.name,
        specialty: firstMatch.specialty,
      }
    }

    if (message.reply.launcher?.title === "Specialties") {
      return {
        browseLabel: "Specialties",
      }
    }

    if (message.reply.entityDefinition) {
      return {
        entityLabel: message.reply.entityDefinition.label,
        entityKind: message.reply.entityDefinition.kind,
        entityDescription: message.reply.entityDefinition.description,
      }
    }
  }

  return undefined
}

const searchableAppEntries: SearchResultItem[] = [
  ...procedures.map((procedure) => ({
    id: `procedure-${procedure.id}`,
    href: getProcedureSearchHref(procedure),
    title: procedure.name,
    subtitle: procedure.specialty,
    badge: getProcedureSearchBadge(procedure),
    searchValue: [
      procedure.name,
      procedure.specialty,
      procedure.setting,
      getSearchableProcedureDescription(procedure),
      ...getSearchableProcedureAliases(procedure),
    ]
      .filter(Boolean)
      .join(" "),
    searchAliases: getSearchableProcedureAliases(procedure),
    rankGroup: 0,
  })),
  ...allProcedureVariants.map((variant) => {
    const procedure = procedureLookup.get(variant.procedure_id)
    return {
      id: `variant-${variant.id}`,
      href: procedure ? getProcedureSearchHref(procedure) : "/",
      title: variant.name,
      subtitle: procedure ? `${procedure.name} · ${procedure.specialty}` : "Procedure variant",
      badge: {
        label: "Variant",
        className: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
      },
      searchValue: [
        variant.name,
        variant.description,
        variant.approach,
        procedure?.name,
        procedure?.specialty,
      ]
        .filter(Boolean)
        .join(" "),
      searchAliases: [variant.approach, variant.description].filter((value): value is string => Boolean(value)),
      rankGroup: 1,
    }
  }),
  ...catalogueItems.map((item) => ({
    id: `catalogue-${item.id}`,
    href: "/catalogue",
    title: item.name,
    subtitle: item.supplier?.name ?? item.product ?? item.manufacturer ?? "Catalogue item",
    badge: item.category === "implant_system"
      ? {
          label: "System",
          className: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
        }
      : {
          label: "Catalogue",
          className: "border-[#D5E3EF] bg-[#F8FBFF] text-[#64748B]",
        },
    searchValue: [
      item.name,
      item.sku,
      item.product,
      item.description,
      item.manufacturer,
      item.supplier?.name,
      ...(item.aliases ?? []),
    ]
      .filter(Boolean)
      .join(" "),
    searchAliases: item.aliases ?? [],
    rankGroup: item.category === "implant_system" ? 2 : 3,
  })),
]

const appSearchIndex = new Fuse(searchableAppEntries, {
  includeScore: true,
  threshold: 0.31,
  ignoreLocation: true,
  minMatchCharLength: 1,
  keys: [
    { name: "title", weight: 0.52 },
    { name: "searchAliases", weight: 0.23 },
    { name: "subtitle", weight: 0.15 },
    { name: "searchValue", weight: 0.1 },
  ],
})

function searchApp(rawQuery: string, appSearchIndex: Fuse<SearchResultItem>): SearchResultItem[] {
  const query = normalizeSearchText(rawQuery)
  if (query.length < 1) return []
  const queryTokens = query.split(/\s+/).filter(Boolean)

  return appSearchIndex
    .search(query, { limit: 8 })
    .sort((a, b) => {
      const aTitle = normalizeSearchText(a.item.title)
      const bTitle = normalizeSearchText(b.item.title)
      const aStartsFull = aTitle.startsWith(query) ? 1 : 0
      const bStartsFull = bTitle.startsWith(query) ? 1 : 0
      if (aStartsFull !== bStartsFull) return bStartsFull - aStartsFull

      const aMatchesAllTokens = queryTokens.every((token) => aTitle.includes(token)) ? 1 : 0
      const bMatchesAllTokens = queryTokens.every((token) => bTitle.includes(token)) ? 1 : 0
      if (aMatchesAllTokens !== bMatchesAllTokens) return bMatchesAllTokens - aMatchesAllTokens

      const rankGroupDelta = a.item.rankGroup - b.item.rankGroup
      if (rankGroupDelta !== 0) return rankGroupDelta

      const scoreDelta = (a.score ?? 1) - (b.score ?? 1)
      if (Math.abs(scoreDelta) > 0.015) return scoreDelta

      return a.item.title.localeCompare(b.item.title)
    })
    .map((entry) => entry.item)
}

function getProcedureSearchHref(procedure: Procedure): string {
  const params = new URLSearchParams({
    setting: procedure.setting,
    specialty: procedure.specialty,
  })

  const serviceLineId = "service_line_id" in procedure && typeof procedure.service_line_id === "string"
    ? procedure.service_line_id
    : null
  const anatomyId = "anatomy_id" in procedure && typeof procedure.anatomy_id === "string"
    ? procedure.anatomy_id
    : null

  if (serviceLineId) params.set("service_line", serviceLineId)
  if (anatomyId) params.set("anatomy", anatomyId)

  if (hasVariantsForProcedure(procedure.id) || anatomyId || serviceLineId) {
    return `/?${params.toString()}`
  }

  return `/procedures/${procedure.id}`
}

function getProcedureSearchBadge(procedure: Procedure): {
  label: string
  className: string
} {
  const variantCount = getVariantsByProcedure(procedure.id).length
  if (variantCount > 0) {
    return {
      label: variantCount === 1 ? "1 variant" : `${variantCount} variants`,
      className: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
    }
  }

  return {
    label: "Direct card",
    className: "border-[#D5E3EF] bg-[#F8FBFF] text-[#64748B]",
  }
}

function getContextBadge(profile: PrepSightProfile): string {
  const parts: string[] = [USER_ROLE_LABEL[profile.role] ?? profile.role]
  if (profile.departments[0]) parts.push(profile.departments[0])
  if (profile.specialtiesOfInterest[0]) parts.push(profile.specialtiesOfInterest[0])
  return parts.join(" · ")
}

function formatRecentSubtitle(procedureName: string, variantName?: string | null): string {
  return variantName ? `${procedureName} ${variantName}` : procedureName
}

function AssistantBubble({
  message,
  onAction,
  onPrompt,
  onFollow,
}: {
  message: ChatMessage
  onAction: (href: string) => void
  onPrompt: (value: string) => void
  onFollow?: () => void
}) {
  const isAssistant = message.role === "assistant"
  const [contentReady, setContentReady] = useState(!isAssistant || !message.reply.text?.trim())

  useEffect(() => {
    setContentReady(!isAssistant || !message.reply.text?.trim())
  }, [isAssistant, message.id, message.pendingLabel, message.reply.text])

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      {isAssistant && message.pendingLabel ? (
        <div className="max-w-[88%] px-1 py-2">
          <AssistantResponseState label={message.pendingLabel} detail={message.pendingDetail} className="text-[#5A7184]" />
        </div>
      ) : (
        <div
          className={`max-w-[88%] overflow-hidden rounded-[24px] border px-4 py-3 shadow-sm ${
            isAssistant
              ? "rounded-bl-md border-[#D7E6F4] bg-white text-[#1E293B]"
              : "rounded-br-md border-[#00B4D8] bg-[#00B4D8] text-white shadow-[0_12px_26px_rgba(0,180,216,0.24)]"
          }`}
        >
          <AssistantResponseText
            text={message.reply.text}
            animate={isAssistant}
            className="text-[14px] leading-6"
            onProgress={onFollow}
            onComplete={() => setContentReady(true)}
          />
        

        {contentReady && message.reply.stats && message.reply.stats.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {message.reply.stats.map((stat) => (
              <div
                key={`${message.id}-${stat.label}`}
                className="rounded-2xl border border-[#D7E6F4] bg-[#F8FBFF] px-3 py-2"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#94A3B8]">
                  {stat.label}
                </p>
                <p className="mt-1 text-base font-semibold text-[#0F172A]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {contentReady && message.reply.table && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#D7E6F4] bg-[#F8FBFF]">
            {message.reply.table.title && (
              <div className="border-b border-[#D7E6F4] bg-white px-3 py-2">
                <p className="text-xs font-semibold text-[#0F172A]">
                  {message.reply.table.title}
                </p>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-white text-[#64748B]">
                  <tr>
                    {message.reply.table.columns.map((column) => (
                      <th key={`${message.id}-${column}`} className="px-3 py-2 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.reply.table.rows.map((row, rowIndex) => (
                    <tr key={`${message.id}-row-${rowIndex}`} className="border-t border-[#E2E8F0]">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`${message.id}-${rowIndex}-${cellIndex}`}
                          className="px-3 py-2 align-top text-[#0F172A]"
                        >
                          {cellIndex === 0 && message.reply.table?.rowHrefs?.[rowIndex] ? (
                            <button
                              type="button"
                              onClick={() => onPrompt(getTableRowPrompt(row))}
                              className="text-left font-medium text-[#0F172A] underline decoration-[#93C5FD] underline-offset-2 hover:text-[#0369A1]"
                            >
                              {cell}
                            </button>
                          ) : cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {contentReady && message.reply.compactCard && (
          <AssistantCompactCard
            title={message.reply.compactCard.title}
            meta={message.reply.compactCard.meta}
            summary={message.reply.compactCard.summary}
            checklist={message.reply.compactCard.checklist}
            href={message.reply.compactCard.href}
            onPrompt={onPrompt}
          />
        )}

        {contentReady && message.reply.matchedProcedures && message.reply.matchedProcedures.length > 0 && (
          <AssistantCompareMatches
            items={message.reply.matchedProcedures}
            onPrompt={onPrompt}
          />
        )}

        {contentReady && message.reply.launcher && message.reply.launcher.items.length > 0 && (
          <AssistantLauncherBlock
            title={message.reply.launcher.title}
            items={message.reply.launcher.items}
            onPrompt={onPrompt}
          />
        )}

        {contentReady && message.reply.walkthroughs && message.reply.walkthroughs.items.length > 0 && (
          <AssistantWalkthroughBlock
            title={message.reply.walkthroughs.title}
            items={message.reply.walkthroughs.items}
          />
        )}

        {contentReady && message.reply.actions && message.reply.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.reply.actions.map((action) => (
              <button
                key={`${message.id}-${action.label}-${action.href}`}
                type="button"
                onClick={() => onPrompt(getActionPrompt(action, message.reply))}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  action.tone === "primary"
                    ? "border border-[#8ADFF0] bg-[#AEEAF7] text-[#10243E] hover:bg-[#9BE4F4]"
                    : "border border-[#8ADFF0] bg-[#AEEAF7] text-[#24506A] hover:bg-[#9BE4F4]"
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {contentReady && message.reply.chips && message.reply.chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.reply.chips.map((chip) => (
              <button
                key={`${message.id}-${chip}`}
                type="button"
                onClick={() => onPrompt(chip)}
                className="rounded-full border border-[#8ADFF0] bg-[#AEEAF7] px-3 py-2 text-[11px] font-medium text-[#24506A] hover:bg-[#9BE4F4]"
              >
                {chip}
              </button>
            ))}
          </div>
        )}
        </div>
      )}
    </div>
  )
}

export default function HomeHero({
  initialWorkspace,
}: {
  initialWorkspace?: ClinicalSetting
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [showHomepageImages, setShowHomepageImages] = useState(false)
  const hasHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const profile = useSyncExternalStore(
    emptySubscribe,
    getProfileBrowserSnapshot,
    () => null,
  )
  const procedureLibrary = useSyncExternalStore(
    subscribeProcedureLibrary,
    getProcedureLibrarySnapshot,
    getProcedureLibrarySnapshot,
  )
  const recentEntries = useSyncExternalStore(
    emptySubscribe,
    getHistoryBrowserSnapshot,
    () => EMPTY_HISTORY,
  )
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [focused, setFocused] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const relevantSettings = useMemo<ClinicalSetting[]>(
    () => (profile ? getRelevantSettings(profile) : []),
    [profile],
  )
  const [activeWorkspace, setActiveWorkspace] = useState<ClinicalSetting>(() =>
    initialWorkspace ?? "Operating Theatre",
  )
  const [launcherPage, setLauncherPage] = useState(0)
  const [dockItemIds, setDockItemIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_DOCK_ITEM_IDS
    const saved = window.localStorage.getItem(MOBILE_DOCK_KEY)
    if (!saved) return DEFAULT_DOCK_ITEM_IDS
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is string => typeof value === "string").slice(0, 4)
      }
    } catch {
      // Ignore invalid local state and fall back to defaults.
    }
    return DEFAULT_DOCK_ITEM_IDS
  })
  const [dragState, setDragState] = useState<{
    itemId: string
    origin: "launcher" | "dock"
    x: number
    y: number
  } | null>(null)
  const [dragHoverSlot, setDragHoverSlot] = useState<number | null>(null)
  const [launcherHoverTarget, setLauncherHoverTarget] = useState<{
    category: "specialty" | "workflow"
    index: number
  } | null>(null)
  const [specialtyOrderMap, setSpecialtyOrderMap] = useState<Record<string, string[]>>({})
  const [workflowOrder, setWorkflowOrder] = useState<string[]>([])
  const [mobileResultsDrawerStyle, setMobileResultsDrawerStyle] = useState<CSSProperties | null>(null)
  const [tickerIndex, setTickerIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLTextAreaElement>(null)
  const mobileComposerRef = useRef<HTMLDivElement>(null)
  const threadScrollerRef = useRef<HTMLDivElement | null>(null)
  const assistantTimerRef = useRef<number | null>(null)
  const launcherScrollerRef = useRef<HTMLDivElement>(null)
  const layoutNodeMapRef = useRef(new Map<string, HTMLElement>())
  const previousRectMapRef = useRef(new Map<string, DOMRect>())
  const activePointerIdRef = useRef<number | null>(null)
  const dragActiveRef = useRef(false)
  const pressTimerRef = useRef<number | null>(null)
  const suppressTapUntilRef = useRef(0)
  const pressMetaRef = useRef<{
    itemId: string
    origin: "launcher" | "dock"
    onTap: () => void
    startX: number
    startY: number
    pointerId: number
    target: HTMLElement
  } | null>(null)
  const messageSeedRef = useRef(0)
  const greetingText = hasHydrated ? getGreeting() : "Welcome"
  const contextBadge = hasHydrated && profile ? getContextBadge(profile) : "Browse and reference"
  const runtimeProcedureLookup = useMemo(
    () => new Map(procedureLibrary.map((procedure) => [procedure.id, procedure])),
    [procedureLibrary],
  )
  const searchableAppEntries = useMemo<SearchResultItem[]>(() => [
    ...procedureLibrary.map((procedure) => ({
      id: `procedure-${procedure.id}`,
      href: getProcedureSearchHref(procedure),
      title: procedure.name,
      subtitle: procedure.specialty,
      badge: getProcedureSearchBadge(procedure),
      searchValue: [
        procedure.name,
        procedure.specialty,
        procedure.setting,
        getSearchableProcedureDescription(procedure),
        ...getSearchableProcedureAliases(procedure),
      ]
        .filter(Boolean)
        .join(" "),
      searchAliases: getSearchableProcedureAliases(procedure),
      rankGroup: 0,
    })),
    ...allProcedureVariants.map((variant) => {
      const procedure = runtimeProcedureLookup.get(variant.procedure_id)
      return {
        id: `variant-${variant.id}`,
        href: procedure ? getProcedureSearchHref(procedure) : "/",
        title: variant.name,
        subtitle: procedure ? `${procedure.name} · ${procedure.specialty}` : "Procedure variant",
        badge: {
          label: "Variant",
          className: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
        },
        searchValue: [
          variant.name,
          variant.description,
          variant.approach,
          procedure?.name,
          procedure?.specialty,
        ]
          .filter(Boolean)
          .join(" "),
        searchAliases: [variant.approach, variant.description].filter((value): value is string => Boolean(value)),
        rankGroup: 1,
      }
    }),
    ...catalogueItems.map((item) => ({
      id: `catalogue-${item.id}`,
      href: "/catalogue",
      title: item.name,
      subtitle: item.supplier?.name ?? item.product ?? item.manufacturer ?? "Catalogue item",
      badge: item.category === "implant_system"
        ? {
            label: "System",
            className: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
          }
        : {
            label: "Catalogue",
            className: "border-[#D5E3EF] bg-[#F8FBFF] text-[#64748B]",
          },
      searchValue: [
        item.name,
        item.sku,
        item.product,
        item.description,
        item.manufacturer,
        item.supplier?.name,
        ...(item.aliases ?? []),
      ]
        .filter(Boolean)
        .join(" "),
      searchAliases: item.aliases ?? [],
      rankGroup: item.category === "implant_system" ? 2 : 3,
    })),
  ], [procedureLibrary, runtimeProcedureLookup])
  const appSearchIndex = useMemo(
    () =>
      new Fuse(searchableAppEntries, {
        includeScore: true,
        threshold: 0.31,
        ignoreLocation: true,
        minMatchCharLength: 1,
        keys: [
          { name: "title", weight: 0.52 },
          { name: "searchAliases", weight: 0.23 },
          { name: "subtitle", weight: 0.15 },
          { name: "searchValue", weight: 0.1 },
        ],
      }),
    [searchableAppEntries],
  )

  const results = deferredQuery.trim().length > 0
    ? searchApp(deferredQuery, appSearchIndex)
    : []
  const hasAssistantConversation = messages.length > 0
  const assistantContext = useMemo(
    () => buildAssistantContext("/", new URLSearchParams(searchParams.toString())),
    [searchParams],
  )

  const recentCards = recentEntries
    .map((entry) => {
      const procedure = procedureLibrary.find((p) => p.id === entry.procedureId)
      if (!procedure) return null

      const variant = entry.variantId
        ? getProcedureVariantById(entry.variantId)
        : null
      const system = entry.systemId
        ? getSystemById(entry.systemId)
        : null

      return {
        entry,
        procedure,
        variant,
        system,
        href:
          entry.variantId && entry.systemId
            ? `/procedures/${procedure.id}?variant=${encodeURIComponent(entry.variantId)}&system=${encodeURIComponent(entry.systemId)}`
          : `/procedures/${procedure.id}`,
      }
    })
    .filter(
      (
        card,
      ): card is {
        entry: (typeof recentEntries)[number]
        procedure: Procedure
        variant: ReturnType<typeof getProcedureVariantById>
        system: ReturnType<typeof getSystemById>
        href: string
      } => card !== null,
    )

  const showResults = focused && query.trim().length > 0
  const workspaceSettings = useMemo<ClinicalSetting[]>(
    () => (relevantSettings.length > 0 ? relevantSettings : ["Operating Theatre"]),
    [relevantSettings],
  )
  const workspaceSettingsKey = workspaceSettings.join("|")

  useEffect(() => {
    if (workspaceSettings.includes(activeWorkspace)) return
    setActiveWorkspace(initialWorkspace && workspaceSettings.includes(initialWorkspace) ? initialWorkspace : workspaceSettings[0] ?? "Operating Theatre")
  }, [activeWorkspace, initialWorkspace, workspaceSettings, workspaceSettingsKey])

  const workspaceItems = workspaceSettings.map((setting) => ({
    id: `setting-${setting}`,
    label: setting
      .replace("Interventional Radiology / Cath Lab", "IR / Cath")
      .replace("Outpatient / Clinic", "Clinic")
      .replace("Maternity & Obstetrics", "Maternity")
      .replace("Intensive Care Unit", "ICU")
      .replace("Emergency Department", "ED")
      .replace("Operating Theatre", "Theatre")
      .replace("Endoscopy Suite", "Endoscopy"),
    href: `/?setting=${encodeURIComponent(setting)}`,
    icon: WORKSPACE_META[setting].icon,
    tile: WORKSPACE_META[setting].tile,
    solid: WORKSPACE_META[setting].solid,
  }))
  const activeWorkspaceItem = workspaceItems.find((item) => item.id === `setting-${activeWorkspace}`) ?? workspaceItems[0]
  const activeWorkspaceMeta = WORKSPACE_HERO_META[activeWorkspace]
  const hideHomepageImages = !showHomepageImages
  const canSwitchWorkspace = workspaceItems.length > 1
  const preferredSpecialties = new Set(profile?.specialtiesOfInterest ?? [])
  const workspaceSpecialties = [...(SETTING_SPECIALTIES[activeWorkspace] ?? [])].sort((left, right) => {
    const leftPreferred = preferredSpecialties.has(left) ? 1 : 0
    const rightPreferred = preferredSpecialties.has(right) ? 1 : 0
    if (leftPreferred !== rightPreferred) return rightPreferred - leftPreferred
    return left.localeCompare(right)
  })
  const specialtyItems = workspaceSpecialties.map((specialty) => ({
    id: `${activeWorkspace}-${specialty}`,
    shortLabel: SPECIALTY_SHORT_LABELS[specialty] ?? specialty,
    fullLabel: specialty,
    href: `/?setting=${encodeURIComponent(activeWorkspace)}&specialty=${encodeURIComponent(specialty)}`,
    tileColor:
      SPECIALTY_TILE_COLOURS[
        workspaceSpecialties.indexOf(specialty) % SPECIALTY_TILE_COLOURS.length
      ] ?? "#3B82F6",
    icon: SPECIALTY_ICON_MAP[specialty] ?? Stethoscope,
    svgIcon: MOBILE_SPECIALTY_SVG_ICON[specialty] ?? SPECIALTY_SVG_ICON[specialty],
    imageSrc: getMobileSpecialtyImageSrc(SPECIALTY_IMAGE_MAP[specialty]),
    available: true,
    category: "specialty" as const,
  }))
  const workflowLauncherItems = WORKFLOW_TOOLS.map((tool) => ({
    id: `tool-${tool.label.toLowerCase().replace(/\s+/g, "-")}`,
    label: tool.label,
    href: tool.href,
    tileColor: tool.tileColor,
    icon: tool.icon,
    imageSrc: WORKFLOW_IMAGE_MAP[tool.label],
    available: tool.available,
    category: "workflow" as const,
  }))
  const iconPreloadSources = [
    ...specialtyItems.slice(0, 8).map((item) => item.imageSrc).filter((src): src is string => Boolean(src)),
    ...workflowLauncherItems.slice(0, 4).map((item) => item.imageSrc).filter((src): src is string => Boolean(src)),
  ]
  const iconPreloadKey = iconPreloadSources.join("|")
  const orderedSpecialtyIds = specialtyOrderMap[activeWorkspace] ?? specialtyItems.map((item) => item.id)
  const orderedSpecialtyItems = [
    ...orderedSpecialtyIds
      .map((id) => specialtyItems.find((item) => item.id === id))
      .filter((item): item is (typeof specialtyItems)[number] => Boolean(item)),
    ...specialtyItems.filter((item) => !orderedSpecialtyIds.includes(item.id)),
  ]
  const orderedWorkflowIds = workflowOrder.length > 0 ? workflowOrder : workflowLauncherItems.map((item) => item.id)
  const orderedWorkflowItems = [
    ...orderedWorkflowIds
      .map((id) => workflowLauncherItems.find((item) => item.id === id))
      .filter((item): item is (typeof workflowLauncherItems)[number] => Boolean(item)),
    ...workflowLauncherItems.filter((item) => !orderedWorkflowIds.includes(item.id)),
  ]
  const hiddenSpecialtyIds = orderedSpecialtyItems
    .filter((item) => dockItemIds.includes(item.id))
    .map((item) => item.id)
  const hiddenWorkflowIds = orderedWorkflowItems
    .filter((item) => dockItemIds.includes(item.id))
    .map((item) => item.id)
  const visibleSpecialtyItems = orderedSpecialtyItems
  const visibleWorkflowLauncherItems = orderedWorkflowItems
  const dockLibrary = [...specialtyItems, ...workflowLauncherItems]
  const dockLookup = Object.fromEntries(dockLibrary.map((item) => [item.id, item]))
  const dragPreviewItem = dragState ? dockLookup[dragState.itemId] : null
  const launcherSpecialtyBaseItems = dragState?.itemId
    ? visibleSpecialtyItems.filter((item) => item.id !== dragState.itemId)
    : visibleSpecialtyItems
  const launcherWorkflowBaseItems = dragState?.itemId
    ? visibleWorkflowLauncherItems.filter((item) => item.id !== dragState.itemId)
    : visibleWorkflowLauncherItems
  const previewDockSlots = (() => {
    const baseDockIds = dragState?.origin === "dock"
      ? dockItemIds.filter((id) => id !== dragState.itemId)
      : dockItemIds

    if (dragState && dragHoverSlot !== null) {
      const next = [...baseDockIds]
      const dragItem = dockLookup[dragState.itemId]
      const targetItemId = next[dragHoverSlot]
      const targetItem = targetItemId ? dockLookup[targetItemId] : null

      if (dragItem && targetItem && dragItem.category !== targetItem.category) {
        return baseDockIds
      }

      const boundedIndex = Math.max(0, Math.min(dragHoverSlot, Math.min(next.length, 3)))

      if (next.length >= 4) {
        next.splice(boundedIndex, 1, null as unknown as string)
        return next as Array<string | null>
      }

      next.splice(boundedIndex, 0, null as unknown as string)
      return next.slice(0, 4) as Array<string | null>
    }
    if (dragState) {
      const dragItem = dockLookup[dragState.itemId]
      const dockCategory = baseDockIds[0] ? dockLookup[baseDockIds[0]]?.category : dragItem?.category
      if (dragItem && dockCategory === dragItem.category && baseDockIds.length < 4) {
        return [...baseDockIds, null]
      }
    }
    return baseDockIds as Array<string | null>
  })()

  function submitSearch(nextValue?: string) {
    const value = (nextValue ?? query).trim()
    if (!value) return
    const carry = deriveCarryContext(messages)

    if (assistantTimerRef.current !== null) {
      window.clearTimeout(assistantTimerRef.current)
    }

    const userId = `user-${++messageSeedRef.current}`
    const assistantId = `assistant-${++messageSeedRef.current}`
    const pending = buildAssistantPendingState(assistantContext, value, carry)

    setMessages((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        reply: { text: value },
      },
      {
        id: assistantId,
        role: "assistant",
        reply: { text: "" },
        pendingLabel: pending.label,
        pendingDetail: pending.detail,
      },
    ])

    assistantTimerRef.current = window.setTimeout(() => {
      const reply = buildAssistantReply(assistantContext, value, carry)
      const trace = buildAssistantDecisionTrace(assistantContext, value, carry)
      const debugSetting =
        typeof (assistantContext as { setting?: unknown }).setting === "string"
          ? (assistantContext as { setting?: string }).setting
          : undefined
      const debugSpecialty =
        typeof (assistantContext as { specialty?: unknown }).specialty === "string"
          ? (assistantContext as { specialty?: string }).specialty
          : undefined
      emitAssistantDebugEvent({
        prompt: value,
        context: {
          pageKind: assistantContext.pageKind,
          setting: debugSetting,
          specialty: debugSpecialty,
        },
        carry,
        trace,
      })
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? { ...message, reply, pendingLabel: undefined }
            : message,
        ),
      )
      assistantTimerRef.current = null
    }, pending.delay)

    setQuery("")
    setFocused(false)
  }

  function handleAssistantAction(href: string) {
    setFocused(false)
    router.push(href)
  }

  function followAssistantThread() {
    const thread = threadScrollerRef.current
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
    const last = thread.lastElementChild as HTMLElement | null
    last?.scrollIntoView({ block: "end" })
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" })
      })
    }
  }
  const dockRenderItems: Array<(typeof dockLibrary)[number] | null> = (
    previewDockSlots.length > 0 ? previewDockSlots : DEFAULT_DOCK_ITEM_IDS
  ).map((id) => (id ? dockLookup[id] ?? null : null))
  const specialtyRenderItems: Array<(typeof visibleSpecialtyItems)[number] | null> = (() => {
    if (!dragState || !launcherHoverTarget || launcherHoverTarget.category !== "specialty") {
      if (dragState && dockLookup[dragState.itemId]?.category === "specialty") {
        return [...launcherSpecialtyBaseItems, null]
      }
      return launcherSpecialtyBaseItems
    }
    const dragItem = dockLookup[dragState.itemId]
    if (!dragItem || dragItem.category !== "specialty") {
      return launcherSpecialtyBaseItems
    }
    const next: Array<(typeof visibleSpecialtyItems)[number] | null> = [...launcherSpecialtyBaseItems]
    const boundedIndex = Math.max(0, Math.min(launcherHoverTarget.index, next.length))
    next.splice(boundedIndex, 0, null)
    return next
  })()
  const workflowRenderItems: Array<(typeof visibleWorkflowLauncherItems)[number] | null> = (() => {
    if (!dragState || !launcherHoverTarget || launcherHoverTarget.category !== "workflow") {
      if (dragState && dockLookup[dragState.itemId]?.category === "workflow") {
        return [...launcherWorkflowBaseItems, null]
      }
      return launcherWorkflowBaseItems
    }
    const dragItem = dockLookup[dragState.itemId]
    if (!dragItem || dragItem.category !== "workflow") {
      return launcherWorkflowBaseItems
    }
    const next: Array<(typeof visibleWorkflowLauncherItems)[number] | null> = [...launcherWorkflowBaseItems]
    const boundedIndex = Math.max(0, Math.min(launcherHoverTarget.index, next.length))
    next.splice(boundedIndex, 0, null)
    return next
  })()

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(MOBILE_DOCK_KEY, JSON.stringify(dockItemIds.slice(0, 4)))
  }, [dockItemIds])

  useEffect(() => {
    if (typeof window === "undefined") return

    const forceHideImages = searchParams.get("hideImages") === "1"
    const forceShowImages = searchParams.get("showImages") === "1"

    if (forceHideImages) {
      setShowHomepageImages(false)
      return
    }

    if (forceShowImages) {
      setShowHomepageImages(true)
      return
    }

    setShowHomepageImages(
      isAdminSession() && window.localStorage.getItem(HOMEPAGE_IMAGES_KEY) === "true",
    )
  }, [searchParams])

  useEffect(() => {
    if (typeof window === "undefined") return

    const imageNodes = iconPreloadSources.map((src) => {
      const image = new window.Image()
      image.decoding = "async"
      image.src = src
      return image
    })

    return () => {
      for (const image of imageNodes) {
        image.src = ""
      }
    }
  }, [iconPreloadKey])

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>()
    layoutNodeMapRef.current.forEach((node, key) => {
      const nextRect = node.getBoundingClientRect()
      const prevRect = previousRectMapRef.current.get(key)
      if (prevRect) {
        const deltaX = prevRect.left - nextRect.left
        const deltaY = prevRect.top - nextRect.top
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          node.animate(
            [
              { transform: `translate(${deltaX}px, ${deltaY}px)` },
              { transform: "translate(0, 0)" },
            ],
            {
              duration: 180,
              easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            },
          )
        }
      }
      nextRects.set(key, nextRect)
    })
    previousRectMapRef.current = nextRects
  }, [specialtyRenderItems, workflowRenderItems, dockRenderItems, dragHoverSlot, launcherHoverTarget])

  useLayoutEffect(() => {
    if (!showResults || typeof window === "undefined") {
      setMobileResultsDrawerStyle(null)
      return
    }

    function updateMobileResultsDrawerPosition() {
      const composerNode = mobileComposerRef.current
      if (!composerNode || window.innerWidth >= 1024) {
        setMobileResultsDrawerStyle(null)
        return
      }

      const rect = composerNode.getBoundingClientRect()
      setMobileResultsDrawerStyle({
        left: rect.left,
        top: rect.bottom - 1,
        width: rect.width,
        maxHeight: Math.min(window.innerHeight - rect.bottom - 18, 340),
      })
    }

    updateMobileResultsDrawerPosition()
    window.addEventListener("resize", updateMobileResultsDrawerPosition)
    window.addEventListener("scroll", updateMobileResultsDrawerPosition, true)

    return () => {
      window.removeEventListener("resize", updateMobileResultsDrawerPosition)
      window.removeEventListener("scroll", updateMobileResultsDrawerPosition, true)
    }
  }, [showResults, results.length, query])

  function bindLayoutNode(key: string) {
    return (node: HTMLElement | null) => {
      if (node) {
        layoutNodeMapRef.current.set(key, node)
      } else {
        layoutNodeMapRef.current.delete(key)
        previousRectMapRef.current.delete(key)
      }
    }
  }

  function handleLauncherScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const nextPage = Math.round(target.scrollLeft / Math.max(target.clientWidth, 1))
    setLauncherPage(nextPage)
  }

  function removeDockItem(itemId: string) {
    setDockItemIds((current) => current.filter((id) => id !== itemId))
  }

  function beginPress(
    event: ReactPointerEvent<HTMLElement>,
    itemId: string,
    origin: "launcher" | "dock",
    onTap: () => void,
  ) {
    if (origin === "dock") {
      event.preventDefault()
    }
    activePointerIdRef.current = event.pointerId
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
    }
    pressMetaRef.current = {
      itemId,
      origin,
      onTap,
      startX: event.clientX,
      startY: event.clientY,
      pointerId: event.pointerId,
      target: event.currentTarget,
    }
    pressTimerRef.current = window.setTimeout(() => {
      const meta = pressMetaRef.current
      if (!meta) return
      try {
        meta.target.setPointerCapture(meta.pointerId)
      } catch {
        // Ignore capture failures on unsupported targets/browsers.
      }
      setDragState({
        itemId: meta.itemId,
        origin: meta.origin,
        x: meta.startX,
        y: meta.startY,
      })
      dragActiveRef.current = true
      if (meta.origin === "dock") {
        const sourceItem = dockLookup[meta.itemId]
        if (sourceItem?.category === "specialty") {
          setLauncherPage(0)
          launcherScrollerRef.current?.scrollTo({ left: 0, behavior: "smooth" })
        } else if (sourceItem?.category === "workflow") {
          setLauncherPage(1)
          launcherScrollerRef.current?.scrollTo({
            left: launcherScrollerRef.current.clientWidth,
            behavior: "smooth",
          })
        }
      }
      suppressTapUntilRef.current = Date.now() + 400
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(12)
      }
      pressTimerRef.current = null
    }, 240)
  }

  function movePress(event: ReactPointerEvent<HTMLElement>) {
    if (dragActiveRef.current) return
    if (!pressTimerRef.current || !pressMetaRef.current) return
    const deltaX = Math.abs(event.clientX - pressMetaRef.current.startX)
    const deltaY = Math.abs(event.clientY - pressMetaRef.current.startY)
    if (deltaX > 18 || deltaY > 18) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
      pressMetaRef.current = null
    }
  }

  function endPress() {
    if (dragActiveRef.current || dragState) {
      return
    }
    if (Date.now() < suppressTapUntilRef.current) {
      if (pressMetaRef.current) {
        try {
          pressMetaRef.current.target.releasePointerCapture(pressMetaRef.current.pointerId)
        } catch {
          // Ignore release failures on unsupported targets/browsers.
        }
      }
      pressMetaRef.current = null
      return
    }
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
      const meta = pressMetaRef.current
      pressMetaRef.current = null
      meta?.onTap()
      return
    }
    if (pressMetaRef.current) {
      try {
        pressMetaRef.current.target.releasePointerCapture(pressMetaRef.current.pointerId)
      } catch {
        // Ignore release failures on unsupported targets/browsers.
      }
    }
    pressMetaRef.current = null
  }

  useEffect(() => {
    function handleGlobalMove(event: PointerEvent) {
      if (dragActiveRef.current) return
      if (!pressTimerRef.current || !pressMetaRef.current) return
      const deltaX = Math.abs(event.clientX - pressMetaRef.current.startX)
      const deltaY = Math.abs(event.clientY - pressMetaRef.current.startY)
      if (deltaX > 18 || deltaY > 18) {
        window.clearTimeout(pressTimerRef.current)
        pressTimerRef.current = null
        pressMetaRef.current = null
      }
    }

    function handleGlobalRelease() {
      if (pressTimerRef.current) {
        if (Date.now() < suppressTapUntilRef.current) {
          pressMetaRef.current = null
          return
        }
        window.clearTimeout(pressTimerRef.current)
        pressTimerRef.current = null
        const meta = pressMetaRef.current
        pressMetaRef.current = null
        meta?.onTap()
      }
    }

    window.addEventListener("pointermove", handleGlobalMove)
    window.addEventListener("pointerup", handleGlobalRelease)
    window.addEventListener("pointercancel", handleGlobalRelease)
    return () => {
      window.removeEventListener("pointermove", handleGlobalMove)
      window.removeEventListener("pointerup", handleGlobalRelease)
      window.removeEventListener("pointercancel", handleGlobalRelease)
    }
  }, [])

  useEffect(() => {
    if (!dragState) return
    const currentDrag = dragState

    function handlePointerMove(event: PointerEvent) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return
      }
      event.preventDefault()
      setDragState((current) =>
        current
          ? {
              ...current,
              x: event.clientX,
              y: event.clientY,
            }
          : current,
      )
      const hoverTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-dock-slot]")
      if (hoverTarget) {
        const slot = Number((hoverTarget as HTMLElement).dataset.dockSlot)
        setDragHoverSlot(Number.isNaN(slot) ? null : slot)
        setLauncherHoverTarget(null)
      } else {
        setDragHoverSlot(null)
        const launcherTarget = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest("[data-launcher-slot]")
        if (launcherTarget) {
          const el = launcherTarget as HTMLElement
          const index = Number(el.dataset.launcherSlot)
          const category = el.dataset.launcherCategory as "specialty" | "workflow" | undefined
          if (!Number.isNaN(index) && category) {
            setLauncherHoverTarget({ category, index })
          } else {
            setLauncherHoverTarget(null)
          }
        } else {
          setLauncherHoverTarget(null)
        }
      }
    }

    function handlePointerUp(event: PointerEvent) {
      if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
        return
      }
      const dropTarget = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-dock-slot]")
      if (dropTarget) {
        const slot = Number((dropTarget as HTMLElement).dataset.dockSlot)
        if (!Number.isNaN(slot)) {
          setDockItemIds((current) => {
            const next = [...current]
            const existingIndex = next.indexOf(currentDrag.itemId)
            const dragItem = dockLookup[currentDrag.itemId]
            const targetItemId = next[slot]
            const targetItem = targetItemId ? dockLookup[targetItemId] : null

            if (dragItem && targetItem && dragItem.category !== targetItem.category) {
              return current
            }

            if (existingIndex !== -1) {
              next.splice(existingIndex, 1)
            }

            const boundedIndex = Math.max(0, Math.min(slot, Math.min(next.length, 3)))

            if (existingIndex === -1 && next.length >= 4) {
              next.splice(boundedIndex, 1, currentDrag.itemId)
              return next
            }

            next.splice(boundedIndex, 0, currentDrag.itemId)
            return next.slice(0, 4)
          })
        }
      } else {
        const launcherTarget = document
          .elementFromPoint(event.clientX, event.clientY)
          ?.closest("[data-launcher-slot]") as HTMLElement | null
        const category = launcherTarget?.dataset.launcherCategory as "specialty" | "workflow" | undefined
        const index = launcherTarget ? Number(launcherTarget.dataset.launcherSlot) : NaN
        const dragItem = dockLookup[currentDrag.itemId]

        if (launcherTarget && category && !Number.isNaN(index) && dragItem?.category === category) {
          if (currentDrag.origin === "dock") {
            removeDockItem(currentDrag.itemId)
          }

          if (category === "specialty") {
            const nextVisible = visibleSpecialtyItems
              .map((item) => item.id)
              .filter((id) => id !== currentDrag.itemId)
            const boundedIndex = Math.max(0, Math.min(index, nextVisible.length))
            nextVisible.splice(boundedIndex, 0, currentDrag.itemId)
            setSpecialtyOrderMap((current) => ({
              ...current,
              [activeWorkspace]: [...nextVisible, ...hiddenSpecialtyIds.filter((id) => id !== currentDrag.itemId)],
            }))
          } else {
            const nextVisible = visibleWorkflowLauncherItems
              .map((item) => item.id)
              .filter((id) => id !== currentDrag.itemId)
            const boundedIndex = Math.max(0, Math.min(index, nextVisible.length))
            nextVisible.splice(boundedIndex, 0, currentDrag.itemId)
            setWorkflowOrder([...nextVisible, ...hiddenWorkflowIds.filter((id) => id !== currentDrag.itemId)])
          }
        } else if (currentDrag.origin === "dock") {
          removeDockItem(currentDrag.itemId)
        }
      }
      setDragState(null)
      setDragHoverSlot(null)
      setLauncherHoverTarget(null)
      dragActiveRef.current = false
      activePointerIdRef.current = null
      if (pressMetaRef.current) {
        try {
          pressMetaRef.current.target.releasePointerCapture(pressMetaRef.current.pointerId)
        } catch {
          // Ignore release failures on unsupported targets/browsers.
        }
      }
      pressMetaRef.current = null
      suppressTapUntilRef.current = Date.now() + 250
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: false })
    window.addEventListener("pointerup", handlePointerUp, { once: true })
    window.addEventListener("pointercancel", handlePointerUp, { once: true })
    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      window.removeEventListener("pointercancel", handlePointerUp)
    }
  })

  useEffect(() => {
    if (typeof document === "undefined") return
    const previousTouchAction = document.body.style.touchAction
    const previousOverflow = document.body.style.overflow
    if (dragState) {
      document.body.style.touchAction = "none"
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.touchAction = previousTouchAction
      document.body.style.overflow = previousOverflow
    }
  }, [dragState])

  useEffect(() => {
    if (!threadScrollerRef.current) return
    threadScrollerRef.current.scrollTop = threadScrollerRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    return () => {
      if (assistantTimerRef.current !== null) {
        window.clearTimeout(assistantTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTickerIndex((i) => (i + 1) % TICKER_SLIDES.length), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="homehero-root relative flex h-[100dvh] max-w-xl flex-col overflow-hidden animate-step-in bg-[radial-gradient(circle_at_top,#dff7fc_0%,transparent_26%),linear-gradient(180deg,#f4fbfd_0%,#edf5f8_48%,#e8f0f4_100%)] px-3 pb-6 pt-3 lg:h-auto lg:max-w-none lg:overflow-visible lg:px-10 lg:py-10">
      <div className="homehero-mobile-backdrop pointer-events-none absolute inset-0 lg:hidden">
        <div className="absolute -left-10 top-8 h-36 w-36 rounded-full bg-[#0EA5E9]/8 blur-3xl" />
        <div className="absolute right-[-24px] top-20 h-32 w-32 rounded-full bg-[#14B8A6]/6 blur-3xl" />
        <div className="absolute bottom-24 left-10 h-28 w-28 rounded-full bg-[#1D4ED8]/6 blur-3xl" />
      </div>
      <div className="mb-10 hidden lg:block">
        <div className="homehero-surface app-card-bg app-card-border relative overflow-hidden rounded-[40px] border shadow-[0_36px_80px_rgba(148,163,184,0.18)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(77,163,255,0.12),_transparent_30%),radial-gradient(circle_at_85%_12%,_rgba(20,184,166,0.1),_transparent_22%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/70" />
          <div className="app-card-border relative z-10 border-b px-8 pb-7 pt-6">
            {/* Row 1: Logo + Chat + ProfileButton */}
            <div className="mb-7 flex items-center justify-between gap-6">
              <div data-dev-trigger className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/ps-mark.png" alt="PrepSight" className="h-8 w-auto lg:h-9" />
                <p className="text-[22px] font-semibold tracking-[-0.05em] text-[#00B4D8] lg:text-[26px]">PrepSight</p>
              </div>
              <nav className="flex flex-1 items-center justify-center gap-6" aria-label="Library navigation">
                {LIBRARY_NAV_ITEMS.map((item) => {
                  const active = item.id === "browse"
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative inline-flex h-11 items-center text-[15px] font-semibold transition-colors ${
                        active ? "text-[#10243E]" : "text-[#5F7487] hover:text-[#10243E]"
                      }`}
                    >
                      {item.label}
                      <span
                        className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full transition-opacity ${
                          active ? "bg-[#00B4D8] opacity-100" : "bg-transparent opacity-0"
                        }`}
                      />
                    </Link>
                  )
                })}
              </nav>
              <div className="flex flex-col items-end gap-2.5">
                <div className="flex items-center gap-2">
                  <ProfileButton modeSwitch={{ label: "Switch to Chat", path: "/" }} />
                </div>
              </div>
            </div>

            {/* Row 2: Hero greeting */}
            <div className="mb-6">
              <p className="app-text-strong text-[52px] font-semibold tracking-[-0.05em] leading-[1.0]">
                {greetingText}
              </p>
              <p className="app-text-muted mt-2 text-[18px] font-medium">{contextBadge}</p>
            </div>

            {/* Row 3: Search bar */}
            <div className="relative w-full">
              <Search size={20} className="app-text-muted absolute left-6 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
                placeholder="Search procedure, anatomy, implant system, product or catalogue item…"
                className="app-card-bg app-card-border app-text-strong w-full rounded-[22px] border py-5 pl-14 pr-6 text-[17px] placeholder:text-[#7290A7] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_10px_24px_rgba(86,167,191,0.08)] transition-colors focus:border-[#C9F1F8] focus:outline-none focus:ring-2 focus:ring-[#7DD3FC]/20"
              />

              {showResults && results.length > 0 && (
                <div className="app-card-bg app-card-border absolute inset-x-0 top-[calc(100%+12px)] z-30 overflow-hidden rounded-[26px] border shadow-[0_30px_70px_rgba(0,180,216,0.14)]">
                  {results.map((result) => (
                    <Link
                      key={result.id}
                      href={result.href}
                      className="app-card-border hover:app-card-bg-soft flex items-center justify-between border-b px-6 py-4 transition-colors last:border-0"
                    >
                      <div className="mr-3 min-w-0">
                        <p className="app-text-strong truncate text-[16px] font-semibold">{result.title}</p>
                        <p className="app-text-muted mt-1 text-[14px]">{result.subtitle}</p>
                      </div>
                      <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full border px-2.5 py-1 text-[12px] font-semibold ${result.badge.className}`}>
                          {result.badge.label}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {showResults && results.length === 0 && (
                <div className="app-card-bg app-card-border app-text-muted absolute inset-x-0 top-[calc(100%+12px)] z-30 rounded-[26px] border px-6 py-4 text-[16px] shadow-[0_30px_70px_rgba(0,180,216,0.14)]">
                  No procedures found.
                </div>
              )}
            </div>

          </div>

          <div className="relative z-10 px-8 pb-8 pt-7">
            {/* ── Announcements ──────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <p className="app-text-muted text-[20px] font-semibold">Announcements</p>
              {canSwitchWorkspace && (
                <div className="shrink-0 flex flex-wrap justify-end gap-2">
                  {workspaceItems.map((item) => {
                    const isActive = activeWorkspace === item.id.replace("setting-", "")
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveWorkspace(item.id.replace("setting-", "") as ClinicalSetting)}
                        className="rounded-full px-4 py-2 text-[15px] font-semibold transition-all hover:-translate-y-0.5"
                        style={{
                          backgroundColor: isActive ? item.solid : `${item.solid}22`,
                          color: isActive ? "#fff" : item.solid,
                        }}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Announcement cards */}
            <div className="relative overflow-hidden rounded-[28px]" style={{ height: 260 }}>
              {TICKER_SLIDES.map((slide, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 flex overflow-hidden rounded-[28px] transition-all duration-500 ${
                    i === tickerIndex ? "opacity-100 translate-y-0 pointer-events-auto" : "pointer-events-none opacity-0 translate-y-3"
                  }`}
                  style={{ background: `linear-gradient(135deg, ${slide.color}EE 0%, ${slide.color}99 100%)` }}
                >
                  {/* Text side */}
                  <div className="flex flex-col justify-between p-9 flex-1 min-w-0">
                    <span className="self-start rounded-full bg-white/20 px-4 py-2 text-[15px] font-bold uppercase tracking-[0.08em] text-white">
                      {slide.tag}
                    </span>
                    <div>
                      <p className="text-white text-[34px] font-semibold tracking-[-0.04em] leading-tight">{slide.title}</p>
                      <p className="mt-2.5 text-white text-[18px] leading-snug">{slide.text}</p>
                    </div>
                  </div>
                  {/* Image placeholder */}
                  <div className="w-[160px] shrink-0 relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-overlay"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent to-transparent" />
                    {/* Placeholder visual when no image */}
                    <div className="flex h-full items-center justify-center opacity-20">
                      <div className="h-20 w-20 rounded-full border-4 border-white" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Dot indicators — bottom right */}
              <div className="absolute bottom-4 right-5 flex gap-1.5 z-10">
                {TICKER_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTickerIndex(i)}
                    className={`h-1.5 rounded-full bg-white transition-all ${i === tickerIndex ? "w-5 opacity-100" : "w-1.5 opacity-40"}`}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8 grid grid-cols-[1.25fr_0.75fr] gap-6">
              <div>
                <div className="mb-5">
                  <p className="app-text-muted text-[20px] font-semibold">Specialties</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {orderedSpecialtyItems.map((specialty, index) => (
                    <Link
                      key={specialty.id}
                      href={specialty.href}
                      className="relative min-h-[270px] overflow-hidden rounded-[30px] text-white transition-transform hover:-translate-y-1 [animation:desktopCardRise_0.55s_cubic-bezier(0.2,0.8,0.2,1)_both]"
                      style={{
                        animationDelay: `${index * 45}ms`,
                        background: `linear-gradient(145deg, ${specialty.tileColor} 0%, ${specialty.tileColor}DD 100%)`,
                        boxShadow: `0 30px 50px ${specialty.tileColor}3D`,
                      }}
                    >
                      {!hideHomepageImages && SPECIALTY_IMAGE_MAP[specialty.fullLabel] && !failedImages.has(specialty.fullLabel) ? (
                        <>
                          {/* Image centered, bleeds to edges */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={SPECIALTY_IMAGE_MAP[specialty.fullLabel]!}
                            alt=""
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] object-contain opacity-75"
                            style={{ width: 270, height: 270, mixBlendMode: "multiply" }}
                            onError={() => setFailedImages((prev) => new Set(prev).add(specialty.fullLabel))}
                          />
                          {/* Gradient scrim at bottom so text stays readable */}
                          <div
                            className="absolute inset-x-0 bottom-0 h-20 rounded-b-[30px]"
                            style={{ background: `linear-gradient(to top, ${specialty.tileColor}EE 0%, transparent 100%)` }}
                          />
                          {/* Text pinned bottom */}
                          <p className="absolute inset-x-0 bottom-0 px-5 pb-5 text-center font-semibold leading-tight tracking-[-0.03em]" style={{ fontSize: 32 }}>
                            {specialty.fullLabel}
                          </p>
                        </>
                      ) : hideHomepageImages ? (
                        <div className="flex h-full min-h-[270px] items-center justify-center px-8 py-8">
                          <p className="text-center text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-white">
                            {specialty.fullLabel}
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full min-h-[270px] flex-col items-center justify-center gap-5 px-6 py-6">
                          {(() => {
                            const SvgIcon = SPECIALTY_SVG_ICON[specialty.fullLabel]
                            if (SvgIcon) return <SvgIcon size={80} className="opacity-80" />
                            const LucideIcon = specialty.icon
                            return <LucideIcon size={64} strokeWidth={1.2} className="opacity-70" />
                          })()}
                          <p className="text-center text-[22px] font-semibold leading-tight tracking-[-0.03em]">
                            {specialty.fullLabel}
                          </p>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="grid content-start gap-4">
                <div className="app-card-bg app-card-border rounded-[30px] border p-6 shadow-[0_20px_40px_rgba(148,163,184,0.16)]">
                  <p className="app-text-muted text-[20px] font-semibold">Quick access</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {WORKFLOW_TOOLS.map((tool, index) => {
                      const Icon = tool.icon
                      const imageSrc = WORKFLOW_IMAGE_MAP[tool.label]
                      return (
                        <Link
                          key={tool.label}
                          href={tool.available && tool.href ? tool.href : "#"}
                          className={`group flex items-center gap-4 rounded-[20px] border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md [animation:desktopCardRise_0.5s_cubic-bezier(0.2,0.8,0.2,1)_both] ${
                            !tool.available
                              ? "pointer-events-none opacity-40 border-[#E2E8F0] bg-[#F8FAFC]"
                              : "app-card-border bg-white hover:bg-[#FAFCFF]"
                          }`}
                          style={{ animationDelay: `${index * 35}ms` }}
                        >
                          <div
                            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] shadow-sm"
                            style={{
                              background: `linear-gradient(145deg, ${tool.tileColor} 0%, ${tool.tileColor}CC 100%)`,
                              boxShadow: `0 8px 20px ${tool.tileColor}45`,
                            }}
                          >
                            {imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imageSrc} alt="" className="h-8 w-8 object-contain drop-shadow-sm" />
                            ) : (
                              <Icon size={28} className="text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="app-text-strong text-[19px] font-semibold leading-tight">{tool.label}</p>
                            {"description" in tool && (
                              <p className="app-text-muted mt-1 text-[15px] leading-snug line-clamp-2">{tool.description}</p>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Notifications */}
                <div className="app-card-bg app-card-border rounded-[30px] border p-6 shadow-[0_20px_40px_rgba(148,163,184,0.16)]">
                  <p className="app-text-muted text-[20px] font-semibold">Notifications</p>
                  <div className="mt-4 grid gap-3">
                    {NOTIFICATIONS.map((notif, i) => (
                      <div key={i} className="app-card-border flex items-start gap-4 rounded-[20px] border p-5">
                        <div
                          className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[18px] font-bold ${
                            notif.type === "updated"
                              ? "bg-[#0EA5E9]/12 text-[#0EA5E9]"
                              : notif.type === "attention"
                                ? "bg-[#F97316]/12 text-[#F97316]"
                                : "bg-[#10B981]/12 text-[#10B981]"
                          }`}
                        >
                          {notif.type === "updated" ? "↑" : notif.type === "attention" ? "!" : "+"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="app-text-strong text-[18px] font-medium leading-snug">{notif.text}</p>
                          <p className="app-text-muted mt-2 text-[15px]">{notif.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {recentCards.length > 0 && (
                  <div className="app-card-bg app-card-border rounded-[30px] border p-6 shadow-[0_20px_40px_rgba(148,163,184,0.16)]">
                    <p className="app-text-muted text-[20px] font-semibold">Recently viewed</p>
                    <div className="mt-4 grid gap-3">
                      {recentCards.map((card, index) => {
                        const SpecIcon = SPECIALTY_ICON_MAP[card.procedure.specialty] ?? Stethoscope
                        const specColor = getSpecialtyColor(card.procedure.specialty)
                        return (
                          <Link
                            key={`${card.entry.procedureId}-${card.entry.variantId ?? "base"}-${card.entry.systemId ?? "base"}`}
                            href={card.href}
                            className="app-card-border hover:app-card-bg-soft flex items-center gap-4 rounded-[22px] border px-5 py-5 transition-colors [animation:desktopCardRise_0.55s_cubic-bezier(0.2,0.8,0.2,1)_both]"
                            style={{ animationDelay: `${index * 45}ms` }}
                          >
                            <div
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]"
                              style={{
                                background: `linear-gradient(145deg, ${specColor} 0%, ${specColor}CC 100%)`,
                                boxShadow: `0 6px 14px ${specColor}35`,
                              }}
                            >
                              <SpecIcon size={26} className="text-white" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="app-text-strong truncate text-[20px] font-semibold tracking-[-0.02em]">
                                {card.system?.name ?? card.procedure.name}
                              </p>
                              <p className="app-text-muted mt-1 truncate text-[15px]">
                                {formatRecentSubtitle(card.procedure.name, card.variant?.name)}
                              </p>
                            </div>
                            <ChevronRight size={18} className="app-text-muted shrink-0" />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-[calc(env(safe-area-inset-top,0px)+6px)] lg:hidden">
        <div className="mb-3 px-1">
          <div className="flex items-start justify-between">
            <div data-dev-trigger className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ps-mark.png" alt="PrepSight" className="h-8 w-auto" />
              <p className="text-[22px] font-semibold tracking-[-0.05em] text-[#00B4D8]">PrepSight</p>
            </div>
            <div>
              <ProfileButton modeSwitch={{ label: "Switch to Chat", path: "/" }} />
            </div>
          </div>

          <nav className="mt-2 flex items-center gap-4" aria-label="Library navigation">
            {LIBRARY_NAV_ITEMS.map((item) => {
              const active = item.id === "browse"
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex h-10 items-center text-[14px] font-semibold transition-colors ${
                    active ? "text-[#10243E]" : "text-[#5F7487] hover:text-[#10243E]"
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute inset-x-0 bottom-0 h-[3px] rounded-full transition-opacity ${
                      active ? "bg-[#00B4D8] opacity-100" : "bg-transparent opacity-0"
                    }`}
                  />
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="mb-3 px-1">
          <p className="text-[22px] font-semibold leading-7 tracking-[-0.04em] text-[#10243E]">
            {`Browse the ${activeWorkspaceItem?.label ?? "Operating Theatre"} workspace`}
          </p>
        </div>

        <div className="mb-3">
          <div className="w-full overflow-hidden rounded-[30px] border border-transparent bg-transparent shadow-none">
            {hasAssistantConversation && (
              <div
                ref={threadScrollerRef}
                className="max-h-[24dvh] min-h-[14dvh] space-y-3 overflow-y-auto px-3 py-3"
              >
                {messages.map((message) => (
                  <AssistantBubble
                    key={message.id}
                    message={message}
                    onAction={handleAssistantAction}
                    onPrompt={submitSearch}
                    onFollow={followAssistantThread}
                  />
                ))}
              </div>
            )}
              <div className={hasAssistantConversation ? "border-t border-[#BFEAF5] py-3" : "py-3"}>
              <div
                ref={mobileComposerRef}
                className="flex w-full items-end gap-2 rounded-[26px] border border-[#8ADFF0] bg-[#AEEAF7] px-3 py-2 shadow-[0_14px_30px_rgba(0,180,216,0.14)]"
              >
                <textarea
                  ref={mobileInputRef}
                  rows={1}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      submitSearch()
                    }
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 150)}
                  placeholder=""
                  className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[20px] border-0 bg-white px-3 py-2.5 text-sm text-[#10243E] shadow-none focus:outline-none"
                />

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submitSearch()}
                  disabled={query.trim().length === 0}
                  aria-label="Search"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00B4D8] text-white shadow-[0_10px_22px_rgba(0,180,216,0.32)] transition-colors hover:bg-[#12C4E7] disabled:bg-[#CBD5E1] disabled:text-white disabled:shadow-none"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-0 min-h-0 flex-1 px-0.5 pt-1">
          <div className="mb-1 px-1">
            <p className="text-[19px] font-semibold tracking-[-0.03em] text-[#10243E]">
              {launcherPage === 0 ? "Specialties" : "Workflow tools"}
            </p>
          </div>
          <div
            ref={launcherScrollerRef}
            onScroll={handleLauncherScroll}
            className="-mx-1 overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex">
              <div className="w-full shrink-0 snap-center px-1">
                <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-2 py-2.5">
                  {specialtyRenderItems.map((specialty, index) => (
                    specialty ? (
                      <button
                        key={specialty.id}
                        ref={bindLayoutNode(`specialty-${specialty.id}`)}
                        type="button"
                        onClick={() => router.push(specialty.href)}
                        onContextMenu={(event) => event.preventDefault()}
                        className={`group flex select-none flex-col items-center text-center ${dragState?.itemId === specialty.id ? "opacity-0" : ""}`}
                        data-launcher-slot={index}
                        data-launcher-category="specialty"
                        title={specialty.fullLabel}
                      >
                        <div
                          className="relative mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ring-1 ring-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                          style={mobileIconShellStyle(specialty.tileColor)}
                        >
                          <div
                            className="pointer-events-none absolute inset-x-1.5 top-1.5 h-5 rounded-[14px]"
                            style={mobileIconGlossStyle(specialty.tileColor)}
                          />
                          {specialty.imageSrc && !failedImages.has(specialty.fullLabel) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={specialty.imageSrc}
                              alt=""
                              loading="eager"
                              fetchPriority="high"
                              decoding="async"
                              className={`${mobileSpecialtyImageClassName(specialty.fullLabel)} drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]`}
                              onError={() => setFailedImages((prev) => new Set(prev).add(specialty.fullLabel))}
                            />
                          ) : specialty.svgIcon ? (
                            <specialty.svgIcon size={mobileSpecialtyIconSize(specialty.fullLabel)} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                          ) : (
                            <specialty.icon size={mobileSpecialtyIconSize(specialty.fullLabel)} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                          )}
                        </div>
                        <p className="line-clamp-1 text-[11px] font-semibold leading-4 text-[#334155]">
                          {specialty.shortLabel}
                        </p>
                      </button>
                    ) : (
                      <div
                        key={`specialty-placeholder-${index}`}
                        ref={bindLayoutNode(`specialty-slot-${index}`)}
                        data-launcher-slot={index}
                        data-launcher-category="specialty"
                        className="flex flex-col items-center text-center"
                      >
                        <div className={`mb-1.5 h-14 w-14 rounded-[20px] border-2 border-dashed shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-all duration-150 ${launcherHoverTarget?.category === "specialty" && launcherHoverTarget.index === index ? "border-[#4DA3FF] bg-[#DCEEFF]/92 scale-105" : "border-[#93C5FD] bg-white/38"}`} />
                        <div className="h-4" />
                      </div>
                    )
                  ))}
                </div>
              </div>
              <div className="w-full shrink-0 snap-center px-1">
                <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-2 py-2.5">
                  {workflowRenderItems.map((tool, index) => {
                    if (!tool) {
                      return (
                        <div
                          key={`workflow-placeholder-${index}`}
                          ref={bindLayoutNode(`workflow-slot-${index}`)}
                          data-launcher-slot={index}
                          data-launcher-category="workflow"
                          className="flex flex-col items-center text-center"
                        >
                          <div className={`mb-1.5 h-14 w-14 rounded-[20px] border-2 border-dashed shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] transition-all duration-150 ${launcherHoverTarget?.category === "workflow" && launcherHoverTarget.index === index ? "border-[#14B8A6] bg-[#D6FCF6]/92 scale-105" : "border-[#5EEAD4] bg-white/38"}`} />
                          <div className="h-4" />
                        </div>
                      )
                    }

                    const Icon = tool.icon
                    const content = (
                      <>
                        <div
                          className="relative mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ring-1 ring-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                          style={mobileIconShellStyle(tool.tileColor)}
                        >
                          <div
                            className="pointer-events-none absolute inset-x-1.5 top-1.5 h-5 rounded-[14px]"
                            style={mobileIconGlossStyle(tool.tileColor)}
                          />
                          {tool.imageSrc && !failedImages.has(tool.id) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={tool.imageSrc}
                              alt=""
                              loading="eager"
                              fetchPriority="high"
                              decoding="async"
                              className={`${mobileWorkflowImageClassName(tool.label)} drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]`}
                              onError={() => setFailedImages((prev) => new Set(prev).add(tool.id))}
                            />
                          ) : (
                            <Icon size={24} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                          )}
                        </div>
                        <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#334155]">
                          {tool.label}
                        </p>
                      </>
                    )

                    return (
                      <button
                        key={`workflow-page-${tool.label}`}
                        ref={bindLayoutNode(`workflow-${tool.id}`)}
                        type="button"
                        onClick={() => {
                          if (tool.available && tool.href) {
                            router.push(tool.href)
                          }
                        }}
                        onContextMenu={(event) => event.preventDefault()}
                        className={`group flex select-none flex-col items-center text-center ${dragState?.itemId === tool.id ? "opacity-0" : ""}`}
                        data-launcher-slot={index}
                        data-launcher-category="workflow"
                      >
                        {content}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 shadow-[0_10px_24px_rgba(148,163,184,0.18)] backdrop-blur-xl">
              {[0, 1].map((index) => (
                <span
                  key={`launcher-dot-${index}`}
                  className={`h-1.5 rounded-full transition-all ${
                    launcherPage === index ? "w-6 bg-[#10243E]" : "w-2 bg-[#CBD5E1]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showResults && mobileResultsDrawerStyle && typeof document !== "undefined" && createPortal(
        results.length > 0 ? (
          <div
            className="pointer-events-auto fixed z-[140] overflow-hidden rounded-b-[24px] rounded-t-[12px] border border-[#D5DCE3] bg-white shadow-[0_24px_44px_rgba(15,23,42,0.18)] lg:hidden"
            style={mobileResultsDrawerStyle}
          >
            {results.slice(0, 6).map((result) => (
              <Link
                key={result.id}
                href={result.href}
                className="flex items-center justify-between border-b border-[#F4F7FA] px-4 py-2.5 transition-colors last:border-0 hover:bg-[#F8FBFF]"
              >
                <div className="mr-3 min-w-0">
                  <p className="truncate text-sm font-semibold text-[#3F4752]">{result.title}</p>
                  <p className="mt-0.5 truncate text-xs text-[#94a3b8]">{result.subtitle}</p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-[#94a3b8]" />
              </Link>
            ))}
          </div>
        ) : (
          <p
            className="pointer-events-auto fixed z-[140] rounded-b-[24px] rounded-t-[12px] border border-[#D5DCE3] bg-white px-4 py-3 text-sm text-[#94a3b8] shadow-[0_24px_44px_rgba(15,23,42,0.18)] lg:hidden"
            style={mobileResultsDrawerStyle}
          >
            No matches found.
          </p>
        ),
        document.body,
      )}

      {dragState && dragPreviewItem && (
        <div
          className="pointer-events-none fixed z-[60] lg:hidden"
          style={{
            left: 0,
            top: 0,
            transform: `translate3d(${dragState.x - 32}px, ${dragState.y - 40}px, 0)`,
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className="relative mb-1 flex h-16 w-16 items-center justify-center rounded-[22px] shadow-[0_22px_40px_rgba(15,23,42,0.32)] ring-2 ring-white/80"
              style={mobileIconShellStyle(dragPreviewItem.tileColor)}
            >
              <div
                className="pointer-events-none absolute inset-x-2 top-2 h-6 rounded-[16px]"
                style={mobileIconGlossStyle(dragPreviewItem.tileColor)}
              />
              {"imageSrc" in dragPreviewItem && "fullLabel" in dragPreviewItem && dragPreviewItem.imageSrc && !failedImages.has(dragPreviewItem.fullLabel) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dragPreviewItem.imageSrc}
                  alt=""
                  className={`${mobileSpecialtyImageClassName(dragPreviewItem.fullLabel)} drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]`}
                  onError={() => setFailedImages((prev) => new Set(prev).add(dragPreviewItem.fullLabel))}
                />
              ) : "imageSrc" in dragPreviewItem && "label" in dragPreviewItem && dragPreviewItem.imageSrc && !failedImages.has(dragPreviewItem.id) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={dragPreviewItem.imageSrc}
                  alt=""
                  className={`${mobileWorkflowImageClassName(dragPreviewItem.label)} drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]`}
                  onError={() => setFailedImages((prev) => new Set(prev).add(dragPreviewItem.id))}
                />
              ) : "svgIcon" in dragPreviewItem && dragPreviewItem.svgIcon ? (
                <dragPreviewItem.svgIcon
                  size={"fullLabel" in dragPreviewItem ? mobileSpecialtyIconSize(dragPreviewItem.fullLabel) : 24}
                  className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]"
                />
              ) : (
                <dragPreviewItem.icon
                  size={"fullLabel" in dragPreviewItem ? mobileSpecialtyIconSize(dragPreviewItem.fullLabel) : 24}
                  className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]"
                />
              )}
            </div>
            <p className="max-w-[64px] text-[10px] font-semibold leading-3 text-[#10243E]">
              {"shortLabel" in dragPreviewItem ? dragPreviewItem.shortLabel : dragPreviewItem.label}
            </p>
          </div>
        </div>
      )}

    </div>
  )
}
