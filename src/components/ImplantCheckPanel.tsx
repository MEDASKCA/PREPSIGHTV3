"use client"

import { useState, useMemo, useRef } from "react"
import { Check, Minus, Plus, AlertTriangle, RotateCcw } from "lucide-react"
import TriangleIcon from "@/components/TriangleIcon"
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
  if (s === "Out")      return <span className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-red-950 text-red-400 lg:text-[20px] lg:px-3 lg:py-1">Out</span>
  if (s === "Critical") return <span className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-red-950/70 text-red-400 lg:text-[20px] lg:px-3 lg:py-1">Critical</span>
  if (s === "Low")      return <span className="rounded-md px-2 py-0.5 text-[11px] font-bold bg-amber-950 text-amber-400 lg:text-[20px] lg:px-3 lg:py-1">Low</span>
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
      <div className="mb-3 flex items-center justify-center py-6">
        <div className="rounded-xl bg-[#1c1c1c] px-5 py-4 max-w-sm text-center">
          <p className="text-sm font-semibold text-[#e0e0e0]">Implant stock check</p>
          <p className="mt-1 text-xs text-[#888888]">
            Stockroom not yet mapped for <span className="font-medium text-[#aaaaaa]">{implantSystem}</span> — verify implant availability manually before knife-to-skin.
          </p>
        </div>
      </div>
    )
  }

  // ── Submitted state ───────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="mb-3 flex items-center justify-center py-4">
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/40 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Check size={14} className="text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-emerald-300">Implant check submitted</span>
              </div>
              <p className="text-[11px] text-emerald-500">By {result.by} · {result.at}</p>
              <p className="text-[11px] text-emerald-500">
                {result.verifiedCount}/{result.total} items verified
                {result.adjustedCount > 0 && ` · ${result.adjustedCount} qty updated in stockroom`}
              </p>
            </div>
            <button onClick={resetCheck} className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-300 shrink-0">
              <RotateCcw size={11} /> Redo
            </button>
          </div>
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

  function DesktopColHeaders() {
    return (
      <div className="hidden lg:flex items-center border-t border-[#2d2d2d] bg-[#161616]">
        <div className="shrink-0 border-r border-[#2d2d2d]" style={{ width: CHECKBOX_W }} />
        <div className="relative flex items-center px-3 py-2 border-r border-[#2d2d2d] shrink-0" style={{ width: colWidths.size }}>
          <p className="text-[20px] font-semibold text-[#888888] leading-none">Size</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#0096C7] transition-colors z-10" onMouseDown={(e) => startColResize("size", e)} />
        </div>
        <div className="flex items-center px-3 py-2 border-r border-[#2d2d2d] flex-1 min-w-0">
          <p className="text-[20px] font-semibold text-[#888888] leading-none">Description</p>
        </div>
        <div className="relative flex items-center px-3 py-2 border-r border-[#2d2d2d] shrink-0" style={{ width: colWidths.sku }}>
          <p className="text-[20px] font-semibold text-[#888888] leading-none">SKU</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#0096C7] transition-colors z-10" onMouseDown={(e) => startColResize("sku", e)} />
        </div>
        <div className="relative flex items-center px-3 py-2 border-r border-[#2d2d2d] shrink-0" style={{ width: colWidths.loc }}>
          <p className="text-[20px] font-semibold text-[#888888] leading-none">Location</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#0096C7] transition-colors z-10" onMouseDown={(e) => startColResize("loc", e)} />
        </div>
        <div className="relative flex items-center justify-center px-3 py-2 border-r border-[#2d2d2d] shrink-0" style={{ width: colWidths.status }}>
          <p className="text-[20px] font-semibold text-[#888888] leading-none">Status</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#0096C7] transition-colors z-10" onMouseDown={(e) => startColResize("status", e)} />
        </div>
        <div className="relative flex items-center justify-center px-3 py-2 border-r border-[#2d2d2d] shrink-0" style={{ width: colWidths.qty }}>
          <p className="text-[20px] font-semibold text-[#888888] leading-none">Qty</p>
          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#0096C7] transition-colors z-10" onMouseDown={(e) => startColResize("qty", e)} />
        </div>
        <div className="flex items-center px-3 py-2 shrink-0" style={{ width: colWidths.hist }}>
          <p className="text-[20px] font-semibold text-[#888888] leading-none">History</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-3">

      {/* Collapsed toggle — centered charcoal panel */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-3 rounded-xl bg-[#1c1c1c] px-5 py-3 text-left transition-colors hover:bg-[#252525]"
          >
            <TriangleIcon
              direction={expanded ? "down" : "right"}
              size={10}
              className="shrink-0 text-[#0096C7]"
            />
            <span className="text-sm font-semibold text-[#e0e0e0] lg:text-[20px]">Implant stock check</span>
            <span className="hidden lg:inline text-[16px] text-[#555555] font-normal">— tick each item to verify · adjust qty if count differs</span>
            {hasIssues && !expanded && (
              <AlertTriangle size={13} className="text-amber-500 shrink-0" />
            )}
            <div className="flex items-center gap-2 shrink-0">
              {verifiedCount > 0 && (
                <span className="text-[11px] text-[#888888] lg:text-[17px]">{verifiedCount}/{checks.length}</span>
              )}
              <span className="text-[11px] text-[#555555] lg:text-[17px]">
                {groups.length} group{groups.length !== 1 ? "s" : ""} · {stockItems.length} items
              </span>
            </div>
          </button>

          {/* Info button — desktop only */}
          <div className="hidden lg:flex items-center shrink-0 relative">
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              className="w-7 h-7 rounded-full border-2 border-[#2d2d2d] flex items-center justify-center text-[#888888] text-[14px] font-bold hover:border-[#0096C7] hover:text-[#0096C7] transition-colors"
              aria-label="How this works"
            >
              i
            </button>
            {infoOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setInfoOpen(false)} />
                <div className="absolute left-9 top-0 z-20 w-80 rounded-xl border border-[#2d2d2d] bg-[#1c1c1c] shadow-xl p-4">
                  <p className="text-[18px] font-semibold text-[#e0e0e0] mb-3">How Implant Stock Check works</p>
                  <ol className="space-y-2 text-[16px] text-[#888888] list-decimal list-inside leading-snug">
                    <li>Expand the panel to see all implant groups and sizes</li>
                    <li>Go to the physical store and locate each item</li>
                    <li>Use the ± controls to adjust the quantity if the physical count differs — this automatically ticks the item as verified</li>
                    <li>Tick the checkbox manually to confirm items where the count already matches</li>
                    <li>Submit when done — any quantity discrepancies are written back to the stockroom</li>
                  </ol>
                  <button onClick={() => setInfoOpen(false)} className="mt-3 text-[14px] text-[#555555] hover:text-[#888888]">Dismiss</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded checklist — full width */}
      {expanded && (
        <>
          {groups.map((group) => {
            const groupItems = stockItems.filter((i) => i.group === group)
            const allGroupVerified = groupItems.every((i) => getCheck(i.id).verified)

            return (
              <div key={group} className="border-t border-[#2d2d2d]">

                {/* Group name header */}
                <div className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a]">
                  {allGroupVerified && <Check size={12} className="text-emerald-400 shrink-0" />}
                  <span className="text-xs font-semibold text-[#0096C7] lg:text-[18px]">{group}</span>
                </div>

                {/* Desktop column headers */}
                <DesktopColHeaders />

                {/* Item rows */}
                {groupItems.map((item, itemIndex) => {
                  const c = getCheck(item.id)
                  const s = getStockStatus(c.physicalQty, item.par)
                  const changed = c.physicalQty !== item.qty
                  const rowBg = itemIndex % 2 === 0 ? "bg-[#111111]" : "bg-[#141414]"

                  return (
                    <div key={item.id} className={`border-t border-[#2d2d2d]/60 ${rowBg}`}>

                      {/* ── Mobile row ─────────────────────────────────── */}
                      <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
                        <button
                          type="button"
                          onClick={() => toggleVerified(item.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${c.verified ? "bg-emerald-500 border-emerald-500" : "border-[#2d2d2d] hover:border-[#0096C7]"}`}
                        >
                          {c.verified && <Check size={10} className="text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#e0e0e0] leading-snug">{item.name}</p>
                          <p className="text-[11px] text-[#888888] mt-0.5">{item.sku}</p>
                          {item.location && <p className="text-[11px] text-[#888888] truncate">{item.location}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {statusBadge(s)}
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => adjustQty(item.id, -1)} disabled={c.physicalQty === 0} className="w-6 h-6 rounded-md border border-[#2d2d2d] flex items-center justify-center text-[#888888] hover:border-[#0096C7] hover:text-[#0096C7] disabled:opacity-30 transition-colors">
                              <Minus size={10} />
                            </button>
                            <span className={`w-6 text-center text-sm font-semibold tabular-nums ${s === "Out" ? "text-red-400" : s === "Critical" ? "text-red-400" : s === "Low" ? "text-amber-400" : "text-[#e0e0e0]"}`}>{c.physicalQty}</span>
                            <button type="button" onClick={() => adjustQty(item.id, 1)} className="w-6 h-6 rounded-md border border-[#2d2d2d] flex items-center justify-center text-[#888888] hover:border-[#0096C7] hover:text-[#0096C7] transition-colors">
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ── Desktop row ────────────────────────────────── */}
                      <div className="hidden lg:flex items-center">

                        {/* Checkbox */}
                        <div className="flex items-center justify-center shrink-0 border-r border-[#2d2d2d] py-3" style={{ width: CHECKBOX_W }}>
                          <button
                            type="button"
                            onClick={() => toggleVerified(item.id)}
                            className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-colors ${c.verified ? "bg-emerald-500 border-emerald-500" : "border-[#2d2d2d] hover:border-[#0096C7]"}`}
                          >
                            {c.verified && <Check size={14} className="text-white" />}
                          </button>
                        </div>

                        {/* Size */}
                        <div className="px-3 py-3 border-r border-[#2d2d2d] shrink-0 overflow-hidden" style={{ width: colWidths.size }}>
                          <p className="text-[20px] font-semibold text-[#e0e0e0] truncate">{item.name}</p>
                        </div>

                        {/* Description */}
                        <div className="px-3 py-3 border-r border-[#2d2d2d] flex-1 min-w-0 overflow-hidden">
                          <p className="text-[20px] text-[#e0e0e0] leading-snug truncate">{item.group ?? "—"}</p>
                          {item.supplier && (
                            <p className="text-[20px] text-[#555555] mt-0.5 truncate">{item.supplier}</p>
                          )}
                        </div>

                        {/* SKU */}
                        <div className="px-3 py-3 border-r border-[#2d2d2d] shrink-0 overflow-hidden" style={{ width: colWidths.sku }}>
                          <p className="text-[20px] font-mono text-[#888888] truncate">{item.sku}</p>
                        </div>

                        {/* Location */}
                        <div className="px-3 py-3 border-r border-[#2d2d2d] shrink-0 overflow-hidden" style={{ width: colWidths.loc }}>
                          <p className="text-[20px] font-medium text-[#aaaaaa] truncate">
                            {item.location
                              ? item.location.split("/").map((p) => p.trim()).filter(Boolean).join(" · ")
                              : "—"}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="px-3 py-3 border-r border-[#2d2d2d] shrink-0 flex flex-col items-center gap-1" style={{ width: colWidths.status }}>
                          {statusBadge(s)}
                          {changed && <span className="text-[14px] text-amber-400 font-medium">was {item.qty}</span>}
                        </div>

                        {/* Qty controls */}
                        <div className="px-3 py-3 border-r border-[#2d2d2d] shrink-0 flex items-center justify-center gap-2" style={{ width: colWidths.qty }}>
                          <button type="button" onClick={() => adjustQty(item.id, -1)} disabled={c.physicalQty === 0} className="w-9 h-9 rounded-lg border border-[#2d2d2d] flex items-center justify-center text-[#888888] hover:border-[#0096C7] hover:text-[#0096C7] disabled:opacity-30 transition-colors">
                            <Minus size={15} />
                          </button>
                          <span className={`w-10 text-center text-[20px] font-semibold tabular-nums ${s === "Out" ? "text-red-400" : s === "Critical" ? "text-red-400" : s === "Low" ? "text-amber-400" : "text-[#e0e0e0]"}`}>
                            {c.physicalQty}
                          </span>
                          <button type="button" onClick={() => adjustQty(item.id, 1)} className="w-9 h-9 rounded-lg border border-[#2d2d2d] flex items-center justify-center text-[#888888] hover:border-[#0096C7] hover:text-[#0096C7] transition-colors">
                            <Plus size={15} />
                          </button>
                        </div>

                        {/* History */}
                        <div className="px-3 py-3 shrink-0 overflow-hidden" style={{ width: colWidths.hist }}>
                          {item.history?.surgeon ? (
                            <p className="text-[20px] text-[#e0e0e0] leading-snug truncate">
                              <span className="text-[14px] tracking-wide text-[#555555]">Last used </span>
                              {item.history.surgeon} · {item.history.usedDate}
                            </p>
                          ) : (
                            <p className="text-[20px] text-[#333333]">—</p>
                          )}
                          {item.history?.checkedBy ? (
                            <p className="text-[20px] text-[#aaaaaa] mt-1 leading-snug truncate">
                              <span className="text-[14px] tracking-wide text-[#555555]">Checked </span>
                              {item.history.checkedBy} · {item.history.checkedDate}
                            </p>
                          ) : (
                            <p className="text-[20px] text-[#333333] mt-1">Not checked</p>
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
          <div className="border-t border-[#2d2d2d] px-4 py-3 flex items-center justify-between gap-3 bg-[#1a1a1a]">
            <p className="text-xs text-[#888888] lg:text-[20px]">
              {verifiedCount === checks.length
                ? "All items verified"
                : `${verifiedCount} of ${checks.length} verified`}
              {adjustedCount > 0 && ` · ${adjustedCount} qty to update`}
            </p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || verifiedCount === 0}
              className="rounded-lg bg-[#0096C7] px-4 py-2 text-xs font-semibold text-white hover:bg-[#007aa8] disabled:opacity-40 transition-colors shrink-0 lg:text-[18px] lg:px-6 lg:py-3"
            >
              {submitting ? "Saving…" : "Submit check"}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
