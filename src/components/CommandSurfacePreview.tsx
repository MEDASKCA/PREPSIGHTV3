"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  ChevronRight,
  LayoutGrid,
  Package,
  RefreshCw,
  Search,
  X,
} from "lucide-react"

import AssistantCompactCard from "@/components/AssistantCompactCard"
import AssistantCompareMatches from "@/components/AssistantCompareMatches"
import AssistantLauncherBlock from "@/components/AssistantLauncherBlock"
import AssistantResponseState from "@/components/AssistantResponseState"
import AssistantResponseText from "@/components/AssistantResponseText"
import AssistantWalkthroughBlock from "@/components/AssistantWalkthroughBlock"
import KardexSection from "@/components/KardexSection"
import ProfileButton from "@/components/ProfileButton"
import RelatedWalkthroughs from "@/components/RelatedWalkthroughs"
import { EyeIcon, KidneyIcon, ScalpelIcon, StomachIcon } from "@/components/SpecialtyIcons"
import {
  buildAssistantDecisionTrace,
  buildAssistantPendingState,
  buildAssistantReply,
} from "@/lib/assistant"
import type { AssistantCarryContext, AssistantReply } from "@/lib/assistant-contracts"
import { getActionPrompt, getTableRowPrompt } from "@/lib/assistant-chat"
import { emitAssistantDebugEvent } from "@/lib/assistant-observability"
import { SETTING_SPECIALTIES } from "@/lib/settings"
import { theatreOrtho } from "@/lib/seed-data/theatre-ortho"
import { getMockWalkthroughs } from "@/lib/video-mocks"
import type { Procedure, Section } from "@/lib/types"

type ThreadEntry = {
  id: string
  role: "user" | "assistant"
  text: string
  reply?: AssistantReply
  pendingLabel?: string
  pendingDetail?: string
}

const TOM_SESSION_KEY = "prepsight.tom.thread"
const TOM_SESSION_VERSION = 2
const TOM_DEFAULT_MESSAGE: ThreadEntry = {
  id: "assistant-seed",
  role: "assistant",
  text: "Responses are grounded in reviewed, source-backed content contributed within your workspace. This is deterministic and does not generate beyond that content.",
}

function sanitizeAssistantReply(value: unknown): AssistantReply | undefined {
  if (!value || typeof value !== "object") return undefined

  const reply = value as Record<string, unknown>

  const actions = Array.isArray(reply.actions)
    ? reply.actions.filter((item): item is NonNullable<AssistantReply["actions"]>[number] => (
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { href?: unknown }).href === "string"
    ))
    : undefined

  const chips = Array.isArray(reply.chips)
    ? reply.chips.filter((item): item is string => typeof item === "string")
    : undefined

  const matchedProcedures = Array.isArray(reply.matchedProcedures)
    ? reply.matchedProcedures.filter((item): item is NonNullable<AssistantReply["matchedProcedures"]>[number] => (
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string" &&
      typeof (item as { name?: unknown }).name === "string" &&
      typeof (item as { specialty?: unknown }).specialty === "string" &&
      typeof (item as { setting?: unknown }).setting === "string" &&
      typeof (item as { href?: unknown }).href === "string"
    ))
    : undefined

  const variantChoices = Array.isArray(reply.variantChoices)
    ? reply.variantChoices.filter((item): item is NonNullable<AssistantReply["variantChoices"]>[number] => (
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string" &&
      typeof (item as { label?: unknown }).label === "string" &&
      typeof (item as { href?: unknown }).href === "string"
    ))
    : undefined

  const table = reply.table && typeof reply.table === "object" &&
    Array.isArray((reply.table as { columns?: unknown }).columns) &&
    Array.isArray((reply.table as { rows?: unknown }).rows)
      ? {
          title: typeof (reply.table as { title?: unknown }).title === "string"
            ? (reply.table as { title?: string }).title
            : undefined,
          columns: ((reply.table as { columns: unknown[] }).columns).filter((item): item is string => typeof item === "string"),
          rows: ((reply.table as { rows: unknown[] }).rows).filter(Array.isArray).map((row) =>
            (row as unknown[]).filter((cell): cell is string => typeof cell === "string"),
          ),
          rowHrefs: Array.isArray((reply.table as { rowHrefs?: unknown }).rowHrefs)
            ? ((reply.table as { rowHrefs: unknown[] }).rowHrefs).filter((item): item is string => typeof item === "string")
            : undefined,
        }
      : undefined

  const launcher = reply.launcher && typeof reply.launcher === "object" &&
    typeof (reply.launcher as { title?: unknown }).title === "string" &&
    Array.isArray((reply.launcher as { items?: unknown }).items)
      ? {
          title: (reply.launcher as { title: string }).title,
          items: (reply.launcher as { items: NonNullable<AssistantReply["launcher"]>["items"] }).items,
        }
      : undefined

  const compactCard = reply.compactCard && typeof reply.compactCard === "object" &&
    typeof (reply.compactCard as { title?: unknown }).title === "string" &&
    typeof (reply.compactCard as { meta?: unknown }).meta === "string" &&
    Array.isArray((reply.compactCard as { checklist?: unknown }).checklist)
      ? {
          title: (reply.compactCard as { title: string }).title,
          meta: (reply.compactCard as { meta: string }).meta,
          summary: typeof (reply.compactCard as { summary?: unknown }).summary === "string"
            ? (reply.compactCard as { summary?: string }).summary
            : undefined,
          checklist: ((reply.compactCard as { checklist: unknown[] }).checklist).filter((item): item is string => typeof item === "string"),
          href: typeof (reply.compactCard as { href?: unknown }).href === "string"
            ? (reply.compactCard as { href?: string }).href
            : undefined,
        }
      : undefined

  const walkthroughs = reply.walkthroughs && typeof reply.walkthroughs === "object" &&
    typeof (reply.walkthroughs as { title?: unknown }).title === "string" &&
    Array.isArray((reply.walkthroughs as { items?: unknown }).items)
      ? {
          title: (reply.walkthroughs as { title: string }).title,
          items: (reply.walkthroughs as { items: NonNullable<AssistantReply["walkthroughs"]>["items"] }).items,
        }
      : undefined

  return {
    text: typeof reply.text === "string" ? reply.text : "",
    entityDefinition: reply.entityDefinition && typeof reply.entityDefinition === "object" &&
      typeof (reply.entityDefinition as { label?: unknown }).label === "string" &&
      typeof (reply.entityDefinition as { kind?: unknown }).kind === "string" &&
      typeof (reply.entityDefinition as { description?: unknown }).description === "string"
        ? {
            label: (reply.entityDefinition as { label: string }).label,
            kind: (reply.entityDefinition as { kind: "system" | "component" | "product" | "procedure" }).kind,
            description: (reply.entityDefinition as { description: string }).description,
          }
        : undefined,
    actions: actions && actions.length > 0 ? actions : undefined,
    table,
    stats: Array.isArray(reply.stats)
      ? reply.stats.filter((item): item is NonNullable<AssistantReply["stats"]>[number] => (
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as { label?: unknown }).label === "string" &&
        typeof (item as { value?: unknown }).value === "string"
      ))
      : undefined,
    chips: chips && chips.length > 0 ? chips : undefined,
    launcher,
    compactCard,
    walkthroughs,
    matchedProcedures: matchedProcedures && matchedProcedures.length > 0 ? matchedProcedures : undefined,
    variantChoices: variantChoices && variantChoices.length > 0 ? variantChoices : undefined,
  }
}

function sanitizeThreadEntry(value: unknown): ThreadEntry | null {
  if (!value || typeof value !== "object") return null

  const candidate = value as Partial<ThreadEntry> & { role?: unknown }
  if (candidate.role !== "user" && candidate.role !== "assistant") return null

  return {
    id: typeof candidate.id === "string" ? candidate.id : `thread-${Math.random().toString(36).slice(2, 10)}`,
    role: candidate.role,
    text: typeof candidate.text === "string" ? candidate.text : "",
    reply: sanitizeAssistantReply(candidate.reply),
    pendingLabel: typeof candidate.pendingLabel === "string" ? candidate.pendingLabel : undefined,
    pendingDetail: typeof candidate.pendingDetail === "string" ? candidate.pendingDetail : undefined,
  }
}

const PREVIEW_PROCEDURE: Procedure = {
  ...theatreOrtho[0],
  sections: theatreOrtho[0].sections.slice(0, 8),
}

const COMPACT_CARD = {
  title: "Hemiarthroplasty",
  meta: "Operating Theatre · Trauma and Orthopaedics",
  checklist: [
    "Posterior approach card",
    "Cemented stem setup",
    "Tray readiness and walkthroughs",
  ],
  actions: ["Open full card", "Check trays", "View walkthroughs"],
}

const WORKFLOW_SHORTCUTS = [
  { label: "Calendar", imageSrc: "", tileColor: "#7C5CFC", icon: CalendarDays },
  { label: "New card", imageSrc: "/icons/workflow/new-card.png", tileColor: "#4DA3FF", icon: Package },
  { label: "Catalogue", imageSrc: "/icons/workflow/catalogue.png", tileColor: "#14B8A6", icon: Package },
  { label: "Stockroom", imageSrc: "/icons/workflow/stockroom.png", tileColor: "#8B5CF6", icon: Package },
  { label: "Scan", imageSrc: "/icons/workflow/product-id.png", tileColor: "#F97316", icon: Search },
  { label: "Directory", imageSrc: "/icons/workflow/directory.png", tileColor: "#0EA5E9", icon: Package },
  { label: "Suppliers", imageSrc: "/icons/workflow/suppliers.svg", tileColor: "#06B6D4", icon: Package },
  { label: "Implants", imageSrc: "/icons/workflow/implants.png", tileColor: "#10B981", icon: LayoutGrid },
  { label: "Data Review", imageSrc: "/icons/workflow/tray-audit.png", tileColor: "#F59E0B", icon: Package },
]

const START_ACTIONS = [
  { id: "browse", label: "Browse", href: "/?library=1", color: "#4DA3FF", icon: LayoutGrid },
  { id: "build", label: "Build", href: "/procedures/new", color: "#14B8A6", icon: Package },
  { id: "review", label: "Review", href: "/review", color: "#F59E0B", icon: RefreshCw },
] as const

const SPECIALTY_SHORTCUTS = (SETTING_SPECIALTIES["Operating Theatre"] ?? []).map((label, index) => {
  const colorPalette = [
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
  ]

  const imageMap: Record<string, string> = {
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
  }

  const iconMap: Record<string, typeof StomachIcon> = {
    "Trauma and Orthopaedics": StomachIcon,
    "General Surgery": ScalpelIcon,
    "Urology": KidneyIcon,
    "Ophthalmology": EyeIcon,
  }

  return {
    label,
    color: colorPalette[index % colorPalette.length] ?? "#3B82F6",
    imageSrc: imageMap[label] ?? "",
    icon: iconMap[label] ?? StomachIcon,
  }
})

function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? `${hex}${alpha}` : hex
}

function extractProcedureIdFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined
  const match = href.match(/\/procedures\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

function deriveCarryContext(messages: ThreadEntry[]): AssistantCarryContext | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || message.role !== "assistant") continue
    const reply = message.reply
    if (!reply) continue

    const compactCardHref = reply.compactCard?.href
    const compactProcedureId = extractProcedureIdFromHref(compactCardHref)
    if (compactProcedureId || reply.compactCard?.title) {
      return {
        procedureId: compactProcedureId,
        procedureName: reply.compactCard?.title,
      }
    }

    const firstMatch = reply.matchedProcedures?.[0]
    if (firstMatch) {
      return {
        procedureId: firstMatch.id,
        procedureName: firstMatch.name,
        specialty: firstMatch.specialty,
      }
    }

    if (reply.launcher?.title === "Specialties") {
      return {
        browseLabel: "Specialties",
      }
    }

    if (reply.entityDefinition) {
      return {
        entityLabel: reply.entityDefinition.label,
        entityKind: reply.entityDefinition.kind,
        entityDescription: reply.entityDefinition.description,
      }
    }
  }

  return undefined
}

function mobileIconShellStyle(color: string) {
  return {
    background: `linear-gradient(180deg, ${withAlpha(color, "FF")} 0%, ${withAlpha(color, "F0")} 42%, ${withAlpha(color, "D2")} 100%)`,
    boxShadow: `0 10px 18px ${withAlpha(color, "24")}, inset 0 1px 0 rgba(255,255,255,0.34), inset 0 -12px 18px rgba(15,23,42,0.14)`,
  }
}

function mobileIconGlossStyle() {
  return {
    background: "linear-gradient(180deg, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0) 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
  }
}

function mobileSpecialtyIconSize(label: string): number {
  if (label === "Orthopaedics") return 26
  return 24
}

function mobileSpecialtyImageClassName(label: string): string {
  if (label === "Orthopaedics") return "h-10 w-10 scale-[1.12] object-contain"
  if (label === "General Surgery") return "h-10 w-10 scale-[1.1] object-contain"
  return "h-10 w-10 scale-[1.08] object-contain"
}

function mobileWorkflowImageClassName(label: string): string {
  if (label === "Calendar") return "h-9 w-9 scale-105 object-contain"
  return "h-10 w-10 scale-[1.08] object-contain"
}

function IconGridBlock({
  title,
  type,
  failedImages,
  setFailedImages,
}: {
  title: string
  type: "workflow" | "specialty"
  failedImages: Set<string>
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  if (type === "workflow") {
    return (
      <div className="max-w-2xl px-1 py-1">
        <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00B4D8]">{title}</p>
        <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-1 py-2.5">
          {WORKFLOW_SHORTCUTS.map((item) => {
            const Icon = item.icon ?? Package
            return (
              <button key={item.label} type="button" className="group flex select-none flex-col items-center text-center">
                <div
                  className="relative mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ring-1 ring-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                  style={mobileIconShellStyle(item.tileColor)}
                >
                  <div className="pointer-events-none absolute inset-x-1.5 top-1.5 h-5 rounded-[14px]" style={mobileIconGlossStyle()} />
                  {item.imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageSrc}
                      alt=""
                      className={`${mobileWorkflowImageClassName(item.label)} drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]`}
                      onError={() => setFailedImages((prev) => new Set(prev).add(item.label))}
                    />
                  ) : (
                    <Icon size={24} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                  )}
                </div>
                <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#10243E]">{item.label}</p>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl px-1 py-1">
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00B4D8]">{title}</p>
      <div className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-1 py-2.5">
        {SPECIALTY_SHORTCUTS.map((item) => {
          const Icon = item.icon
          return (
            <button key={item.label} type="button" className="group flex select-none flex-col items-center text-center">
              <div
                className="relative mb-1.5 flex h-14 w-14 items-center justify-center rounded-[20px] ring-1 ring-black/5 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
                style={mobileIconShellStyle(item.color)}
              >
                <div className="pointer-events-none absolute inset-x-1.5 top-1.5 h-5 rounded-[14px]" style={mobileIconGlossStyle()} />
                {item.imageSrc && !failedImages.has(item.label) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageSrc}
                    alt=""
                    className={`${mobileSpecialtyImageClassName(item.label)} drop-shadow-[0_1px_2px_rgba(15,23,42,0.22)]`}
                    onError={() => setFailedImages((prev) => new Set(prev).add(item.label))}
                  />
                ) : (
                  <Icon size={mobileSpecialtyIconSize(item.label)} className="text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.28)]" />
                )}
              </div>
              <p className="line-clamp-1 text-[11px] font-semibold leading-4 text-[#10243E]">{item.label}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AssistantThreadReply({
  message,
  failedImages,
  setFailedImages,
  onAction,
  onPrompt,
  onFollow,
  onContentReady,
}: {
  message: ThreadEntry
  failedImages: Set<string>
  setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>
  onAction: (href: string) => void
  onPrompt: (prompt: string) => void
  onFollow?: () => void
  onContentReady?: () => void
}) {
  const [contentReady, setContentReady] = useState(!message.text?.trim())

  useEffect(() => {
    setContentReady(!message.text?.trim())
  }, [message.id, message.pendingLabel, message.text])

  return (
    <div className="animate-[threadBlockIn_240ms_cubic-bezier(0.16,1,0.3,1)_both] space-y-3 pl-0.5 lg:space-y-4">
      {message.pendingLabel ? (
        <AssistantResponseState
          label={message.pendingLabel}
          detail={message.pendingDetail}
          className="text-[#5A7184]"
        />
      ) : (
        <AssistantResponseText
          text={message.text}
          animate
          className="max-w-3xl text-[14px] leading-7 text-[#526579] lg:text-[15px]"
          onProgress={onFollow}
          onComplete={() => {
            setContentReady(true)
            onContentReady?.()
          }}
        />
      )}

      {!message.pendingLabel && contentReady && message.reply?.launcher?.title === "Workflow tools" && (
        <IconGridBlock
          title="Workflow tools"
          type="workflow"
          failedImages={failedImages}
          setFailedImages={setFailedImages}
        />
      )}

      {!message.pendingLabel && contentReady && message.reply?.launcher?.title === "Specialties" && (
        <IconGridBlock
          title="Specialties"
          type="specialty"
          failedImages={failedImages}
          setFailedImages={setFailedImages}
        />
      )}

      {!message.pendingLabel && contentReady && message.reply?.compactCard && (
        <AssistantCompactCard
          title={message.reply.compactCard.title}
          meta={message.reply.compactCard.meta}
          summary={message.reply.compactCard.summary}
          checklist={message.reply.compactCard.checklist}
          href={message.reply.compactCard.href}
          onPrompt={onPrompt}
        />
      )}

      {!message.pendingLabel && contentReady && message.reply?.matchedProcedures && message.reply.matchedProcedures.length > 0 && (
        <AssistantCompareMatches
          items={message.reply.matchedProcedures}
          onPrompt={onPrompt}
        />
      )}

      {!message.pendingLabel && contentReady && message.reply?.variantChoices && message.reply.variantChoices.length > 0 && (
        <div className="max-w-3xl space-y-2">
          {message.reply.variantChoices.map((choice) => (
            <button
              key={`${message.id}-${choice.id}-${choice.href}`}
              type="button"
              onClick={() => onPrompt(choice.label)}
              className="w-full rounded-[22px] border border-[#D5E3EF] bg-white px-4 py-3 text-left transition-colors hover:bg-[#F8FBFF]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#10243E]">{choice.label}</p>
                  {choice.description ? (
                    <p className="mt-1 text-xs leading-5 text-[#5A7184]">{choice.description}</p>
                  ) : null}
                </div>
                <ChevronRight size={16} className="mt-0.5 shrink-0 text-[#5A7184]" />
              </div>
            </button>
          ))}
        </div>
      )}

      {!message.pendingLabel && contentReady && message.reply?.walkthroughs && message.reply.walkthroughs.items.length > 0 && (
        <AssistantWalkthroughBlock
          title={message.reply.walkthroughs.title}
          items={message.reply.walkthroughs.items}
        />
      )}

      {!message.pendingLabel && contentReady && message.reply?.table && (
        <div className="max-w-3xl overflow-hidden rounded-[22px] border border-[#D5E3EF] bg-white">
          {message.reply.table.title && (
            <div className="border-b border-[#D5E3EF] bg-[#F8FBFF] px-3 py-2">
              <p className="text-xs font-semibold text-[#10243E]">{message.reply.table.title}</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="text-[#64748B]">
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
                      <td key={`${message.id}-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top text-[#10243E]">
                        {cellIndex === 0 && message.reply?.table?.rowHrefs?.[rowIndex] ? (
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

      {!message.pendingLabel && contentReady && message.reply?.actions && message.reply.actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.reply.actions.map((action) => (
            <button
              key={`${message.id}-${action.label}-${action.href}`}
              type="button"
              onClick={() => onPrompt(getActionPrompt(action, message.reply!))}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                action.tone === "primary"
                  ? "border-[#8ADFF0] bg-[#AEEAF7] text-[#10243E] hover:bg-[#9BE4F4]"
                  : "border-[#8ADFF0] bg-[#AEEAF7] text-[#24506A] hover:bg-[#9BE4F4]"
              }`}
            >
              <ChevronRight size={14} />
              {action.label}
            </button>
          ))}
        </div>
      )}

      {!message.pendingLabel && contentReady && message.reply?.chips && message.reply.chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {message.reply.chips.map((chip) => (
            <button
              key={`${message.id}-${chip}`}
              type="button"
              onClick={() => onPrompt(chip)}
              className="rounded-full border border-[#8ADFF0] bg-[#AEEAF7] px-3.5 py-2 text-sm font-medium text-[#24506A] transition-colors hover:bg-[#9BE4F4]"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommandSurfacePreview() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [showFullCard, setShowFullCard] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const [sectionsState, setSectionsState] = useState<Section[]>(PREVIEW_PROCEDURE.sections)
  const [lastAssistantReadyId, setLastAssistantReadyId] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const assistantTimerRef = useRef<number | null>(null)
  const assistantContext = useMemo(
    () => ({
      pageKind: "home" as const,
      title: "Chat",
      description: "You're in chat. I can prepare a case, compare procedures, surface workflow tools, or pull card content into the thread.",
      setting: "Operating Theatre" as const,
      stats: [{ label: "Specialties", value: String(SETTING_SPECIALTIES["Operating Theatre"]?.length ?? 0) }],
    }),
    [],
  )
  const [messages, setMessages] = useState<ThreadEntry[]>([TOM_DEFAULT_MESSAGE])
  const hasConversation = messages.some((message) => message.role === "user") || messages.length > 1
  const visibleMessages = hasConversation ? messages.filter((message) => message.id !== TOM_DEFAULT_MESSAGE.id) : messages

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.sessionStorage.getItem(TOM_SESSION_KEY)
    if (!stored) return

    try {
      const parsed = JSON.parse(stored) as { version?: number; messages?: unknown[]; query?: string }
      if (parsed.version !== TOM_SESSION_VERSION) {
        window.sessionStorage.removeItem(TOM_SESSION_KEY)
        return
      }

      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        const sanitizedMessages = parsed.messages
          .map((entry) => sanitizeThreadEntry(entry))
          .filter((entry): entry is ThreadEntry => Boolean(entry))

        if (sanitizedMessages.length > 0) {
          setMessages(sanitizedMessages)
        }
      }
      if (typeof parsed.query === "string") {
        setQuery(parsed.query)
      }
    } catch {
      window.sessionStorage.removeItem(TOM_SESSION_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.sessionStorage.setItem(
      TOM_SESSION_KEY,
      JSON.stringify({
        version: TOM_SESSION_VERSION,
        messages,
        query,
      }),
    )
  }, [messages, query])

  useEffect(() => {
    const latestAssistant = [...visibleMessages].reverse().find((message) => message.role === "assistant")
    if (!latestAssistant || latestAssistant.pendingLabel) {
      setLastAssistantReadyId(null)
    }
  }, [visibleMessages])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" })
  }, [messages])

  function followAssistantThread() {
    const thread = threadRef.current
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

  useEffect(() => {
    return () => {
      if (assistantTimerRef.current !== null) {
        window.clearTimeout(assistantTimerRef.current)
      }
    }
  }, [])

  function resetFullCard() {
    setSectionsState(PREVIEW_PROCEDURE.sections)
    setShowFullCard(false)
  }

  function submitPrompt(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const carry = deriveCarryContext(messages)

    if (assistantTimerRef.current !== null) {
      window.clearTimeout(assistantTimerRef.current)
    }

    setMessages((current) => [...current, { id: `user-${Date.now()}-${current.length}`, role: "user", text: trimmed }])
    setLastAssistantReadyId(null)
    setQuery("")

    const assistantId = `assistant-${Date.now()}`
    const pending = buildAssistantPendingState(assistantContext, trimmed, carry)
    setMessages((current) => [
      ...current,
      {
        id: assistantId,
        role: "assistant",
        text: "",
        pendingLabel: pending.label,
        pendingDetail: pending.detail,
      },
    ])

    assistantTimerRef.current = window.setTimeout(() => {
      const reply = buildAssistantReply(assistantContext, trimmed, carry)
      const trace = buildAssistantDecisionTrace(assistantContext, trimmed, carry)
      const debugSetting =
        typeof (assistantContext as { setting?: unknown }).setting === "string"
          ? (assistantContext as { setting?: string }).setting
          : undefined
      const debugSpecialty =
        typeof (assistantContext as { specialty?: unknown }).specialty === "string"
          ? (assistantContext as { specialty?: string }).specialty
          : undefined
      emitAssistantDebugEvent({
        prompt: trimmed,
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
            ? { ...message, text: reply.text, reply, pendingLabel: undefined }
            : message,
        ),
      )
      assistantTimerRef.current = null
    }, pending.delay)
  }

  function resetChat() {
    if (assistantTimerRef.current !== null) {
      window.clearTimeout(assistantTimerRef.current)
      assistantTimerRef.current = null
    }
    setQuery("")
    setShowFullCard(false)
    setSectionsState(PREVIEW_PROCEDURE.sections)
    setMessages([TOM_DEFAULT_MESSAGE])
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(TOM_SESSION_KEY)
    }
  }

  function confirmResetChat() {
    if (typeof window !== "undefined") {
      const shouldReset = window.confirm("Reset this chat and clear the current thread?")
      if (!shouldReset) return
    }
    resetChat()
  }

  if (showFullCard) {
    return (
      <div className="min-h-screen bg-[#212121] text-[#ececec]">
        <div className="flex min-h-screen flex-col px-3 pb-4 pt-4 lg:px-6 lg:pb-8 lg:pt-6">
          <header className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowFullCard(false)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#ececec] transition-colors hover:bg-white/10"
            >
              <ArrowLeft size={15} />
              Back to chat
            </button>

            <button
              type="button"
              onClick={resetFullCard}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#ececec] transition-colors hover:bg-white/10"
            >
              Close
              <X size={15} />
            </button>
          </header>

          <main className="mt-4 flex-1">
            <div className="overflow-hidden rounded-[22px] border border-white/8 bg-[#f4f7fa] text-[#10243E] shadow-[0_18px_50px_rgba(0,0,0,0.22)] lg:rounded-[28px]">
              <div className="border-b border-[#D8E3EE] bg-[#00B4D8] px-5 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#DFF8FF]">
                  Full card takeover
                </p>
                <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.05em] text-white lg:text-[34px]">
                  {PREVIEW_PROCEDURE.name}
                </h2>
                <p className="mt-1 text-[13px] leading-6 text-[#E6FBFF] lg:text-[14px]">
                  {PREVIEW_PROCEDURE.setting} · {PREVIEW_PROCEDURE.specialty} · {PREVIEW_PROCEDURE.approach} · {PREVIEW_PROCEDURE.implantSystem}
                </p>
              </div>

              <div className="px-3 py-3 lg:px-4 lg:py-4">
                {sectionsState.map((section) => (
                  <KardexSection
                    key={`${section.id}:${section.items.length}:${section.nurseNotes ?? ""}:${section.patientPositionInstructions ?? ""}:${section.externalLinks?.length ?? 0}`}
                    section={section}
                    defaultOpen={false}
                    showChecks={false}
                    implantSystem={PREVIEW_PROCEDURE.implantSystem}
                    procedureId={PREVIEW_PROCEDURE.id}
                    procedureName={PREVIEW_PROCEDURE.name}
                    uid={null}
                    onSectionChange={(updatedSection) =>
                      setSectionsState((current) => current.map((item) => (item.id === updatedSection.id ? updatedSection : item)))
                    }
                  />
                ))}

                <RelatedWalkthroughs videos={getMockWalkthroughs(PREVIEW_PROCEDURE)} defaultOpen={false} />
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#dff7fc_0%,transparent_26%),linear-gradient(180deg,#f4fbfd_0%,#edf5f8_48%,#e8f0f4_100%)] text-[#10243E]">
      <div className="tom-root mx-auto flex h-dvh max-w-5xl flex-col overflow-hidden px-3 pb-3 pt-3 lg:px-6 lg:pb-4 lg:pt-4">
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ps-mark.png" alt="PrepSight" className="h-8 w-auto lg:h-9" />
            <div>
              <div className="text-[22px] font-semibold tracking-[-0.05em] text-[#00B4D8] lg:text-[26px]">PrepSight</div>
            </div>
          </div>
          <div className="flex items-start">
            <ProfileButton modeSwitch={{ label: "Switch to Library", path: "/?library=1" }} />
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center">
          <div className="flex min-h-0 w-full max-w-4xl flex-1 flex-col">
            {hasConversation ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-transparent bg-transparent shadow-none backdrop-blur-0">
                  <div
                    ref={threadRef}
                    className="min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2 lg:space-y-6 lg:px-5 lg:pb-5 lg:pt-3"
                  >
                    {visibleMessages.map((message) => (
                      <div key={message.id}>
                        {message.role === "user" ? (
                          <div className="flex justify-end">
                            <div className="max-w-[90%] rounded-[20px] border border-[#00B4D8] bg-[#00B4D8] px-4 py-3.5 text-[14px] text-white shadow-[0_12px_26px_rgba(0,180,216,0.24)] lg:max-w-[82%] lg:rounded-[24px] lg:px-5 lg:py-4 lg:text-[15px]">
                              {message.text}
                            </div>
                          </div>
                        ) : (
                          <AssistantThreadReply
                            message={message}
                            failedImages={failedImages}
                            setFailedImages={setFailedImages}
                            onAction={(href) => router.push(href)}
                            onPrompt={submitPrompt}
                            onFollow={followAssistantThread}
                            onContentReady={() => setLastAssistantReadyId(message.id)}
                          />
                        )}
                      </div>
                    ))}

                    {visibleMessages.length > 0 && visibleMessages[visibleMessages.length - 1]?.role === "assistant" && lastAssistantReadyId === visibleMessages[visibleMessages.length - 1]?.id && (
                      <div className="flex justify-center pt-1">
                        <button
                          type="button"
                          onClick={confirmResetChat}
                          className="inline-flex h-12 w-12 items-center justify-center text-[#00B4D8] transition-colors hover:text-[#12C4E7]"
                          aria-label="Reset chat"
                        >
                          <RefreshCw size={26} strokeWidth={1.8} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 border-t border-transparent bg-transparent px-0 pb-2 pt-2 lg:px-0 lg:pb-3 lg:pt-3">
                    <div className="flex w-full items-end gap-2 rounded-[20px] border border-[#BFEAF5] bg-[#AEEAF7]/95 px-2 py-2 shadow-[0_20px_50px_rgba(0,180,216,0.16)] lg:rounded-[22px]">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            submitPrompt(query)
                          }
                        }}
                        className="h-[42px] flex-1 rounded-[18px] border-0 bg-white px-3 text-[14px] leading-[42px] text-[#10243E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => submitPrompt(query)}
                        className="group flex h-10 w-10 items-center justify-center rounded-full bg-[#00B4D8] text-white transition-colors hover:bg-[#12C4E7]"
                        aria-label="Send prompt"
                        >
                          <ArrowUp size={18} />
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                      {START_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => router.push(action.href)}
                          className="rounded-full bg-[#00B4D8] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(0,180,216,0.32)] transition-colors hover:bg-[#12C4E7]"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center">
                <div className="w-full max-w-3xl">
                  <div className="mb-6 text-center lg:mb-8">
                    <h1 className="text-[28px] font-semibold tracking-[-0.06em] text-[#10243E] lg:text-[52px]">
                      What do you need to prepare?
                    </h1>
                  </div>

                  <div ref={threadRef} className="mb-6 flex justify-center px-3 lg:mb-8 lg:px-5">
                    <div className="max-w-3xl text-center">
                      <AssistantResponseText
                        text={messages[0]?.text ?? TOM_DEFAULT_MESSAGE.text}
                        className="text-[14px] leading-7 text-[#526579] lg:text-[15px]"
                      />
                    </div>
                  </div>

                  <div className="px-0">
                    <div className="flex w-full items-end gap-2 rounded-[20px] border border-[#BFEAF5] bg-[#AEEAF7]/95 px-2 py-2 shadow-[0_20px_50px_rgba(0,180,216,0.16)] lg:rounded-[22px]">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            submitPrompt(query)
                          }
                        }}
                        className="h-[42px] flex-1 rounded-[18px] border-0 bg-white px-3 text-[14px] leading-[42px] text-[#10243E] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => submitPrompt(query)}
                        className="group flex h-10 w-10 items-center justify-center rounded-full bg-[#00B4D8] text-white transition-colors hover:bg-[#12C4E7]"
                        aria-label="Send prompt"
                        >
                          <ArrowUp size={18} />
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                      {START_ACTIONS.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => router.push(action.href)}
                          className="rounded-full bg-[#00B4D8] px-4 py-2 text-[13px] font-semibold text-white shadow-[0_10px_22px_rgba(0,180,216,0.32)] transition-colors hover:bg-[#12C4E7]"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
