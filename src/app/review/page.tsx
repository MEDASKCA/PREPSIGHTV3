"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Info,
  Search,
  ScanSearch,
} from "lucide-react"
import liveMapping from "../../../data/systems/trauma_and_orthopaedics_full_live_mapping.json"
import {
  buildSystemMappingId,
  canModerateReviews,
  ensureSystemMappingReviewRecord,
  getAcceptedSectionData,
  getReviewActor,
  getReviewerStatus,
  getSectionValidationHistory,
  getSystemMappingHistory,
  getSystemMappingReviewSnapshot,
  setReviewerStatus,
  submitSectionProposal,
  submitSectionValidation,
  subscribeToSystemMappingReviews,
  voteOnSystemMapping,
  type MappingStatus,
  type FixationLabel,
  type ReviewerStatus,
  type ReviewableSectionKey,
  type SectionIssueType,
} from "@/lib/system-mapping-review"
import { getProfile } from "@/lib/profile"
import type { PrepSightProfile } from "@/lib/types"

const INCORRECT_REASON_OPTIONS = [
  { value: "procedure_mapping", label: "Procedure mapping" },
  { value: "implant_type", label: "Implant type" },
  { value: "missing_information", label: "Missing information" },
  { value: "other", label: "Other" },
] as const

type SectionAnswer = "" | "correct" | "incorrect" | "not_sure"
type SectionIssue = SectionIssueType | ""
type ImproveMode = "" | "flag_only" | "suggest_correction" | "add_missing"

type LiveBranch = (typeof liveMapping)[number]
type LiveSystem = LiveBranch["subanatomy_groups"][number]["procedures"][number]["variants"][number]["systems"][number]

type ReviewRow = {
  mappingId: string
  specialty: string
  subspecialty: string
  anatomy: string
  subanatomyGroup: string
  procedureId: string
  procedure: string
  variantId: string
  variant: string
  systemId: string
  system: string
  supplier: string
  mappingStatus: MappingStatus
  fixationClass: string
  activeStatus: string
  reviewNotes: string
  approvedByAdmin: boolean
  upvotes: number
  downvotes: number
  confidencePercent: number
  latestDownvoteReason: string
  reviewCount: number
  revisionCount: number
  lastReviewedBy: string
  hasProof: boolean
}

type SubmissionFeedback = {
  tone: "ok" | "warn"
  title: string
  detail: string
}

type QueueStatus = "awaiting" | "validated" | "needs_review" | "rejected"

function formatFixationLabel(value: string): string {
  return value.replaceAll("_", " ")
}

function normalizeMappingStatus(value: string | null | undefined): MappingStatus {
  if (value === "confirmed" || value === "rejected") return value
  return "review_required"
}

function InfoHint({ text }: { text: string }) {
  return (
    <button
      type="button"
      title={text}
      aria-label={text}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#D8E3EE] bg-white text-[#64748B]"
    >
      <Info size={12} />
    </button>
  )
}

function acceptedDataToTextMap(items: Array<{ label: string; value: string }>) {
  return Object.fromEntries(items.map((item) => [item.label.toLowerCase(), item.value]))
}

function buildProposalValue(
  section: ReviewableSectionKey,
  values: {
    note: string
    procedureVariant: string
    implantType: string
    sourceRationale: string
    trayName: string
    trayCategory: string
    traySupplier: string
    skuCode: string
    productName: string
    skuCategory: string
  },
) {
  if (section === "systems") {
    return {
      items: [
        { label: "Procedure variant", value: values.procedureVariant.trim() || "Not recorded" },
        { label: "Implant type", value: values.implantType.trim() || "Not recorded" },
        ...(values.sourceRationale.trim()
          ? [{ label: "Source / rationale", value: values.sourceRationale.trim() }]
          : []),
        ...(values.note.trim() ? [{ label: "Note / source context", value: values.note.trim() }] : []),
      ],
    }
  }

  if (section === "trays") {
    const items = [
      ...(values.trayName.trim() ? [{ label: "Tray name", value: values.trayName.trim() }] : []),
      ...(values.trayCategory.trim() ? [{ label: "Tray type / category", value: values.trayCategory.trim() }] : []),
      ...(values.traySupplier.trim() ? [{ label: "Supplier", value: values.traySupplier.trim() }] : []),
      ...(values.note.trim() ? [{ label: "Note", value: values.note.trim() }] : []),
    ]
    return {
      items,
      ...(items.length === 0 ? { empty_state: "No linked tray data currently held" } : {}),
    }
  }

  const items = [
    ...(values.skuCode.trim() ? [{ label: "SKU / product code", value: values.skuCode.trim() }] : []),
    ...(values.productName.trim() ? [{ label: "Product name", value: values.productName.trim() }] : []),
    ...(values.skuCategory.trim() ? [{ label: "Category", value: values.skuCategory.trim() }] : []),
    ...(values.note.trim() ? [{ label: "Note", value: values.note.trim() }] : []),
  ]
  return {
    items,
    ...(items.length === 0 ? { empty_state: "No linked SKU data currently held" } : {}),
  }
}

function buildRows(): ReviewRow[] {
  const snapshot = getSystemMappingReviewSnapshot()
  const rows: ReviewRow[] = []

  for (const branch of liveMapping as LiveBranch[]) {
    for (const subanatomy of branch.subanatomy_groups || []) {
      for (const procedure of subanatomy.procedures || []) {
        for (const variant of procedure.variants || []) {
          for (const system of variant.systems || []) {
            const mappingId = buildSystemMappingId(variant.variant_id, system.system_id)
            const stored = snapshot[mappingId]
            rows.push({
              mappingId,
              specialty: branch.specialty,
              subspecialty: branch.subspecialty,
              anatomy: branch.anatomy,
              subanatomyGroup: subanatomy.name,
              procedureId: procedure.procedure_id ?? "",
              procedure: procedure.procedure_name,
              variantId: variant.variant_id ?? "",
              variant: variant.variant_name,
              systemId: system.system_id ?? "",
              system: system.system_name,
              supplier: system.supplier_name,
              mappingStatus: normalizeMappingStatus(stored?.mapping_status ?? system.mapping_status),
              fixationClass: String(stored?.fixation_label ?? system.fixation_class ?? "unknown"),
              activeStatus: String(system.active_status ?? "active"),
              reviewNotes: String(stored?.review_notes ?? system.notes ?? ""),
              approvedByAdmin: Boolean(stored?.approved_by_admin ?? (system.mapping_status === "confirmed")),
              upvotes: Number(stored?.upvotes ?? 0),
              downvotes: Number(stored?.downvotes ?? 0),
              confidencePercent: Math.round(
                (Number(stored?.upvotes ?? 0) / Math.max(1, Number(stored?.upvotes ?? 0) + Number(stored?.downvotes ?? 0))) * 100,
              ),
              latestDownvoteReason:
                stored?.vote_history?.slice().reverse().find((entry) => entry.direction === "down" && entry.reason?.trim())?.reason ?? "",
              reviewCount: Number(stored?.review_history?.length ?? 0),
              revisionCount: Number(stored?.revision_history?.length ?? 0),
              lastReviewedBy:
                stored?.review_history?.slice().reverse()[0]?.actor ??
                stored?.vote_history?.slice().reverse()[0]?.actor ??
                stored?.suggested_by_users?.slice().reverse()[0] ??
                (stored?.approved_by_admin ? "Trusted reviewer" : ""),
              hasProof: Boolean(stored?.evidence_links?.length),
            })
          }
        }
      }
    }
  }

  return rows.sort((a, b) =>
    [
      a.subspecialty,
      a.anatomy,
      a.subanatomyGroup,
      a.procedure,
      a.variant,
      a.system,
    ]
      .join("|")
      .localeCompare(
        [
          b.subspecialty,
          b.anatomy,
          b.subanatomyGroup,
          b.procedure,
          b.variant,
          b.system,
        ].join("|"),
      ),
  )
}

function getQueueStatus(row: ReviewRow): QueueStatus {
  const voteCount = row.upvotes + row.downvotes
  const hasMeaningfulValidation = row.reviewCount > 0 || voteCount > 0

  if (row.mappingStatus === "rejected") return "rejected"
  if (row.downvotes > 0 || row.latestDownvoteReason) return "needs_review"
  if (hasMeaningfulValidation && (row.mappingStatus === "confirmed" || row.upvotes > 0)) return "validated"
  return "awaiting"
}

function queueStatusLabel(status: QueueStatus): string {
  if (status === "validated") return "Validated"
  if (status === "needs_review") return "Needs review"
  if (status === "rejected") return "Rejected"
  return "Needs validation"
}

function queueStatusPillClass(status: QueueStatus): string {
  if (status === "validated") return "bg-emerald-100 text-emerald-700"
  if (status === "needs_review") return "bg-amber-100 text-amber-800"
  if (status === "rejected") return "bg-rose-100 text-rose-700"
  return "bg-amber-100 text-amber-800"
}

function queueCardClass(status: QueueStatus): string {
  if (status === "validated") return "border-emerald-200 bg-white hover:border-emerald-300"
  if (status === "needs_review") return "border-amber-200 bg-white hover:border-amber-300"
  if (status === "rejected") return "border-rose-200 bg-white hover:border-rose-300"
  return "border-[#D8E3EE] bg-white hover:border-[#C2D4E3]"
}

function getReviewSummaryLine(row: ReviewRow, status: QueueStatus): string {
  const totalVotes = row.upvotes + row.downvotes
  const reviewCount = Math.max(row.reviewCount, totalVotes)

  if (status === "awaiting") {
    return reviewCount > 0 ? `${reviewCount} reviews recorded` : "0 reviews yet"
  }

  if (status === "validated") {
    if (totalVotes > 0) {
      return `${reviewCount} reviews • ${row.confidencePercent}% agreement`
    }
    return `${reviewCount} reviews completed`
  }

  if (status === "needs_review") {
    if (row.downvotes > 0) {
      return `${row.downvotes} review${row.downvotes === 1 ? "" : "s"} flagged issues`
    }
    return `${reviewCount} reviews need attention`
  }

  return reviewCount > 0 ? `${reviewCount} reviews recorded` : "Removed from accepted flow"
}

function getSupportLine(row: ReviewRow): string {
  return row.reviewNotes?.trim() ? "Linked data available" : "System details available"
}

function ReviewSection({
  title,
  subtitle,
  status,
  open,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  status?: "Unverified" | "Reviewed" | "Needs review"
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const statusClass =
    status === "Reviewed"
      ? "bg-emerald-500/18 text-white"
      : status === "Needs review"
        ? "bg-rose-500/18 text-white"
        : "bg-white/18 text-white"

  return (
    <div className="kardex-section mt-4 overflow-hidden rounded-xl border border-[#D5DCE3] bg-white lg:rounded-[30px] lg:border-[#14304B] lg:bg-[#08131F] lg:shadow-[0_28px_64px_rgba(15,23,42,0.24)]">
      <div className="kardex-section-header flex items-center bg-[#4DA3FF] transition-colors">
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 px-4 py-3.5 text-left text-base font-semibold text-white transition-colors hover:bg-[#2F8EF7] lg:px-7 lg:py-6 lg:text-[30px] lg:font-semibold lg:tracking-[-0.05em]"
        >
          <span className="block">{title}</span>
          {subtitle ? <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-white/78 lg:text-[13px]">{subtitle}</span> : null}
        </button>

        {status ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide lg:px-4 lg:py-1.5 lg:text-[11px] ${statusClass}`}>
            {status}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          className="px-4 py-3.5 text-white transition-colors hover:bg-[#2F8EF7] lg:px-6"
        >
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      {open ? <div className="kardex-section-body px-4 py-2 lg:px-7 lg:py-6 lg:text-white/78">{children}</div> : null}
    </div>
  )
}

function ValidationChoices({
  value,
  onChange,
}: {
  value: SectionAnswer
  onChange: (value: SectionAnswer) => void
}) {
  return (
    <div className="grid gap-3">
      {[
        { value: "correct" as const, label: "Correct", active: "border-emerald-500 bg-emerald-50 text-emerald-800" },
        { value: "incorrect" as const, label: "Incorrect", active: "border-rose-500 bg-rose-50 text-rose-800" },
        { value: "not_sure" as const, label: "Not sure", active: "border-amber-500 bg-amber-50 text-amber-800" },
      ].map((option) => (
        <label
          key={option.value}
          className={`flex min-h-[56px] items-center gap-3 rounded-[18px] border px-4 py-3 text-[16px] font-medium ${
            value === option.value ? option.active : "border-[#D8E3EE] bg-white text-[#334155]"
          }`}
        >
          <input
            type="radio"
            name={`section_answer_${option.value}`}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}

export default function ReviewPage() {
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | QueueStatus>("awaiting")
  const [query, setQuery] = useState("")
  const [profile, setProfile] = useState<PrepSightProfile | null>(null)
  const [reviewerName, setReviewerName] = useState("")
  const [reviewerStatus, setLocalReviewerStatus] = useState<ReviewerStatus>("active")
  const [selectedRow, setSelectedRow] = useState<ReviewRow | null>(null)
  const [submissionFeedback, setSubmissionFeedback] = useState<SubmissionFeedback | null>(null)
  const [sectionReviews, setSectionReviews] = useState<Record<
    ReviewableSectionKey,
    {
      answer: SectionAnswer
      issue: SectionIssue
      note: string
      improveMode: ImproveMode
      procedureVariant: string
      implantType: string
      sourceRationale: string
      trayName: string
      trayCategory: string
      traySupplier: string
      skuCode: string
      productName: string
      skuCategory: string
    }
  >>({
    systems: {
      answer: "",
      issue: "",
      note: "",
      improveMode: "",
      procedureVariant: "",
      implantType: "",
      sourceRationale: "",
      trayName: "",
      trayCategory: "",
      traySupplier: "",
      skuCode: "",
      productName: "",
      skuCategory: "",
    },
    trays: {
      answer: "",
      issue: "",
      note: "",
      improveMode: "",
      procedureVariant: "",
      implantType: "",
      sourceRationale: "",
      trayName: "",
      trayCategory: "",
      traySupplier: "",
      skuCode: "",
      productName: "",
      skuCategory: "",
    },
    skus: {
      answer: "",
      issue: "",
      note: "",
      improveMode: "",
      procedureVariant: "",
      implantType: "",
      sourceRationale: "",
      trayName: "",
      trayCategory: "",
      traySupplier: "",
      skuCode: "",
      productName: "",
      skuCategory: "",
    },
  })
  const [openSections, setOpenSections] = useState({
    systems: true,
    trays: false,
    skus: false,
    cards: false,
    reviews: false,
    revisions: false,
  })

  useEffect(() => {
    const currentProfile = getProfile()
    const actor = getReviewActor(currentProfile)
    setProfile(currentProfile)
    setReviewerName(actor)
    setLocalReviewerStatus(getReviewerStatus(actor))
    setRows(buildRows())
    return subscribeToSystemMappingReviews(() => {
      const updatedProfile = getProfile()
      const actorName = getReviewActor(updatedProfile)
      setProfile(updatedProfile)
      setReviewerName(actorName)
      setLocalReviewerStatus(getReviewerStatus(actorName))
      const nextRows = buildRows()
      setRows(nextRows)
      setSelectedRow((current) => nextRows.find((row) => row.mappingId === current?.mappingId) ?? null)
    })
  }, [])

  const canModerate = canModerateReviews(profile)

  useEffect(() => {
    if (!selectedRow) return
    setSubmissionFeedback(null)
    ensureSystemMappingReviewRecord({
      mapping_id: selectedRow.mappingId,
      specialty: selectedRow.specialty,
      subspecialty: selectedRow.subspecialty,
      anatomy: selectedRow.anatomy,
      subanatomy_group: selectedRow.subanatomyGroup,
      procedure_id: selectedRow.procedureId,
      procedure_name: selectedRow.procedure,
      variant_id: selectedRow.variantId,
      variant_name: selectedRow.variant,
      system_id: selectedRow.systemId,
      system_name: selectedRow.system,
      supplier_name: selectedRow.supplier,
      fixation_label: ((selectedRow.fixationClass || "unknown").replaceAll(" ", "_")) as FixationLabel,
      review_notes: selectedRow.reviewNotes,
    })

    const systemsValidation = getSectionValidationHistory(selectedRow.mappingId, "systems").slice().reverse()[0]
    const traysValidation = getSectionValidationHistory(selectedRow.mappingId, "trays").slice().reverse()[0]
    const skusValidation = getSectionValidationHistory(selectedRow.mappingId, "skus").slice().reverse()[0]
    const acceptedSystems = getAcceptedSectionData(selectedRow.mappingId, "systems")
    const acceptedTrays = getAcceptedSectionData(selectedRow.mappingId, "trays")
    const acceptedSkus = getAcceptedSectionData(selectedRow.mappingId, "skus")
    const systemsMap = acceptedDataToTextMap(acceptedSystems.items)
    const traysMap = acceptedDataToTextMap(acceptedTrays.items)
    const skusMap = acceptedDataToTextMap(acceptedSkus.items)

    setOpenSections({
      systems: true,
      trays: false,
      skus: false,
      cards: false,
      reviews: false,
      revisions: false,
    })
    setSectionReviews({
      systems: {
        answer: systemsValidation?.vote ?? "",
        issue: systemsValidation?.issue_type ?? "",
        note: systemsValidation?.note ?? selectedRow.reviewNotes,
        improveMode: "",
        procedureVariant: systemsMap["procedure variant"] ?? selectedRow.variant ?? "",
        implantType: systemsMap["implant type"] ?? (selectedRow.fixationClass !== "unknown" ? formatFixationLabel(selectedRow.fixationClass) : ""),
        sourceRationale: systemsMap["source / rationale"] ?? "",
        trayName: "",
        trayCategory: "",
        traySupplier: selectedRow.supplier,
        skuCode: "",
        productName: "",
        skuCategory: "",
      },
      trays: {
        answer: traysValidation?.vote ?? "",
        issue: traysValidation?.issue_type ?? "",
        note: traysValidation?.note ?? "",
        improveMode: "",
        procedureVariant: "",
        implantType: "",
        sourceRationale: "",
        trayName: traysMap["tray name"] ?? "",
        trayCategory: traysMap["tray type / category"] ?? "",
        traySupplier: traysMap["supplier"] ?? selectedRow.supplier,
        skuCode: "",
        productName: "",
        skuCategory: "",
      },
      skus: {
        answer: skusValidation?.vote ?? "",
        issue: skusValidation?.issue_type ?? "",
        note: skusValidation?.note ?? "",
        improveMode: "",
        procedureVariant: "",
        implantType: "",
        sourceRationale: "",
        trayName: "",
        trayCategory: "",
        traySupplier: selectedRow.supplier,
        skuCode: skusMap["sku / product code"] ?? "",
        productName: skusMap["product name"] ?? "",
        skuCategory: skusMap["category"] ?? "",
      },
    })
  }, [selectedRow])

  function setSectionReviewValue(
    section: ReviewableSectionKey,
    updates: Partial<{
      answer: SectionAnswer
      issue: SectionIssue
      note: string
      improveMode: ImproveMode
      procedureVariant: string
      implantType: string
      sourceRationale: string
      trayName: string
      trayCategory: string
      traySupplier: string
      skuCode: string
      productName: string
      skuCategory: string
    }>,
  ) {
    setSectionReviews((current) => ({
      ...current,
      [section]: {
        ...current[section],
        ...updates,
      },
    }))
  }

  function saveSectionReview(section: ReviewableSectionKey) {
    if (!selectedRow) return
    const current = sectionReviews[section]

    if (!current.answer) {
      if (typeof window !== "undefined") window.alert("Choose an answer before saving.")
      return
    }

    if (current.answer === "incorrect" && !current.issue) {
      if (typeof window !== "undefined") window.alert("Choose what is wrong before saving.")
      return
    }

    submitSectionValidation({
      mapping_id: selectedRow.mappingId,
      section,
      vote: current.answer,
      issue_type: current.answer === "incorrect" ? current.issue || undefined : undefined,
      note: current.note.trim(),
      actor: reviewerName,
    })

    if (section === "systems" && current.answer === "correct") {
      voteOnSystemMapping(selectedRow.mappingId, "up", {
        actor: reviewerName,
        reason: "Systems section marked correct",
      })
      setSubmissionFeedback({
        tone: "ok",
        title: "Review saved",
        detail: "This section is now recorded as reviewed.",
      })
    }

    if (current.answer === "incorrect") {
      voteOnSystemMapping(selectedRow.mappingId, "down", {
        actor: reviewerName,
        reason: `${section}: ${current.issue || "other"}`,
      })

      if (current.improveMode === "suggest_correction") {
        submitSectionProposal({
          mapping_id: selectedRow.mappingId,
          section,
          action_type: "suggest_correction",
          issue_type: current.issue || undefined,
          proposed_value: buildProposalValue(section, current),
          note: current.note.trim(),
          actor: reviewerName,
        })
        setSubmissionFeedback({
          tone: "ok",
          title: "Suggestion submitted",
          detail: "Pending moderation before accepted data is updated.",
        })
      } else if (current.improveMode === "add_missing") {
        submitSectionProposal({
          mapping_id: selectedRow.mappingId,
          section,
          action_type: "add_missing_data",
          issue_type: current.issue || undefined,
          proposed_value: buildProposalValue(section, current),
          note: current.note.trim(),
          actor: reviewerName,
        })
        setSubmissionFeedback({
          tone: "ok",
          title: "Suggestion submitted",
          detail: "Pending moderation before accepted data is updated.",
        })
      } else {
        submitSectionProposal({
          mapping_id: selectedRow.mappingId,
          section,
          action_type: "flag_only",
          issue_type: current.issue || undefined,
          note: current.note.trim(),
          actor: reviewerName,
        })
        setSubmissionFeedback({
          tone: "warn",
          title: "Flag submitted for review",
          detail: "This section now appears in the moderation queue.",
        })
      }
      return
    }

    setSubmissionFeedback({
      tone: "ok",
      title: "Review saved",
      detail: "This section is now recorded as reviewed.",
    })
  }

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "all" && getQueueStatus(row) !== statusFilter) return false
      if (!query.trim()) return true
      const text = `${row.subspecialty} ${row.anatomy} ${row.procedure} ${row.variant} ${row.system} ${row.supplier}`.toLowerCase()
      return text.includes(query.trim().toLowerCase())
    })
  }, [query, rows, statusFilter])

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      validated: rows.filter((row) => getQueueStatus(row) === "validated").length,
      awaiting: rows.filter((row) => getQueueStatus(row) === "awaiting").length,
      rejected: rows.filter((row) => getQueueStatus(row) === "rejected").length,
      needsReview: rows.filter((row) => getQueueStatus(row) === "needs_review").length,
    }
    return counts
  }, [rows])

  const selectedHistory = useMemo(() => {
    if (!selectedRow) {
      return { reviewHistory: [], revisionHistory: [] }
    }
    return getSystemMappingHistory(selectedRow.mappingId)
  }, [selectedRow, rows])

  const selectedSectionData = useMemo(() => {
    if (!selectedRow) {
      return {
        systems: { items: [], empty_state: "" },
        trays: { items: [], empty_state: "" },
        skus: { items: [], empty_state: "" },
      }
    }

    return {
      systems: getAcceptedSectionData(selectedRow.mappingId, "systems"),
      trays: getAcceptedSectionData(selectedRow.mappingId, "trays"),
      skus: getAcceptedSectionData(selectedRow.mappingId, "skus"),
    }
  }, [selectedRow, rows])

  const validationSummary = useMemo(() => {
    const reviewableSections: ReviewableSectionKey[] = ["systems", "trays", "skus"]
    const reviewedCount = reviewableSections.filter((section) => sectionReviews[section].answer !== "").length
    const correctCount = reviewableSections.filter((section) => sectionReviews[section].answer === "correct").length
    const incorrectCount = reviewableSections.filter((section) => sectionReviews[section].answer === "incorrect").length

    let label = "Unverified"
    if (incorrectCount > 0) {
      label = "Needs review"
    } else if (correctCount === 3) {
      label = "Validated"
    } else if (reviewedCount > 0) {
      label = "Partially validated"
    }

    return { label, reviewedCount, correctCount, incorrectCount }
  }, [sectionReviews])

  const sectionStatus = useMemo(() => {
    const toStatus = (answer: SectionAnswer): "Unverified" | "Reviewed" | "Needs review" => {
      if (answer === "") return "Unverified"
      if (answer === "incorrect") return "Needs review"
      return "Reviewed"
    }

    return {
      systems: toStatus(sectionReviews.systems.answer),
      trays: toStatus(sectionReviews.trays.answer),
      skus: toStatus(sectionReviews.skus.answer),
    }
  }, [sectionReviews])

  function toggleSection(section: keyof typeof openSections) {
    setOpenSections((current) => ({ ...current, [section]: !current[section] }))
  }

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#10243E]">
      <header className="border-b border-white/10 bg-[#08131F]">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:px-8 lg:pb-6 lg:pt-6">
          <Link
            href="/"
            className="app-header-muted mt-0.5 shrink-0 rounded-lg p-2 transition-colors hover:opacity-80 lg:flex lg:h-14 lg:w-14 lg:items-center lg:justify-center lg:rounded-[20px] lg:border lg:border-white/10 lg:bg-white/6 lg:hover:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="app-header-text text-[18px] font-medium leading-snug lg:text-[40px] lg:font-semibold lg:tracking-[-0.05em]">
              Validate system records
            </h1>
            <p className="mt-1 text-sm text-white/72 lg:text-[15px]">
              Help confirm supplier system data for theatre use
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white/16"
              aria-label="Suppliers"
            >
              Suppliers
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-5 pt-5 text-[#10243E] lg:px-8 lg:pb-8 lg:pt-8">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: "all" as const, label: "Total", count: summary.total, activeClass: "border-[#10243E] bg-[#10243E] text-white", idleClass: "border-[#D8E3EE] bg-white text-[#334155]" },
            { value: "validated" as const, label: "Validated", count: summary.validated, activeClass: "border-emerald-600 bg-emerald-600 text-white", idleClass: "border-emerald-200 bg-emerald-50 text-emerald-800" },
            { value: "awaiting" as const, label: "Awaiting validation", count: summary.awaiting, activeClass: "border-amber-500 bg-amber-500 text-white", idleClass: "border-amber-200 bg-amber-50 text-amber-800" },
            { value: "rejected" as const, label: "Rejected", count: summary.rejected, activeClass: "border-rose-600 bg-rose-600 text-white", idleClass: "border-rose-200 bg-rose-50 text-rose-800" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatusFilter(item.value)}
              className={`min-w-fit shrink-0 rounded-[18px] border px-4 py-2.5 text-left transition-colors ${statusFilter === item.value ? item.activeClass : item.idleClass}`}
            >
              <div className="flex items-center gap-3">
                <p className="text-[12px] font-semibold">{item.label}</p>
                <p className="text-[22px] font-semibold tracking-[-0.03em]">{item.count}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-[#7C2D12]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em]">Internal note</p>
          <p className="mt-1 text-[14px] leading-6">
            Fixed data assets such as systems, trays, SKUs, and core mappings should move toward researched and curated master data rather than crowdsourced validation. Keep this page for now, but plan to revise or revert this workflow later.
          </p>
        </div>

        <div className="mt-4">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.04em] text-[#10243E]">Records awaiting validation</h2>
            <p className="mt-1 text-[14px] text-[#64748B]">Select a system to confirm or flag its linked data</p>
          </div>

          <div className="mt-3 rounded-[22px] border border-[#D8E3EE] bg-white p-3">
            <div className="flex flex-col gap-2">
              <label className="relative w-full">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search system, supplier, procedure…"
                  className="w-full rounded-[16px] border border-[#D8E3EE] bg-[#F8FBFD] py-3 pl-10 pr-4 text-sm outline-none"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "awaiting" as const, label: "Awaiting validation" },
                  { value: "validated" as const, label: "Validated" },
                  { value: "needs_review" as const, label: "Needs review" },
                  { value: "rejected" as const, label: "Rejected" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setStatusFilter(item.value)}
                    className={`rounded-full px-3 py-2 text-[12px] font-semibold ${
                      statusFilter === item.value ? "bg-[#10243E] text-white" : "border border-[#D8E3EE] bg-white text-[#475569]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {filteredRows.map((row) => {
                const queueStatus = getQueueStatus(row)
                const reviewLine = getReviewSummaryLine(row, queueStatus)
                const ctaLabel =
                  queueStatus === "awaiting"
                    ? "Validate record"
                    : queueStatus === "validated"
                      ? "View record"
                      : "Review record"

                return (
                  <button
                    key={row.mappingId}
                    type="button"
                    onClick={() => setSelectedRow(row)}
                    className={`w-full rounded-[22px] border px-4 py-3.5 text-left transition-colors ${queueCardClass(queueStatus)}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[18px] font-semibold tracking-[-0.03em] text-[#10243E]">{row.system}</p>
                        <p className="mt-0.5 text-[15px] text-[#64748B]">{row.supplier}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${queueStatusPillClass(queueStatus)}`}>
                        {queueStatusLabel(queueStatus)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-0.5 text-[14px] text-[#475569]">
                      <p>{reviewLine}</p>
                      <p>{getSupportLine(row)}</p>
                    </div>

                    <div className="mt-3 flex justify-end">
                      <span
                        className={`inline-flex rounded-full px-4 py-2 text-[12px] font-semibold ${
                          queueStatus === "validated"
                            ? "bg-[#DFF7F1] text-[#0F766E]"
                            : queueStatus === "rejected"
                              ? "bg-[#FFE4E6] text-[#BE123C]"
                              : "bg-[#CCFBF1] text-[#0F766E]"
                        }`}
                      >
                        {ctaLabel}
                      </span>
                    </div>
                  </button>
                )
              })}

              {filteredRows.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-[#D8E3EE] bg-[#F8FBFD] px-4 py-8 text-center">
                  <p className="text-[16px] font-medium text-[#10243E]">No records match this view</p>
                  <p className="mt-1 text-[14px] text-[#64748B]">Try another status filter or search term.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {selectedRow ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#F4F8FB] text-[#10243E]">
          <div className="mx-auto min-h-screen w-full max-w-4xl">
            <div className="sticky top-0 z-10 border-b border-[#D8E3EE] bg-white/95 backdrop-blur">
              <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:px-6 lg:pb-5 lg:pt-5">
                <div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0891B2]">Data Review</p>
                  <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-[#10243E]">{selectedRow.system}</h2>
                  <p className="mt-1 text-[15px] text-[#64748B]">{selectedRow.supplier}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRow(null)}
                  className="rounded-full border border-[#D8E3EE] bg-white px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#475569]"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-4 py-4 lg:px-6 lg:py-6">
            <div className="rounded-[20px] border border-[#D8E3EE] bg-white px-4 py-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#0891B2]">Record validation</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {validationSummary.label === "Validated" ? (
                    <Check size={16} className="text-emerald-600" />
                  ) : validationSummary.label === "Needs review" ? (
                    <CircleAlert size={16} className="text-rose-600" />
                  ) : validationSummary.label === "Partially validated" ? (
                    <ScanSearch size={16} className="text-sky-600" />
                  ) : (
                    <CircleAlert size={16} className="text-amber-600" />
                  )}
                  <p className="text-[22px] font-semibold tracking-[-0.03em] text-[#10243E]">{validationSummary.label}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${queueStatusPillClass(getQueueStatus(selectedRow))}`}>
                  {queueStatusLabel(getQueueStatus(selectedRow))}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#64748B]">
                <span>{validationSummary.reviewedCount} of 3 sections reviewed</span>
                <span className="text-[#CBD5E1]">•</span>
                <span>{validationSummary.correctCount} correct</span>
                {validationSummary.incorrectCount > 0 ? (
                  <>
                    <span className="text-[#CBD5E1]">•</span>
                    <span>{validationSummary.incorrectCount} need review</span>
                  </>
                ) : null}
              </div>
            </div>

            {submissionFeedback ? (
              <div
                className={`mt-3 rounded-[18px] border px-4 py-3 ${
                  submissionFeedback.tone === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                <p className="text-[14px] font-semibold">{submissionFeedback.title}</p>
                <p className="mt-1 text-[13px]">{submissionFeedback.detail}</p>
              </div>
            ) : null}

            <ReviewSection
              title="Systems"
              subtitle="Linked system data"
              status={sectionStatus.systems}
              open={openSections.systems}
              onToggle={() => toggleSection("systems")}
            >
              <div className="rounded-[18px] border border-[#D8E3EE] bg-white px-4 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0891B2]">Currently held</p>
                <div className="mt-3 space-y-2 text-[15px] leading-6 text-[#475569]">
                  {selectedSectionData.systems.items.map((item) => (
                    <p key={item.label}>
                      <span className="font-semibold text-[#10243E]">{item.label}:</span> {item.value}
                    </p>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[17px] font-semibold text-[#10243E]">Is this section correct?</p>
                </div>
                <ValidationChoices
                  value={sectionReviews.systems.answer}
                  onChange={(value) => setSectionReviewValue("systems", { answer: value, issue: value === "incorrect" ? sectionReviews.systems.issue : "", note: sectionReviews.systems.note })}
                />
              </div>

              {sectionReviews.systems.answer === "incorrect" ? (
                <fieldset className="mt-4 block">
                  <legend className="text-[13px] font-semibold text-[#475569]">What is wrong?</legend>
                  <div className="mt-2 grid gap-2">
                    {INCORRECT_REASON_OPTIONS.map((option) => (
                      <label key={option.value} className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#D8E3EE] bg-white px-4 py-2 text-[15px] text-[#334155]">
                        <input
                          type="radio"
                          name="systems_incorrect_reason"
                          checked={sectionReviews.systems.issue === option.value}
                          onChange={() => setSectionReviewValue("systems", { issue: option.value })}
                          className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {sectionReviews.systems.answer === "incorrect" ? (
                <fieldset className="mt-4 block">
                  <legend className="text-[13px] font-semibold text-[#475569]">Help improve this section</legend>
                  <div className="mt-2 grid gap-2">
                    {[
                      { value: "suggest_correction" as const, label: "Suggest correction" },
                      { value: "add_missing" as const, label: "Add missing data" },
                      { value: "flag_only" as const, label: "Flag only" },
                    ].map((option) => (
                      <label key={option.value} className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#D8E3EE] bg-white px-4 py-2 text-[15px] text-[#334155]">
                        <input
                          type="radio"
                          name="systems_improve_mode"
                          checked={sectionReviews.systems.improveMode === option.value}
                          onChange={() => setSectionReviewValue("systems", { improveMode: option.value })}
                          className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {sectionReviews.systems.improveMode === "suggest_correction" || sectionReviews.systems.improveMode === "add_missing" ? (
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Procedure variant</span>
                    <input
                      value={sectionReviews.systems.procedureVariant}
                      onChange={(event) => setSectionReviewValue("systems", { procedureVariant: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Implant type</span>
                    <input
                      value={sectionReviews.systems.implantType}
                      onChange={(event) => setSectionReviewValue("systems", { implantType: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Source / rationale (optional)</span>
                    <input
                      value={sectionReviews.systems.sourceRationale}
                      onChange={(event) => setSectionReviewValue("systems", { sourceRationale: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                </div>
              ) : null}

              <label className="mt-4 block">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[#475569]">
                  Add note or correction (optional)
                </span>
                <textarea
                  value={sectionReviews.systems.note}
                  onChange={(event) => setSectionReviewValue("systems", { note: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => saveSectionReview("systems")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#06B6D4] px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white"
                >
                  <Check size={13} />
                  {sectionReviews.systems.improveMode === "suggest_correction" || sectionReviews.systems.improveMode === "add_missing" ? "Submit suggestion" : "Save review"}
                </button>
              </div>
            </ReviewSection>

            <ReviewSection
              title="Trays"
              subtitle="Held tray data"
              status={sectionStatus.trays}
              open={openSections.trays}
              onToggle={() => toggleSection("trays")}
            >
              <div className="rounded-[18px] border border-[#D8E3EE] bg-white px-4 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0891B2]">Current linked data</p>
                {selectedSectionData.trays.items.length > 0 ? (
                  <div className="mt-3 space-y-2 text-[15px] leading-6 text-[#475569]">
                    {selectedSectionData.trays.items.map((item) => (
                      <p key={item.label}>
                        <span className="font-semibold text-[#10243E]">{item.label}:</span> {item.value}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] leading-6 text-[#475569]">{selectedSectionData.trays.empty_state || "No linked tray data currently held"}</p>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-[17px] font-semibold text-[#10243E]">Is this section correct?</p>
                <ValidationChoices
                  value={sectionReviews.trays.answer}
                  onChange={(value) => setSectionReviewValue("trays", { answer: value, issue: value === "incorrect" ? sectionReviews.trays.issue : "" })}
                />
              </div>

              {sectionReviews.trays.answer === "incorrect" ? (
                <fieldset className="mt-4 block">
                  <legend className="text-[13px] font-semibold text-[#475569]">What is wrong?</legend>
                  <div className="mt-2 grid gap-2">
                    {INCORRECT_REASON_OPTIONS.map((option) => (
                      <label key={option.value} className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#D8E3EE] bg-white px-4 py-2 text-[15px] text-[#334155]">
                        <input
                          type="radio"
                          name="trays_incorrect_reason"
                          checked={sectionReviews.trays.issue === option.value}
                          onChange={() => setSectionReviewValue("trays", { issue: option.value })}
                          className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {sectionReviews.trays.answer === "incorrect" ? (
                <fieldset className="mt-4 block">
                  <legend className="text-[13px] font-semibold text-[#475569]">Help improve this section</legend>
                  <div className="mt-2 grid gap-2">
                    {[
                      { value: "suggest_correction" as const, label: "Suggest correction" },
                      { value: "add_missing" as const, label: "Add missing data" },
                      { value: "flag_only" as const, label: "Flag only" },
                    ].map((option) => (
                      <label key={option.value} className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#D8E3EE] bg-white px-4 py-2 text-[15px] text-[#334155]">
                        <input
                          type="radio"
                          name="trays_improve_mode"
                          checked={sectionReviews.trays.improveMode === option.value}
                          onChange={() => setSectionReviewValue("trays", { improveMode: option.value })}
                          className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {sectionReviews.trays.improveMode === "suggest_correction" || sectionReviews.trays.improveMode === "add_missing" ? (
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Tray name</span>
                    <input
                      value={sectionReviews.trays.trayName}
                      onChange={(event) => setSectionReviewValue("trays", { trayName: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Tray type / category (optional)</span>
                    <input
                      value={sectionReviews.trays.trayCategory}
                      onChange={(event) => setSectionReviewValue("trays", { trayCategory: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Supplier (optional)</span>
                    <input
                      value={sectionReviews.trays.traySupplier}
                      onChange={(event) => setSectionReviewValue("trays", { traySupplier: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                </div>
              ) : null}

              <label className="mt-4 block">
                <span className="text-[13px] font-semibold text-[#475569]">Add note or correction (optional)</span>
                <textarea
                  value={sectionReviews.trays.note}
                  onChange={(event) => setSectionReviewValue("trays", { note: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => saveSectionReview("trays")} className="inline-flex items-center gap-1.5 rounded-full bg-[#06B6D4] px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
                  <Check size={13} />
                  {sectionReviews.trays.improveMode === "suggest_correction" || sectionReviews.trays.improveMode === "add_missing" ? "Submit suggestion" : "Save review"}
                </button>
              </div>
            </ReviewSection>

            <ReviewSection
              title="SKUs"
              subtitle="Held SKU data"
              status={sectionStatus.skus}
              open={openSections.skus}
              onToggle={() => toggleSection("skus")}
            >
              <div className="rounded-[18px] border border-[#D8E3EE] bg-white px-4 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0891B2]">Current linked data</p>
                {selectedSectionData.skus.items.length > 0 ? (
                  <div className="mt-3 space-y-2 text-[15px] leading-6 text-[#475569]">
                    {selectedSectionData.skus.items.map((item) => (
                      <p key={item.label}>
                        <span className="font-semibold text-[#10243E]">{item.label}:</span> {item.value}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[15px] leading-6 text-[#475569]">{selectedSectionData.skus.empty_state || "No linked SKU data currently held"}</p>
                )}
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-[17px] font-semibold text-[#10243E]">Is this section correct?</p>
                <ValidationChoices
                  value={sectionReviews.skus.answer}
                  onChange={(value) => setSectionReviewValue("skus", { answer: value, issue: value === "incorrect" ? sectionReviews.skus.issue : "" })}
                />
              </div>

              {sectionReviews.skus.answer === "incorrect" ? (
                <fieldset className="mt-4 block">
                  <legend className="text-[13px] font-semibold text-[#475569]">What is wrong?</legend>
                  <div className="mt-2 grid gap-2">
                    {INCORRECT_REASON_OPTIONS.map((option) => (
                      <label key={option.value} className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#D8E3EE] bg-white px-4 py-2 text-[15px] text-[#334155]">
                        <input
                          type="radio"
                          name="skus_incorrect_reason"
                          checked={sectionReviews.skus.issue === option.value}
                          onChange={() => setSectionReviewValue("skus", { issue: option.value })}
                          className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {sectionReviews.skus.answer === "incorrect" ? (
                <fieldset className="mt-4 block">
                  <legend className="text-[13px] font-semibold text-[#475569]">Help improve this section</legend>
                  <div className="mt-2 grid gap-2">
                    {[
                      { value: "suggest_correction" as const, label: "Suggest correction" },
                      { value: "add_missing" as const, label: "Add missing data" },
                      { value: "flag_only" as const, label: "Flag only" },
                    ].map((option) => (
                      <label key={option.value} className="flex min-h-[48px] items-center gap-3 rounded-[16px] border border-[#D8E3EE] bg-white px-4 py-2 text-[15px] text-[#334155]">
                        <input
                          type="radio"
                          name="skus_improve_mode"
                          checked={sectionReviews.skus.improveMode === option.value}
                          onChange={() => setSectionReviewValue("skus", { improveMode: option.value })}
                          className="h-4 w-4 border-slate-300 text-[#06B6D4] focus:ring-[#06B6D4]"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {sectionReviews.skus.improveMode === "suggest_correction" || sectionReviews.skus.improveMode === "add_missing" ? (
                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">SKU / product code</span>
                    <input
                      value={sectionReviews.skus.skuCode}
                      onChange={(event) => setSectionReviewValue("skus", { skuCode: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Product name</span>
                    <input
                      value={sectionReviews.skus.productName}
                      onChange={(event) => setSectionReviewValue("skus", { productName: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[13px] font-semibold text-[#475569]">Category (optional)</span>
                    <input
                      value={sectionReviews.skus.skuCategory}
                      onChange={(event) => setSectionReviewValue("skus", { skuCategory: event.target.value })}
                      className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                    />
                  </label>
                </div>
              ) : null}

              <label className="mt-4 block">
                <span className="text-[13px] font-semibold text-[#475569]">Add note or correction (optional)</span>
                <textarea
                  value={sectionReviews.skus.note}
                  onChange={(event) => setSectionReviewValue("skus", { note: event.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-[16px] border border-[#D8E3EE] bg-white px-3 py-2.5 text-[16px] text-[#334155] outline-none"
                />
              </label>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => saveSectionReview("skus")} className="inline-flex items-center gap-1.5 rounded-full bg-[#06B6D4] px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.12em] text-white">
                  <Check size={13} />
                  {sectionReviews.skus.improveMode === "suggest_correction" || sectionReviews.skus.improveMode === "add_missing" ? "Submit suggestion" : "Save review"}
                </button>
              </div>
            </ReviewSection>

            <ReviewSection
              title="Cards"
              subtitle="Linked card content"
              open={openSections.cards}
              onToggle={() => toggleSection("cards")}
            >
              <div className="rounded-[18px] border border-[#D8E3EE] bg-white px-4 py-3">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#0891B2]">Current linked data</p>
                <p className="mt-3 text-[15px] leading-6 text-[#475569]">No linked cards are shown for this record yet.</p>
              </div>
            </ReviewSection>

            <ReviewSection
              title="Reviews"
              subtitle={`${selectedHistory.reviewHistory.length} recorded`}
              open={openSections.reviews}
              onToggle={() => toggleSection("reviews")}
            >
              <div className="mt-3 overflow-hidden rounded-[16px] border border-[#D8E3EE] bg-white">
                <div className="grid grid-cols-[1.2fr,1fr,1fr] gap-2 border-b border-[#E2E8F0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  <span>Reviewer</span>
                  <span>Outcome</span>
                  <span>Date</span>
                </div>
                {selectedHistory.reviewHistory.length > 0 ? (
                  selectedHistory.reviewHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={`${entry.actor}-${entry.reviewed_at}-${index}`} className="grid grid-cols-[1.2fr,1fr,1fr] gap-2 border-b border-[#EEF2F7] px-3 py-2 text-[13px] text-[#334155] last:border-b-0">
                        <span>{entry.actor}</span>
                        <span>{entry.outcome.replaceAll("_", " ")}</span>
                        <span>{new Date(entry.reviewed_at).toLocaleDateString("en-GB")}</span>
                      </div>
                    ))
                ) : (
                  <p className="px-3 py-3 text-[13px] text-[#64748B]">No reviews yet.</p>
                )}
              </div>
            </ReviewSection>

            <ReviewSection
              title="Revisions"
              subtitle={`${selectedHistory.revisionHistory.length} recorded`}
              open={openSections.revisions}
              onToggle={() => toggleSection("revisions")}
            >
              <div className="mt-3 overflow-hidden rounded-[16px] border border-[#D8E3EE] bg-white">
                <div className="grid grid-cols-[1fr,1.4fr,1fr] gap-2 border-b border-[#E2E8F0] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                  <span>Revised by</span>
                  <span>Change</span>
                  <span>Date</span>
                </div>
                {selectedHistory.revisionHistory.length > 0 ? (
                  selectedHistory.revisionHistory
                    .slice()
                    .reverse()
                    .map((entry, index) => (
                      <div key={`${entry.actor}-${entry.revised_at}-${index}`} className="grid grid-cols-[1fr,1.4fr,1fr] gap-2 border-b border-[#EEF2F7] px-3 py-2 text-[13px] text-[#334155] last:border-b-0">
                        <span>{entry.actor}</span>
                        <span>{entry.summary}</span>
                        <span>{new Date(entry.revised_at).toLocaleDateString("en-GB")}</span>
                      </div>
                    ))
                ) : (
                  <p className="px-3 py-3 text-[13px] text-[#64748B]">No revisions yet.</p>
                )}
              </div>
            </ReviewSection>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  )
}
