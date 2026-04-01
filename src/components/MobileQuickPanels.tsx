"use client"

import { useRef, useState, type UIEvent } from "react"
import {
  Activity,
  BedSingle,
  Boxes,
  ClipboardCheck,
  Building2,
  FolderKanban,
  FolderSearch2,
  HeartPulse,
  IdCard,
  Microscope,
  Package,
  Pill,
  Plus,
  ScanSearch,
  ShieldPlus,
  ShoppingCart,
  Stethoscope,
  TestTube2,
  Truck,
  UserRound,
  Waves,
  Wrench,
} from "lucide-react"
import Link from "next/link"
import { CLINICAL_SETTINGS } from "@/lib/settings"
import { ClinicalSetting } from "@/lib/types"

const SETTING_CARD_META: Record<
  ClinicalSetting,
  {
    icon: typeof Stethoscope
    tile: string
    iconColor: string
  }
> = {
  "Operating Theatre": {
    icon: Stethoscope,
    tile: "bg-[#4DA3FF]",
    iconColor: "text-white",
  },
  "Endoscopy Suite": {
    icon: Waves,
    tile: "bg-[#14B8A6]",
    iconColor: "text-white",
  },
  "Interventional Radiology / Cath Lab": {
    icon: Activity,
    tile: "bg-[#7C5CFC]",
    iconColor: "text-white",
  },
  "Emergency Department": {
    icon: HeartPulse,
    tile: "bg-[#F97316]",
    iconColor: "text-white",
  },
  "Intensive Care Unit": {
    icon: BedSingle,
    tile: "bg-[#2563EB]",
    iconColor: "text-white",
  },
  Ward: {
    icon: Building2,
    tile: "bg-[#10B981]",
    iconColor: "text-white",
  },
  "Outpatient / Clinic": {
    icon: Pill,
    tile: "bg-[#6366F1]",
    iconColor: "text-white",
  },
  "Maternity & Obstetrics": {
    icon: HeartPulse,
    tile: "bg-[#EC4899]",
    iconColor: "text-white",
  },
}

const EXTRA_WORKSPACE_SETTINGS = [
  {
    label: "Lab Hub",
    href: "",
    icon: TestTube2,
    tile: "bg-[#22C55E]",
  },
  {
    label: "Vendors",
    href: "",
    icon: Truck,
    tile: "bg-[#F59E0B]",
  },
  {
    label: "ID Scan",
    href: "",
    icon: ScanSearch,
    tile: "bg-[#0EA5E9]",
  },
  {
    label: "Profiles",
    href: "",
    icon: IdCard,
    tile: "bg-[#8B5CF6]",
  },
  {
    label: "Lab Kits",
    href: "",
    icon: Microscope,
    tile: "bg-[#14B8A6]",
  },
  {
    label: "Safety",
    href: "",
    icon: ShieldPlus,
    tile: "bg-[#EF4444]",
  },
  {
    label: "Projects",
    href: "",
    icon: FolderKanban,
    tile: "bg-[#4DA3FF]",
  },
] as const

const WORKFLOW_TOOLS = [
  {
    label: "New Card",
    href: "/procedures/new",
    icon: Plus,
    tile: "bg-[#4DA3FF]",
    available: true,
  },
  {
    label: "Catalogue",
    href: "/catalogue",
    icon: Package,
    tile: "bg-[#14B8A6]",
    available: true,
  },
  {
    label: "Surgeons",
    href: "",
    icon: UserRound,
    tile: "bg-[#6366F1]",
    available: false,
  },
  {
    label: "Directory",
    href: "",
    icon: Building2,
    tile: "bg-[#7C5CFC]",
    available: false,
  },
  {
    label: "Implant Checker",
    href: "",
    icon: ClipboardCheck,
    tile: "bg-[#10B981]",
    available: false,
  },
  {
    label: "Product ID",
    href: "",
    icon: FolderSearch2,
    tile: "bg-[#F97316]",
    available: false,
  },
  {
    label: "Case Lists",
    href: "",
    icon: Boxes,
    tile: "bg-[#0EA5E9]",
    available: false,
  },
  {
    label: "Stockroom",
    href: "",
    icon: ShoppingCart,
    tile: "bg-[#8B5CF6]",
    available: false,
  },
  {
    label: "Tray Audit",
    href: "",
    icon: Wrench,
    tile: "bg-[#F59E0B]",
    available: false,
  },
] as const

function chunkItems<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

export default function MobileQuickPanels() {
  const [workspacePage, setWorkspacePage] = useState(0)
  const [workflowPage, setWorkflowPage] = useState(0)
  const workspaceScrollerRef = useRef<HTMLDivElement>(null)
  const workflowScrollerRef = useRef<HTMLDivElement>(null)

  const workspaceItems = [
    ...CLINICAL_SETTINGS.map((setting) => {
      const meta = SETTING_CARD_META[setting]
      return {
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
        icon: meta.icon,
        tile: meta.tile,
        iconColor: meta.iconColor,
      }
    }),
    ...EXTRA_WORKSPACE_SETTINGS.map((item) => ({
      ...item,
      id: `extra-${item.label.toLowerCase().replace(/\s+/g, "-")}`,
      iconColor: "text-white",
    })),
  ]

  const workspacePages = chunkItems(workspaceItems, 8)
  const workflowPages = chunkItems([...WORKFLOW_TOOLS], 8)
  const mobilePanelRows = Math.max(
    1,
    ...workspacePages.map((page) => Math.ceil(page.length / 4)),
    ...workflowPages.map((page) => Math.ceil(page.length / 4)),
  )
  const workspacePanelBodyHeight = 74 + mobilePanelRows * 88
  const workflowPanelBodyHeight = 88 + mobilePanelRows * 88
  const panelWidth = 320

  function handlePagedScroll(
    event: UIEvent<HTMLDivElement>,
    setPage: (page: number) => void,
  ) {
    const target = event.currentTarget
    const nextPage = Math.round(target.scrollLeft / Math.max(target.clientWidth, 1))
    setPage(nextPage)
  }

  return (
    <div className="pointer-events-none fixed inset-y-0 left-0 z-30 lg:hidden">
      <div className="relative h-full w-0">
        <div
          className="pointer-events-auto absolute left-1/2 top-[126px] -translate-x-1/2 overflow-hidden"
          style={{ height: `${workspacePanelBodyHeight}px`, width: `${panelWidth}px` }}
        >
          <div
            className="absolute right-0 top-0 rounded-[24px] border border-[#D5DCE3] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]"
            style={{ left: 0, height: `${workspacePanelBodyHeight}px` }}
          >
            <div className="absolute inset-x-0 top-0 flex justify-center px-4 pt-3">
              <div className="flex h-8 min-w-[112px] items-center justify-center rounded-full bg-[#4DA3FF] px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                Workspace
              </div>
            </div>
            <div className="px-4 pb-4 pt-14">
              <div className="mb-4 flex items-center justify-center">
                {workspacePages.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5">
                    {workspacePages.map((_, index) => (
                      <span
                        key={`workspace-dot-side-${index}`}
                        className={`h-1.5 rounded-full transition-all ${
                          workspacePage === index ? "w-4 bg-[#4DA3FF]" : "w-1.5 bg-[#D5DCE3]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div
                ref={workspaceScrollerRef}
                onScroll={(event) => handlePagedScroll(event, setWorkspacePage)}
                className="-mx-1 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex">
                  {workspacePages.map((pageItems, pageIndex) => (
                    <div
                      key={`workspace-side-page-${pageIndex}`}
                      className="w-full shrink-0 snap-center px-1"
                    >
                      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                        {pageItems.map((item) => {
                          const Icon = item.icon
                          return (
                            <Link
                              key={`side-${item.id}`}
                              href={item.href}
                              className="group flex flex-col items-center text-center"
                            >
                              <div className={`mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ${item.tile} shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition-transform group-hover:-translate-y-0.5`}>
                                <Icon size={20} className={item.iconColor} />
                              </div>
                              <p className="line-clamp-2 max-w-[72px] text-[11px] font-semibold leading-4 text-[#1E293B]">
                                {item.label}
                              </p>
                            </Link>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="pointer-events-auto absolute bottom-[112px] left-1/2 -translate-x-1/2 overflow-hidden"
          style={{ height: `${workflowPanelBodyHeight}px`, width: `${panelWidth}px` }}
        >
          <div
            className="absolute right-0 top-0 rounded-[24px] border border-[#D5DCE3] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]"
            style={{ left: 0, height: `${workflowPanelBodyHeight}px` }}
          >
            <div className="absolute inset-x-0 top-0 flex justify-center px-4 pt-3">
              <div className="flex h-8 min-w-[112px] items-center justify-center rounded-full bg-[#14B8A6] px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
                Tools
              </div>
            </div>
            <div className="px-4 pb-4 pt-14">
              <div className="mb-4 flex items-center justify-center">
                {workflowPages.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5">
                    {workflowPages.map((_, index) => (
                      <span
                        key={`workflow-dot-side-${index}`}
                        className={`h-1.5 rounded-full transition-all ${
                          workflowPage === index ? "w-4 bg-[#14B8A6]" : "w-1.5 bg-[#D5DCE3]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div
                ref={workflowScrollerRef}
                onScroll={(event) => handlePagedScroll(event, setWorkflowPage)}
                className="-mx-1 overflow-x-auto snap-x snap-mandatory pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <div className="flex">
                  {workflowPages.map((pageItems, pageIndex) => (
                    <div
                      key={`workflow-side-page-${pageIndex}`}
                      className="w-full shrink-0 snap-center px-1"
                    >
                      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                        {pageItems.map((tool) => {
                          const Icon = tool.icon
                          const content = (
                            <>
                              <div className={`mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ${tool.tile} shadow-[0_10px_22px_rgba(15,23,42,0.12)] ring-1 ring-black/5`}>
                                <Icon size={20} className="text-white" />
                              </div>
                              <p className="line-clamp-2 max-w-[72px] text-[11px] font-semibold leading-4 text-[#1E293B]">
                                {tool.label}
                              </p>
                              {!tool.available && (
                                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#94a3b8]">
                                  Soon
                                </p>
                              )}
                            </>
                          )

                          return tool.available ? (
                            <Link key={`side-${tool.label}`} href={tool.href} className="flex flex-col items-center text-center">
                              {content}
                            </Link>
                          ) : (
                            <div key={`side-${tool.label}`} className="flex flex-col items-center text-center opacity-75">
                              {content}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
