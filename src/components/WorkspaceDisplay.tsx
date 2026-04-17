import Link from "next/link"
import {
  Activity,
  Baby,
  BedSingle,
  Building2,
  HeartPulse,
  Pill,
  Stethoscope,
  Waves,
  type LucideIcon,
} from "lucide-react"
import { CLINICAL_SETTINGS, SETTING_SPECIALTIES } from "@/lib/settings"
import type { ClinicalSetting } from "@/lib/types"

const WORKSPACE_META: Record<
  ClinicalSetting,
  { icon: LucideIcon; badge: string; card: string; text: string; ring: string }
> = {
  "Operating Theatre": {
    icon: Stethoscope,
    badge: "#DDF4FF",
    card: "linear-gradient(145deg, #F4FBFF 0%, #E8F5FF 100%)",
    text: "#19507A",
    ring: "#B9D8FF",
  },
  "Endoscopy Suite": {
    icon: Waves,
    badge: "#DFFAF4",
    card: "linear-gradient(145deg, #F4FFFC 0%, #E7FBF6 100%)",
    text: "#115E59",
    ring: "#99F6E4",
  },
  "Interventional Radiology / Cath Lab": {
    icon: Activity,
    badge: "#EEE9FF",
    card: "linear-gradient(145deg, #F8F6FF 0%, #F0EBFF 100%)",
    text: "#4C1D95",
    ring: "#C4B5FD",
  },
  "Emergency Department": {
    icon: HeartPulse,
    badge: "#FFF0E7",
    card: "linear-gradient(145deg, #FFF8F4 0%, #FFF0E6 100%)",
    text: "#9A3412",
    ring: "#FDBA74",
  },
  "Intensive Care Unit": {
    icon: BedSingle,
    badge: "#EAF2FF",
    card: "linear-gradient(145deg, #F5F9FF 0%, #EBF2FF 100%)",
    text: "#1D4ED8",
    ring: "#93C5FD",
  },
  Ward: {
    icon: Building2,
    badge: "#EAFBF2",
    card: "linear-gradient(145deg, #F7FFF9 0%, #ECFBF1 100%)",
    text: "#166534",
    ring: "#86EFAC",
  },
  "Outpatient / Clinic": {
    icon: Pill,
    badge: "#EEF2FF",
    card: "linear-gradient(145deg, #F8FAFF 0%, #EEF2FF 100%)",
    text: "#4338CA",
    ring: "#C7D2FE",
  },
  "Maternity & Obstetrics": {
    icon: Baby,
    badge: "#FFF0F7",
    card: "linear-gradient(145deg, #FFF7FB 0%, #FFF0F7 100%)",
    text: "#BE185D",
    ring: "#F9A8D4",
  },
}

const SPECIALTY_ACCENTS = ["#4DA3FF", "#14B8A6", "#7C5CFC", "#F97316", "#2563EB", "#EC4899"]

export default function WorkspaceDisplay({
  setting,
}: {
  setting: ClinicalSetting
}) {
  const meta = WORKSPACE_META[setting]
  const Icon = meta.icon
  const specialties = SETTING_SPECIALTIES[setting] ?? []
  const siblingSettings = CLINICAL_SETTINGS.filter((entry) => entry !== setting)

  return (
    <div className="space-y-5 lg:space-y-6">
      <section
        className="overflow-hidden rounded-[28px] border border-[#DCEAF0] px-5 py-5 shadow-[0_18px_50px_-35px_rgba(16,36,62,0.32)] lg:px-7 lg:py-7"
        style={{ background: meta.card }}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div
              className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[16px] border"
              style={{ backgroundColor: meta.badge, color: meta.text, borderColor: meta.ring }}
            >
              <Icon size={22} />
            </div>
            <p className="text-[14px] uppercase tracking-[0.16em] text-[#5B7A8A]">Workspace</p>
            <h1 className="mt-1 text-[34px] tracking-[-0.05em] text-[#10243E] lg:text-[44px]">{setting}</h1>
            <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#5B7286] lg:text-[16px]">
              Browse this workspace as an in-page display view. The app shell stays fixed while specialties and
              procedure pathways open within the same layout.
            </p>
          </div>

          <div className="rounded-[22px] border border-white/70 bg-white/70 px-4 py-3 backdrop-blur-sm lg:min-w-[220px]">
            <p className="text-[13px] uppercase tracking-[0.14em] text-[#6B7F90]">Available specialties</p>
            <p className="mt-2 text-[30px] tracking-[-0.04em] text-[#10243E]">{specialties.length}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-[24px] font-medium tracking-[-0.03em] text-[#10243E]">Specialties</h2>
          <p className="mt-1 text-[14px] text-[#61758B]">Choose a specialty to stay within this workspace view.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {specialties.map((specialty, index) => (
            <Link
              key={specialty}
              href={`/?setting=${encodeURIComponent(setting)}&specialty=${encodeURIComponent(specialty)}`}
              className="group rounded-[24px] border border-[#DCEAF0] bg-white px-5 py-5 shadow-[0_12px_32px_-28px_rgba(16,36,62,0.35)] transition-transform hover:-translate-y-0.5 hover:bg-[#F8FCFF]"
            >
              <div
                className="mb-4 h-1.5 w-16 rounded-full"
                style={{ backgroundColor: SPECIALTY_ACCENTS[index % SPECIALTY_ACCENTS.length] }}
              />
              <p className="text-[20px] leading-7 tracking-[-0.03em] text-[#10243E]">{specialty}</p>
              <p className="mt-2 text-[14px] leading-6 text-[#61758B]">
                Open this specialty inside the current workspace layout.
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <h2 className="text-[20px] font-medium tracking-[-0.03em] text-[#10243E]">Other workspaces</h2>
        </div>
        <div className="flex flex-wrap gap-2 px-1">
          {siblingSettings.map((entry) => (
            <Link
              key={entry}
              href={`/?setting=${encodeURIComponent(entry)}`}
              className="rounded-full border border-[#DCEAF0] bg-white px-4 py-2 text-[14px] text-[#0F4C5C] transition-colors hover:bg-[#F4FBFF]"
            >
              {entry}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
