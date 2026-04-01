import {
  Activity,
  Baby,
  BedSingle,
  Bone,
  Brain,
  Building2,
  CalendarDays,
  Cross,
  Database,
  Eye,
  FolderSearch2,
  HeartPulse,
  LayoutGrid,
  Package,
  Pill,
  Plus,
  Scissors,
  ShoppingCart,
  Stethoscope,
  UserRound,
  Waves,
  Wrench,
} from "lucide-react"
import type { ClinicalSetting } from "./types"
import { SETTING_SPECIALTIES } from "./settings"

export interface AssistantLauncherItem {
  id: string
  label: string
  href: string
  color: string
  imageSrc?: string
  iconKey: string
}

const WORKFLOW_TOOLS = [
  { label: "New card", href: "/procedures/new", color: "#4DA3FF", imageSrc: "/icons/workflow/new-card.png", iconKey: "plus" },
  { label: "Calendar", href: "/calendar", color: "#7C5CFC", imageSrc: "", iconKey: "calendar" },
  { label: "Catalogue", href: "/catalogue", color: "#14B8A6", imageSrc: "/icons/workflow/catalogue.png", iconKey: "package" },
  { label: "Stockroom", href: "/catalogue/stockroom", color: "#8B5CF6", imageSrc: "/icons/workflow/stockroom.png", iconKey: "shopping_cart" },
  { label: "Scan", href: "/catalogue/products", color: "#F97316", imageSrc: "/icons/workflow/product-id.png", iconKey: "folder_search" },
  { label: "Directory", href: "/directory", color: "#0EA5E9", imageSrc: "/icons/workflow/directory.png", iconKey: "building" },
  { label: "Suppliers", href: "/suppliers", color: "#06B6D4", imageSrc: "/icons/workflow/suppliers.svg", iconKey: "database" },
  { label: "Implants", href: "/catalogue/implants", color: "#10B981", imageSrc: "/icons/workflow/implants.png", iconKey: "layout_grid" },
  { label: "Data Review", href: "/review", color: "#F59E0B", imageSrc: "/icons/workflow/tray-audit.png", iconKey: "wrench" },
] as const

const SPECIALTY_TILE_COLOURS = [
  "#3B82F6", "#14B8A6", "#7C5CFC", "#F97316", "#2563EB", "#10B981", "#EC4899", "#F59E0B",
  "#06B6D4", "#8B5CF6", "#22C55E", "#EF4444", "#0EA5E9", "#A855F7", "#84CC16", "#F43F5E",
  "#6366F1", "#EAB308", "#14B8A6", "#FB7185",
]

const SPECIALTY_IMAGE_MAP: Record<string, string> = {
  "Trauma and Orthopaedics": "/icons/specialties/trauma-and-orthopaedics.png",
  "General Surgery": "/icons/specialties/general-surgery.png",
  "Urology": "/icons/specialties/urology.png",
  "Obstetrics": "/icons/specialties/obstetrics.png",
  "Gynecology": "/icons/specialties/gynecology.png",
  "Otolaryngology (Ear, Nose and Throat)": "/icons/specialties/otolaryngology.png",
  "Oral and Maxillofacial": "/icons/specialties/oral-and-maxillofacial.png",
  "Dental and Oral": "/icons/specialties/dental-and-oral.png",
  "Plastic and Reconstructive": "/icons/specialties/plastic-and-reconstructive.png",
  "Neurosurgery": "/icons/specialties/neurosurgery.png",
  "Cardiothoracic": "/icons/specialties/cardiothoracic.png",
  "Vascular": "/icons/specialties/vascular.png",
  "Paediatric": "/icons/specialties/paediatric.png",
  "Ophthalmology": "/icons/specialties/ophthalmology.png",
  "Podiatric": "/icons/specialties/podiatric.png",
  "Anaesthesia": "/icons/specialties/anaesthesia.png",
  "Upper GI": "/icons/specialties/upper-gi.png",
  "Lower GI": "/icons/specialties/lower-gi.png",
  "Hepatobiliary": "/icons/specialties/hepatobiliary.png",
  "Respiratory": "/icons/specialties/respiratory.png",
  "Interventional Radiology": "/icons/specialties/interventional-radiology.png",
  "Cardiology": "/icons/specialties/cardiology.png",
  "Neuroradiology": "/icons/specialties/neuroradiology.png",
  "Resuscitation": "/icons/specialties/resuscitation.png",
  "Trauma": "/icons/specialties/trauma.png",
  "Procedural": "/icons/specialties/procedural.png",
  "General ICU": "/icons/specialties/general-icu.png",
  "Cardiac ICU": "/icons/specialties/cardiac-icu.png",
  "Neuro ICU": "/icons/specialties/neuro-icu.png",
  "General Ward": "/icons/specialties/general-ward.png",
  "Surgical Ward": "/icons/specialties/surgical-ward.png",
  "Medical Ward": "/icons/specialties/medical-ward.png",
  "Outpatients": "/icons/specialties/outpatients.png",
  "Minor Procedures": "/icons/specialties/minor-procedures.png",
  "Specialist Clinic": "/icons/specialties/specialist-clinic.png",
  "Labour Ward": "/icons/specialties/labour-ward.png",
  "Obstetric Theatre": "/icons/specialties/obstetric-theatre.png",
  "Postnatal": "/icons/specialties/postnatal.png",
}

export const ASSISTANT_ICON_MAP = {
  plus: Plus,
  calendar: CalendarDays,
  package: Package,
  shopping_cart: ShoppingCart,
  folder_search: FolderSearch2,
  building: Building2,
  database: Database,
  layout_grid: LayoutGrid,
  wrench: Wrench,
  bone: Bone,
  scissors: Scissors,
  pill: Pill,
  baby: Baby,
  cross: Cross,
  stethoscope: Stethoscope,
  brain: Brain,
  heart: HeartPulse,
  activity: Activity,
  eye: Eye,
  waves: Waves,
  bed: BedSingle,
  user: UserRound,
} as const

const SPECIALTY_ICON_KEY_MAP: Record<string, keyof typeof ASSISTANT_ICON_MAP> = {
  "Trauma and Orthopaedics": "bone",
  "General Surgery": "scissors",
  Urology: "pill",
  Obstetrics: "baby",
  Gynecology: "cross",
  "Otolaryngology (Ear, Nose and Throat)": "stethoscope",
  "Oral and Maxillofacial": "scissors",
  "Dental and Oral": "scissors",
  "Plastic and Reconstructive": "scissors",
  Neurosurgery: "brain",
  Cardiothoracic: "heart",
  Vascular: "activity",
  Paediatric: "baby",
  Ophthalmology: "eye",
  Podiatric: "bone",
  Anaesthesia: "waves",
  "Upper GI": "pill",
  "Lower GI": "pill",
  Hepatobiliary: "pill",
  Respiratory: "waves",
  "Interventional Radiology": "activity",
  Cardiology: "heart",
  Neuroradiology: "brain",
  Resuscitation: "heart",
  Trauma: "cross",
  Procedural: "stethoscope",
  "General ICU": "bed",
  "Cardiac ICU": "heart",
  "Neuro ICU": "brain",
  "General Ward": "building",
  "Surgical Ward": "scissors",
  "Medical Ward": "pill",
  Outpatients: "user",
  "Minor Procedures": "scissors",
  "Specialist Clinic": "user",
  "Labour Ward": "baby",
  "Obstetric Theatre": "baby",
  Postnatal: "baby",
}

export function getWorkflowLauncherItems(): AssistantLauncherItem[] {
  return WORKFLOW_TOOLS.map((item) => ({
    id: `workflow-${item.label.toLowerCase().replace(/\s+/g, "-")}`,
    label: item.label,
    href: item.href,
    color: item.color,
    imageSrc: item.imageSrc,
    iconKey: item.iconKey,
  }))
}

export function getSpecialtyLauncherItems(setting: ClinicalSetting | undefined): AssistantLauncherItem[] {
  if (!setting) return []
  return (SETTING_SPECIALTIES[setting] ?? []).map((label, index) => ({
    id: `specialty-${label.toLowerCase().replace(/[^\w]+/g, "-")}`,
    label,
    href: `/?setting=${encodeURIComponent(setting)}&specialty=${encodeURIComponent(label)}`,
    color: SPECIALTY_TILE_COLOURS[index % SPECIALTY_TILE_COLOURS.length] ?? "#3B82F6",
    imageSrc: SPECIALTY_IMAGE_MAP[label],
    iconKey: SPECIALTY_ICON_KEY_MAP[label] ?? "stethoscope",
  }))
}
