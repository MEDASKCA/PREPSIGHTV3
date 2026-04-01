"use client"

import { useState } from "react"
import { AlertTriangle, Check, CheckCircle2, ClipboardCheck, Copy, Mail, MessageSquare, X } from "lucide-react"
import type { Section } from "@/lib/types"
import { saveCollectionRun, type CollectionRunEntry } from "@/lib/firestore"

const REASONS = [
  "Out of stock",
  "Not required for this case",
  "Substituted with alternative",
  "Awaiting confirmation",
  "Other",
]

interface Props {
  sections: Section[]
  checkedItems: Set<string>
  procedureId: string
  procedureName: string
  variantName?: string
  uid: string | null
  isDark: boolean
}

export default function CollectionPanel({
  sections,
  checkedItems,
  procedureId,
  procedureName,
  variantName,
  uid,
  isDark,
}: Props) {
  const [reviewing, setReviewing] = useState(false)
  const [entries, setEntries] = useState<CollectionRunEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  const allItems = sections.flatMap((s) =>
    s.items.map((item) => ({ item, sectionTitle: s.title })),
  )
  const total = allItems.length
  if (total === 0) return null

  const collectedItems = allItems.filter(({ item }) => checkedItems.has(item.id))
  const uncollectedItems = allItems.filter(({ item }) => !checkedItems.has(item.id))
  const done = collectedItems.length
  const allDone = done === total
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  function startReview() {
    setEntries(
      uncollectedItems.map(({ item, sectionTitle }) => ({
        itemName: item.name,
        sectionTitle,
        reason: REASONS[0],
        note: "",
      })),
    )
    setSaved(false)
    setReviewing(true)
  }

  function buildReportText(): string {
    const date = new Date().toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    })
    const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    const lines = [
      `Case Collection Report`,
      `Procedure: ${procedureName}${variantName ? ` — ${variantName}` : ""}`,
      `Date: ${date} at ${time}`,
      `Collected: ${done}/${total} items (${pct}%)`,
      "",
    ]
    if (entries.length > 0) {
      lines.push("Items not collected:")
      entries.forEach((e) => {
        lines.push(`• ${e.itemName} [${e.sectionTitle}]`)
        lines.push(`  Reason: ${e.reason}${e.note ? ` — ${e.note}` : ""}`)
      })
    } else {
      lines.push("✓ All items collected.")
    }
    lines.push("", "Sent via PrepSight")
    return lines.join("\n")
  }

  function handleCopy() {
    void navigator.clipboard.writeText(buildReportText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Case Collection — ${procedureName}`)
    const body = encodeURIComponent(buildReportText())
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  function handleTeams() {
    const msg = encodeURIComponent(buildReportText())
    window.open(`https://teams.microsoft.com/l/chat/0/0?users=&message=${msg}`)
  }

  async function handleSaveAudit() {
    if (saving || saved) return
    setSaving(true)
    await saveCollectionRun({
      procedureId,
      procedureName,
      variantName,
      uid: uid ?? "anonymous",
      submittedAt: new Date().toISOString(),
      totalItems: total,
      collectedCount: done,
      collectedItems: collectedItems.map(({ item }) => item.name),
      uncollectedItems: entries,
    })
    setSaving(false)
    setSaved(true)
  }

  const cardBg  = isDark ? "bg-[#111E30] border-[#334155]"  : "bg-white border-[#D5DCE3]"
  const mutedTx = isDark ? "text-[#94a3b8]"                  : "text-[#64748b]"
  const bodyTx  = isDark ? "text-white"                       : "text-[#10243E]"
  const inputCls = `w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] ${isDark ? "border-[#334155] bg-[#1A2840] text-white placeholder:text-[#334155]" : "border-[#D5DCE3] bg-white text-[#3F4752] placeholder:text-[#D5DCE3]"}`

  /* ── Summary bar ─────────────────────────────────────────────────────────── */
  if (!reviewing) {
    return (
      <div className={`border-t ${isDark ? "border-[#334155]" : "border-[#D5DCE3]"}`}>
        {/* Progress bar */}
        <div className={`h-1 ${isDark ? "bg-[#1A2840]" : "bg-[#EEF2F6]"}`}>
          <div
            className="h-1 bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-4 lg:px-7 lg:py-5">
          {allDone
            ? <CheckCircle2 size={20} className="shrink-0 text-emerald-500" />
            : <AlertTriangle size={20} className="shrink-0 text-amber-500" />
          }
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${allDone ? "text-emerald-600" : bodyTx}`}>
              {allDone ? `All ${total} items collected` : `${done} of ${total} items collected`}
            </p>
            {!allDone && (
              <p className={`text-xs mt-0.5 ${mutedTx}`}>
                {uncollectedItems.length} item{uncollectedItems.length !== 1 ? "s" : ""} not yet checked
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={startReview}
            className="shrink-0 rounded-xl bg-[#4DA3FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2F8EF7] transition-colors"
          >
            {allDone ? "Complete & Share" : "Review & Complete"}
          </button>
        </div>
      </div>
    )
  }

  /* ── Review panel ────────────────────────────────────────────────────────── */
  return (
    <div className={`border-t ${isDark ? "border-[#334155]" : "border-[#D5DCE3]"}`}>
      <div className="px-4 py-5 space-y-6 lg:px-7 lg:py-7">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="text-[#4DA3FF]" />
            <h3 className={`text-base font-bold ${bodyTx}`}>Collection Summary</h3>
          </div>
          <button
            type="button"
            onClick={() => setReviewing(false)}
            className={`rounded-full p-1.5 hover:bg-black/5 transition-colors ${mutedTx}`}
            aria-label="Close review"
          >
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-600">
            <Check size={14} /> {done} collected
          </span>
          {entries.length > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600">
              <AlertTriangle size={14} /> {entries.length} not collected
            </span>
          )}
        </div>

        {/* Uncollected items with reasons */}
        {entries.length > 0 && (
          <div className="space-y-3">
            <p className={`text-[11px] uppercase tracking-widest font-semibold ${mutedTx}`}>
              Items not collected — reason required
            </p>
            {entries.map((entry, i) => (
              <div key={`${entry.itemName}-${i}`} className={`rounded-2xl border p-4 space-y-3 ${cardBg}`}>
                <div>
                  <p className={`text-sm font-semibold leading-snug ${bodyTx}`}>{entry.itemName}</p>
                  <p className={`text-xs mt-0.5 ${mutedTx}`}>{entry.sectionTitle}</p>
                </div>
                <select
                  value={entry.reason}
                  onChange={(e) => {
                    const next = [...entries]
                    next[i] = { ...next[i], reason: e.target.value }
                    setEntries(next)
                  }}
                  className={inputCls}
                >
                  {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <input
                  type="text"
                  value={entry.note}
                  onChange={(e) => {
                    const next = [...entries]
                    next[i] = { ...next[i], note: e.target.value }
                    setEntries(next)
                  }}
                  placeholder="Additional note (optional)"
                  className={inputCls}
                />
              </div>
            ))}
          </div>
        )}

        {/* Share */}
        <div className="space-y-2.5">
          <p className={`text-[11px] uppercase tracking-widest font-semibold ${mutedTx}`}>Share report</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${isDark ? "border-[#334155] text-white hover:bg-white/6" : "border-[#D5DCE3] text-[#3F4752] hover:bg-[#F4F7FA]"}`}
            >
              <Copy size={14} /> {copied ? "Copied!" : "Copy text"}
            </button>
            <button
              type="button"
              onClick={handleEmail}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors ${isDark ? "border-[#334155] text-white hover:bg-white/6" : "border-[#D5DCE3] text-[#3F4752] hover:bg-[#F4F7FA]"}`}
            >
              <Mail size={14} /> Email
            </button>
            <button
              type="button"
              onClick={handleTeams}
              className="flex items-center gap-1.5 rounded-xl bg-[#5B5EA6] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[#4A4D8F] transition-colors"
            >
              <MessageSquare size={14} /> Teams
            </button>
          </div>
        </div>

        {/* Save to audit */}
        <button
          type="button"
          onClick={() => void handleSaveAudit()}
          disabled={saving || saved}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-colors ${
            saved
              ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
              : saving
                ? "bg-[#4DA3FF]/60 text-white cursor-wait"
                : "bg-[#10243E] text-white hover:bg-[#1a3558]"
          }`}
        >
          <ClipboardCheck size={16} />
          {saved ? "Saved to audit log" : saving ? "Saving…" : "Save to audit log"}
        </button>

      </div>
    </div>
  )
}
