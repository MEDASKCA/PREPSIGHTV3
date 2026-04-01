"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Activity,
  Baby,
  BedSingle,
  Bone,
  Brain,
  Building2,
  Cross,
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
import { SETTING_SPECIALTIES } from "@/lib/settings"
import type { ClinicalSetting } from "@/lib/types"

const MOBILE_DOCK_KEY = "prepsight_mobile_dock"
const DEFAULT_DOCK_ITEM_IDS = [
  "tool-new-card",
  "tool-catalogue",
  "tool-surgeons",
  "tool-directory",
]

const WORKSPACE_COLOUR: Record<ClinicalSetting, string> = {
  "Operating Theatre": "#4DA3FF",
  "Endoscopy Suite": "#14B8A6",
  "Interventional Radiology / Cath Lab": "#7C5CFC",
  "Emergency Department": "#F97316",
  "Intensive Care Unit": "#2563EB",
  Ward: "#10B981",
  "Outpatient / Clinic": "#6366F1",
  "Maternity & Obstetrics": "#EC4899",
}

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

const WORKFLOW_TOOLS = [
  { id: "tool-new-card", label: "New card", href: "/procedures/new", icon: Plus, tileColor: "#4DA3FF" },
  { id: "tool-catalogue", label: "Catalogue", href: "/catalogue", icon: Package, tileColor: "#14B8A6" },
  { id: "tool-surgeons", label: "Surgeons", href: "/", icon: UserRound, tileColor: "#6366F1" },
  { id: "tool-directory", label: "Directory", href: "/", icon: Building2, tileColor: "#7C5CFC" },
  { id: "tool-implants", label: "Implants", href: "/", icon: LayoutGrid, tileColor: "#10B981" },
  { id: "tool-product-id", label: "Product ID", href: "/", icon: FolderSearch2, tileColor: "#F97316" },
  { id: "tool-stockroom", label: "Stockroom", href: "/", icon: ShoppingCart, tileColor: "#8B5CF6" },
  { id: "tool-data-review", label: "Data Review", href: "/review", icon: Wrench, tileColor: "#F59E0B" },
] as const

function tileStyle(color: string) {
  return {
    background: `linear-gradient(180deg, ${color} 0%, ${color}F0 42%, ${color}D2 100%)`,
    boxShadow: `0 10px 18px ${color}24, inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -12px 18px rgba(15,23,42,0.14)`,
  }
}

function shouldHideDock(pathname: string, searchParams: URLSearchParams) {
  if (pathname.startsWith("/procedures/")) return true
  if (pathname === "/login" || pathname === "/onboarding" || pathname.startsWith("/admin")) return true
  if (pathname === "/" && !searchParams.get("setting")) return true
  return false
}

export default function PersistentMobileDock() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [dockItemIds, setDockItemIds] = useState<string[]>(DEFAULT_DOCK_ITEM_IDS)

  useEffect(() => {
    const saved = window.localStorage.getItem(MOBILE_DOCK_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) {
        setDockItemIds(parsed.filter((value): value is string => typeof value === "string").slice(0, 4))
      }
    } catch {
      // Ignore invalid dock state.
    }
  }, [])

  if (shouldHideDock(pathname, new URLSearchParams(searchParams.toString()))) {
    return null
  }

  const specialtyItems = (Object.entries(SETTING_SPECIALTIES) as Array<[ClinicalSetting, string[]]>)
    .flatMap(([setting, specialties]) =>
      specialties.map((specialty, index) => ({
        id: `${setting}-${specialty}`,
        label: SPECIALTY_SHORT_LABELS[specialty] ?? specialty,
        href: `/?setting=${encodeURIComponent(setting)}&specialty=${encodeURIComponent(specialty)}`,
        icon: SPECIALTY_ICON_MAP[specialty] ?? Stethoscope,
        tileColor: WORKSPACE_COLOUR[setting] ?? ["#3B82F6", "#14B8A6", "#7C5CFC", "#F97316"][index % 4],
      })),
    )

  const itemLookup = Object.fromEntries([...specialtyItems, ...WORKFLOW_TOOLS].map((item) => [item.id, item]))
  const dockItems = dockItemIds
    .map((id) => itemLookup[id])
    .filter((item): item is (typeof specialtyItems)[number] | (typeof WORKFLOW_TOOLS)[number] => Boolean(item))

  if (dockItems.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-1 lg:hidden">
      <div className="rounded-[28px] bg-white/74 px-2.5 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${Math.max(dockItems.length, 1)}, minmax(0, 1fr))` }}
        >
          {dockItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => router.push(item.href)}
                className="group flex w-full flex-col items-center px-1 py-1 text-center"
              >
                <div
                  className="relative mb-1 flex h-14 w-14 items-center justify-center rounded-[20px] transition-transform duration-200 ease-out"
                  style={tileStyle(item.tileColor)}
                >
                  <div className="pointer-events-none absolute inset-x-1.5 top-1.5 h-5 rounded-[14px] bg-[linear-gradient(180deg,rgba(255,255,255,0.48)_0%,rgba(255,255,255,0.18)_48%,rgba(255,255,255,0)_100%)]" />
                  <Icon size={24} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                </div>
                <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#10243E]">
                  {item.label}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
