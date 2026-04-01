"use client"

import { useState, useMemo, useRef } from "react"
import { Check, ChevronDown, ChevronRight, Minus, Plus, AlertTriangle, RotateCcw } from "lucide-react"
import { getStockForSystem, getStockStatus, StockItem, StockStatus } from "@/lib/stockroom-data"
import { db } from "@/lib/firebase"
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { getProfile } from "@/lib/profile"
import { getContributionIdentity } from "@/lib/team-workspaces"

interface CheckRow {
  id: string
  physicalQty: number
  verified: boolean
}

interface SubmitResult {
  by: string
  at: string
  verifiedCount: number
  adjustedCount: number
  total: number
}

interface Props {
  implantSystem: string
  procedureId: string
  procedureName: string
  uid: string | null
}

type ColKey = "size" | "sku" | "loc" | "status" | "qty" | "hist"
const LS_KEY = "prepsight:implant-col-widths-v3"
const DEFAULT_COL_WIDTHS: Record<ColKey, number> = {
  size: 220, sku: 210, loc: 220, status: 148, qty: 172, hist: 300,
}
const CHECKBOX_W = 52

function readStoredWidths(): Record<ColKey, number> {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null
    if (raw) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_COL_WIDTHS
}

function statusBadge(s: StockStatus) {
  if (s === "Out")      return <span className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-red-100 text-red-700 lg:text-[20px] lg:px-3 lg:py-1">Out</span>
  if (s === "Critical") return <span className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-red-50 text-red-600 lg:text-[20px] lg:px-3 lg:py-1">Critical</span>
  if (s === "Low")      return <span className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-700 lg:text-[20px] lg:px-3 lg:py-1">Low</span>
  return null
}

function worstGroupStatus(items: StockItem[], checks: CheckRow[]): StockStatus {
  const statuses = items.map((item) => {
    const c = checks.find((r) => r.id === item.id)
    return getStockStatus(c ? c.physicalQty : item.qty, item.par)
  })
  if (statuses.includes("Out"))      return "Out"
  if (statuses.includes("Critical")) return "Critical"
  if (statuses.includes("Low"))      return "Low"
  return "OK"
}

function formatName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0]
  return `${parts[0][0]}. ${parts[parts.length - 1]}`
}

export default function ImplantCheckPanel({ implantSystem, procedureId, procedureName, uid }: Props) {
  const stockItems = useMemo(() => getStockForSystem(implantSystem), [implantSystem])

  const [expanded, setExpanded] = useState(false)
  const [checks, setChecks] = useState<CheckRow[]>(() =>
    stockItems.map((item) => ({ id: item.id, physicalQty: item.qty, verified: false })),
  )
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  // Resizable columns — persisted to localStorage
  const [colWidths, setColWidths] = useState<Record<ColKey, number>>(readStoredWidths)
  const colWidthsRef = useRef<Record<ColKey, number>>(readStoredWidths())

  function startColResize(col: ColKey, e: React.MouseEvent) {
    e.preventDefault()
    const startX = e.clientX
    const startW = colWidthsRef.current[col]
    function onMove(ev: MouseEvent) {
      const newW = Math.max(72, startW + (ev.clientX - startX))
      colWidthsRef.current = { ...colWidthsRef.current, [col]: newW }
      setColWidths({ ...colWidthsRef.current })
    }
    function onUp() {
      localStorage.setItem(LS_KEY, JSON.stringify(colWidthsRef.current))
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  // Derive unique groups in order
  const groups = useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of stockItems) {
      if (item.group && !seen.has(item.group)) {
        seen.add(item.group)
        out.push(item.group)
      }
    }
    return out
  }, [stockItems])

  const verifiedCount = checks.filter((c) => c.verified).length
  const adjustedCount = checks.filter((c) => {
    const item = stockItems.find((i) => i.id === c.id)
    return item && c.physicalQty !== item.qty
  }).length

  function getCheck(id: string): CheckRow {
    return checks.find((c) => c.id === id)!
  }

  function toggleVerified(id: string) {
    setChecks((prev) => prev.map((c) => (c.id === id ? { ...c, verified: !c.verified } : c)))
  }

  function adjustQty(id: string, delta: number) {
    setChecks((prev) =>
      prev.map((c) => (c.id === id ? { ...c, physicalQty: Math.max(0, c.physicalQty + delta), verified: true } : c)),
    )
  }

  function resetCheck() {
    setResult(null)
    setChecks(stockItems.map((item) => ({ id: item.id, physicalQty: item.qty, verified: false })))
  }

  async function handleSubmit() {
    setSubmitting(true)
    const profile = getProfile()
    const by = getContributionIdentity(profile, "public")
    const now = new Date()
    const at = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
      " · " + now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

    try {
      if (db) {
        await addDoc(collection(db, "implant_checks"), {
          procedureId,
          procedureName,
          implantSystem,
          uid,
          submittedBy: by,
          submittedAt: serverTimestamp(),
          items: checks.map((c) => {
            const item = stockItems.find((i) => i.id === c.id)!
            return {
              id: c.id,
              sku: item.sku,
              label: `${item.group ?? ""} — ${item.name}`,
              verified: c.verified,
              stockQty: item.qty,
              physicalQty: c.physicalQty,
              adjusted: c.physicalQty !== item.qty,
            }
          }),
        })

        const changed = checks.filter((c) => {
          const item = stockItems.find((i) => i.id === c.id)!
          return c.physicalQty !== item.qty
        })
        for (const c of changed) {
          const item = stockItems.find((i) => i.id === c.id)!
          await setDoc(
            doc(db, "stockroom_items", item.sku),
            { qty: c.physicalQty, lastEdit: { by, uid, updatedAt: serverTimestamp() } },
            { merge: true },
          )
        }
      }

      setResult({ by, at, verifiedCount, adjustedCount, total: checks.length })
      setExpanded(false)
    } catch (err) {
      console.warn("[PrepSight] Implant check save failed", err)
    } finally {
      setSubmitting(false)
    }
  }

  if (stockItems.length === 0) {
    return (
      <div className="mb-3 rounded-xl border border-[#D5DCE3] px-4 py-3">
        <p className="text-xs font-semibold text-[#3F4752]">Implant stock check</p>
        <p className="mt-1 text-xs text-[#94a3b8]">
          Stockroom not yet mapped for <span className="font-medium">{implantSystem}</span> — verify implant availability manually before knife-to-skin.
        </p>
      </div>
    )
  }

  // ── Submitted state ───────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 lg:border-emerald-500/20 lg:bg-emerald-500/10">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span className="text-sm font-semibold text-emerald-700">Implant check submitted</span>
            </div>
            <p className="text-[11px] text-emerald-600">By {result.by} · {result.at}</p>
            <p className="text-[11px] text-emerald-600">
              {result.verifiedCount}/{result.total} items verified
              {result.adjustedCount > 0 && ` · ${result.adjustedCount} qty updated in stockroom`}
            </p>
          </div>
          <button onClick={resetCheck} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 shrink-0">
            <RotateCcw size={11} /> Redo
          </button>
        </div>
      </div>
    )
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  const hasIssues = checks.some((c) => {
    const item = stockItems.find((i) => i.id === c.id)!
    const s = getStockStatus(c.physicalQty, item.par)
    return s === "Out" || s === "Critical"
  })

  // Shared desktop header row — rendered inside each group
  function DesktopColHeaders() {
    return (
      <div className="hidden lg:flex items-center border-t border-[#D5DCE3] bg-[#EEF2F6]">
        {/* Checkbox spacer */}
        <div className="shrink-0 border-r border-[#D5DCE3]" style={{ width: CHECKBOX_W }} />
        {/* Size */}
        <div className="relative flex items-center px-3 py-2 border-r border-[#D5DCE3] shrink-0" style={{ width: colWidths.size }}>
          <p className="text-[20px] font-semibold text-[#526579] leading-none">Size</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#4DA3FF] transition-colors z-10" onMouseDown={(e) => startColResize("size", e)} />
        </div>
        {/* Description — flex-1, adjusts with right panel */}
        <div className="flex items-center px-3 py-2 border-r border-[#D5DCE3] flex-1 min-w-0">
          <p className="text-[20px] font-semibold text-[#526579] leading-none">Description</p>
        </div>
        {/* SKU */}
        <div className="relative flex items-center px-3 py-2 border-r border-[#D5DCE3] shrink-0" style={{ width: colWidths.sku }}>
          <p className="text-[20px] font-semibold text-[#526579] leading-none">SKU</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#4DA3FF] transition-colors z-10" onMouseDown={(e) => startColResize("sku", e)} />
        </div>
        {/* Location */}
        <div className="relative flex items-center px-3 py-2 border-r border-[#D5DCE3] shrink-0" style={{ width: colWidths.loc }}>
          <p className="text-[20px] font-semibold text-[#526579] leading-none">Location</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#4DA3FF] transition-colors z-10" onMouseDown={(e) => startColResize("loc", e)} />
        </div>
        {/* Status */}
        <div className="relative flex items-center justify-center px-3 py-2 border-r border-[#D5DCE3] shrink-0" style={{ width: colWidths.status }}>
          <p className="text-[20px] font-semibold text-[#526579] leading-none">Status</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#4DA3FF] transition-colors z-10" onMouseDown={(e) => startColResize("status", e)} />
        </div>
        {/* Qty */}
        <div className="relative flex items-center justify-center px-3 py-2 border-r border-[#D5DCE3] shrink-0" style={{ width: colWidths.qty }}>
          <p className="text-[20px] font-semibold text-[#526579] leading-none">Qty</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#4DA3FF] transition-colors z-10" onMouseDown={(e) => startColResize("qty", e)} />
        </div>
        {/* History — no resize handle on last col */}
        <div className="flex items-center px-3 py-2 shrink-0" style={{ width: colWidths.hist }}>
          <p className="text-[20px] font-semibold text-[#526579] leading-none">History</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3 rounded-xl border border-[#D5DCE3] overflow-hidden">

      {/* Collapsed header */}
      <div className="flex items-center bg-[#f8fafc]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center justify-between gap-3 px-4 py-3 text-left min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            {expanded ? <ChevronDown size={14} className="shrink-0 text-[#64748b]" /> : <ChevronRight size={14} className="shrink-0 text-[#64748b]" />}
            <span className="text-sm font-semibold text-[#3F4752] lg:text-[20px]">Implant stock check</span>
            <span className="hidden lg:inline text-[16px] text-[#94a3b8] font-normal ml-0.5">— tick each item to verify · adjust qty if count differs</span>
            {hasIssues && !expanded && (
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {verifiedCount > 0 && (
              <span className="text-[11px] text-[#64748b] lg:text-[17px]">{verifiedCount}/{checks.length}</span>
            )}
            <span className="text-[11px] text-[#94a3b8] lg:text-[17px]">
              {groups.length} group{groups.length !== 1 ? "s" : ""} · {stockItems.length} items
            </span>
          </div>
        </button>

        {/* Info button — desktop only */}
        <div className="hidden lg:flex items-center pr-4 shrink-0 relative">
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            className="w-7 h-7 rounded-full border-2 border-[#94a3b8] flex items-center justify-center text-[#64748b] text-[14px] font-bold hover:bg-[#EEF2F6] transition-colors"
            aria-label="How this works"
          >
            i
          </button>
          {infoOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setInfoOpen(false)} />
              <div className="absolute right-0 top-9 z-20 w-80 rounded-xl border border-[#D5DCE3] bg-white shadow-xl p-4">
                <p className="text-[18px] font-semibold text-[#3F4752] mb-3">How Implant Stock Check works</p>
                <ol className="space-y-2 text-[16px] text-[#526579] list-decimal list-inside leading-snug">
                  <li>Expand the panel to see all implant groups and sizes</li>
                  <li>Go to the physical store and locate each item</li>
                  <li>Use the ± controls to adjust the quantity if the physical count differs — this automatically ticks the item as verified</li>
                  <li>Tick the checkbox manually to confirm items where the count already matches</li>
                  <li>Submit when done — any quantity discrepancies are written back to the stockroom</li>
                </ol>
                <button onClick={() => setInfoOpen(false)} className="mt-3 text-[14px] text-[#94a3b8] hover:text-[#526579]">Dismiss</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Expanded checklist */}
      {expanded && (
        <>
          {groups.map((group) => {
            const groupItems = stockItems.filter((i) => i.group === group)
            const allGroupVerified = groupItems.every((i) => getCheck(i.id).verified)

            return (
              <div key={group} className="border-t border-[#D5DCE3]">

                {/* Group name header */}
                <div className="flex items-center gap-1.5 px-4 py-2 bg-[#f0f4f8]">
                  {allGroupVerified && <Check size={12} className="text-emerald-500 shrink-0" />}
                  <span className="text-xs font-semibold text-[#526579] lg:text-[18px]">{group}</span>
                </div>

                {/* Desktop column headers — below group name */}
                <DesktopColHeaders />

                {/* Item rows */}
                {groupItems.map((item, itemIndex) => {
                  const c = getCheck(item.id)
                  const s = getStockStatus(c.physicalQty, item.par)
                  const changed = c.physicalQty !== item.qty
                  const rowBg = itemIndex % 2 === 0 ? "bg-white" : "bg-[#F4F7FA]"

                  return (
                    <div key={item.id} className={`border-t border-[#D5DCE3]/60 ${rowBg}`}>

                      {/* ── Mobile row ─────────────────────────────────── */}
                      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
                        <button
                          type="button"
                          onClick={() => toggleVerified(item.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${c.verified ? "bg-emerald-500 border-emerald-500" : "border-[#D5DCE3] hover:border-[#94a3b8]"}`}
                        >
                          {c.verified && <Check size={10} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#3F4752] leading-snug">{item.name}</p>
                          <p className="text-[11px] text-[#94a3b8] mt-0.5">{item.sku}</p>
                          {item.location && <p className="text-[11px] text-[#94a3b8] truncate">{item.location}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusBadge(s)}
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => adjustQty(item.id, -1)} disabled={c.physicalQty === 0} className="w-6 h-6 rounded-md border border-[#D5DCE3] flex items-center justify-center text-[#526579] hover:bg-[#f0f4f8] disabled:opacity-30 transition-colors">
                              <Minus size={10} />
                            </button>
                            <span className={`w-6 text-center text-sm font-semibold tabular-nums ${s === "Out" ? "text-red-600" : s === "Critical" ? "text-red-500" : s === "Low" ? "text-amber-600" : "text-[#3F4752]"}`}>{c.physicalQty}</span>
                            <button type="button" onClick={() => adjustQty(item.id, 1)} className="w-6 h-6 rounded-md border border-[#D5DCE3] flex items-center justify-center text-[#526579] hover:bg-[#f0f4f8] transition-colors">
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── Desktop row ────────────────────────────────── */}
                      <div className="hidden lg:flex items-center">

                        {/* Checkbox */}
                        <div className="flex items-center justify-center shrink-0 border-r border-[#D5DCE3] py-3" style={{ width: CHECKBOX_W }}>
                          <button
                            type="button"
                            onClick={() => toggleVerified(item.id)}
                            className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-colors ${c.verified ? "bg-emerald-500 border-emerald-500" : "border-[#D5DCE3] hover:border-[#94a3b8]"}`}
                          >
                            {c.verified && <Check size={14} className="text-white" />}
                          </button>
                        </div>

                        {/* Size */}
                        <div className="px-3 py-3 border-r border-[#D5DCE3] shrink-0 overflow-hidden" style={{ width: colWidths.size }}>
                          <p className="text-[20px] font-semibold text-[#3F4752] truncate">{item.name}</p>
                        </div>

                        {/* Description (item description + supplier) — flex-1, adjusts with right panel */}
                        <div className="px-3 py-3 border-r border-[#D5DCE3] flex-1 min-w-0 overflow-hidden">
                          <p className="text-[20px] text-[#3F4752] leading-snug truncate">{item.group ?? "—"}</p>
                          {item.supplier && (
                            <p className="text-[20px] text-[#94a3b8] mt-0.5 truncate">{item.supplier}</p>
                          )}
                        </div>

                        {/* SKU */}
                        <div className="px-3 py-3 border-r border-[#D5DCE3] shrink-0 overflow-hidden" style={{ width: colWidths.sku }}>
                          <p className="text-[20px] font-mono text-[#64748b] truncate">{item.sku}</p>
                        </div>

                        {/* Location */}
                        <div className="px-3 py-3 border-r border-[#D5DCE3] shrink-0 overflow-hidden" style={{ width: colWidths.loc }}>
                          <p className="text-[20px] font-medium text-[#526579] truncate">
                            {item.location
                              ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(" · ")
                              : "—"}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="px-3 py-3 border-r border-[#D5DCE3] shrink-0 flex flex-col items-center gap-1" style={{ width: colWidths.status }}>
                          {statusBadge(s)}
                          {changed && <span className="text-[14px] text-amber-600 font-medium">was {item.qty}</span>}
                        </div>

                        {/* Qty controls */}
                        <div className="px-3 py-3 border-r border-[#D5DCE3] shrink-0 flex items-center justify-center gap-2" style={{ width: colWidths.qty }}>
                          <button type="button" onClick={() => adjustQty(item.id, -1)} disabled={c.physicalQty === 0} className="w-9 h-9 rounded-lg border border-[#D5DCE3] flex items-center justify-center text-[#526579] hover:bg-[#f0f4f8] disabled:opacity-30 transition-colors">
                            <Minus size={15} />
                          </button>
                          <span className={`w-10 text-center text-[20px] font-semibold tabular-nums ${s === "Out" ? "text-red-600" : s === "Critical" ? "text-red-500" : s === "Low" ? "text-amber-600" : "text-[#3F4752]"}`}>
                            {c.physicalQty}
                          </span>
                          <button type="button" onClick={() => adjustQty(item.id, 1)} className="w-9 h-9 rounded-lg border border-[#D5DCE3] flex items-center justify-center text-[#526579] hover:bg-[#f0f4f8] transition-colors">
                            <Plus size={15} />
                          </button>
                        </div>

                        {/* History */}
                        <div className="px-3 py-3 shrink-0 overflow-hidden" style={{ width: colWidths.hist }}>
                          {item.history?.surgeon ? (
                            <p className="text-[20px] text-[#3F4752] leading-snug truncate">
                              <span className="text-[14px] uppercase tracking-wide text-[#94a3b8]">Last used </span>
                              {item.history.surgeon} · {item.history.usedDate}
                            </p>
                          ) : (
                            <p className="text-[20px] text-[#D5DCE3]">—</p>
                          )}
                          {item.history?.checkedBy ? (
                            <p className="text-[20px] text-[#526579] mt-1 leading-snug truncate">
                              <span className="text-[14px] uppercase tracking-wide text-[#94a3b8]">Checked </span>
                              {item.history.checkedBy} · {item.history.checkedDate}
                            </p>
                          ) : (
                            <p className="text-[20px] text-[#D5DCE3] mt-1">Not checked</p>
                          )}
                        </div>

                      </div>

                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Submit bar */}
          <div className="border-t border-[#D5DCE3] px-4 py-3 flex items-center justify-between gap-3 bg-[#f8fafc]">
            <p className="text-xs text-[#64748b] lg:text-[20px]">
              {verifiedCount === checks.length
                ? "All items verified"
                : `${verifiedCount} of ${checks.length} verified`}
              {adjustedCount > 0 && ` · ${adjustedCount} qty to update`}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || verifiedCount === 0}
              className="rounded-lg bg-[#4DA3FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2F8EF7] disabled:opacity-40 transition-colors shrink-0 lg:text-[18px] lg:px-6 lg:py-3"
            >
              {submitting ? "Saving…" : "Submit check"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
