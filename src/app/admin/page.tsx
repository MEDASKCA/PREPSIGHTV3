"use client"

import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  X, Save, LogOut, CheckCircle, AlertCircle, ChevronDown, ChevronRight,
  Hospital, FileText, ImageIcon, BarChart2, Trash2, Plus, Check, RefreshCw,
  Upload, Database,
} from "lucide-react"
import { clearAdminSession, groupedContent, CONTENT_REGISTRY, type ContentEntry } from "@/lib/admin"
import {
  getAllAdminContent, saveAdminContent, deleteAdminContent,
  getFirestoreHospitals, addFirestoreHospital, approveFirestoreHospital, deleteFirestoreHospital,
  getFirestoreSurgeons, approveFirestoreSurgeon, deleteFirestoreSurgeon,
  type FirestoreHospital, type FirestoreSurgeon,
} from "@/lib/firestore"
import { auth, storage } from "@/lib/firebase"
import { procedures } from "@/lib/data"
import hospitalsSeed from "@/lib/hospitals.json"

// Firebase Storage (optional — only available when configured)
let uploadToStorage: ((file: File, path: string) => Promise<string>) | null = null
if (storage) {
  uploadToStorage = async (file: File, path: string) => {
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage")
    const storageRef = ref(storage!, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }
}

type Tab = "content" | "hospitals" | "surgeons" | "images" | "stats" | "csv"
const HOMEPAGE_IMAGES_KEY = "prepsight_homepage_images"

// ── Toast ─────────────────────────────────────────────────────────────────────
interface Toast { id: number; message: string; type: "ok" | "err" }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  function push(message: string, type: Toast["type"] = "ok") {
    const id = ++counter.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000)
  }

  return { toasts, push }
}

// ── Stat helpers ──────────────────────────────────────────────────────────────
function buildStats() {
  const settingMap: Record<string, number> = {}
  const specialtyMap: Record<string, number> = {}
  procedures.forEach((p) => {
    settingMap[p.setting]     = (settingMap[p.setting]     ?? 0) + 1
    specialtyMap[p.specialty] = (specialtyMap[p.specialty] ?? 0) + 1
  })
  return { settingMap, specialtyMap, total: procedures.length }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { toasts, push } = useToast()
  const [tab, setTab] = useState<Tab>("content")
  const [homepageImagesEnabled, setHomepageImagesEnabled] = useState(false)

  // Content state
  const [contentOverrides, setContentOverrides]   = useState<Record<string, string>>({})
  const [contentDrafts, setContentDrafts]         = useState<Record<string, string>>({})
  const [contentSaving, setContentSaving]         = useState<Record<string, boolean>>({})
  const [expandedPages, setExpandedPages]         = useState<Record<string, boolean>>({ Login: true })
  const [contentLoading, setContentLoading]       = useState(true)

  // Hospitals state
  const [fsHospitals, setFsHospitals]         = useState<FirestoreHospital[]>([])
  const [hospitalsLoading, setHospitalsLoading] = useState(false)
  const [newHospName, setNewHospName]           = useState("")
  const [newHospTrust, setNewHospTrust]         = useState("")
  const [hospAdding, setHospAdding]             = useState(false)

  // Surgeons state
  const [fsSurgeons, setFsSurgeons]           = useState<FirestoreSurgeon[]>([])
  const [surgeonsLoading, setSurgeonsLoading] = useState(false)

  // Images state
  const [imageUploading, setImageUploading] = useState<Record<string, boolean>>({})
  const [imageUrls, setImageUrls]           = useState<Record<string, string>>({})
  const fileRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    disclaimer:    useRef<HTMLInputElement>(null),
    "logo-medaskca": useRef<HTMLInputElement>(null),
    "ps-mark":     useRef<HTMLInputElement>(null),
  }

  const uid = auth?.currentUser?.uid ?? "admin"

  // ── Load content overrides ────────────────────────────────────────────────
  useEffect(() => {
    setContentLoading(true)
    getAllAdminContent()
      .then((data) => {
        setContentOverrides(data)
        setContentDrafts(data)
      })
      .finally(() => setContentLoading(false))
  }, [])

  // ── Load hospitals ────────────────────────────────────────────────────────
  function loadHospitals() {
    setHospitalsLoading(true)
    getFirestoreHospitals()
      .then(setFsHospitals)
      .finally(() => setHospitalsLoading(false))
  }

  // ── Load surgeons ─────────────────────────────────────────────────────────
  function loadSurgeons() {
    setSurgeonsLoading(true)
    getFirestoreSurgeons()
      .then(setFsSurgeons)
      .finally(() => setSurgeonsLoading(false))
  }

  useEffect(() => {
    if (tab === "hospitals") loadHospitals()
    if (tab === "surgeons")  loadSurgeons()
  }, [tab])

  useEffect(() => {
    if (typeof window === "undefined") return
    setHomepageImagesEnabled(window.localStorage.getItem(HOMEPAGE_IMAGES_KEY) === "true")
  }, [])

  // ── Content actions ───────────────────────────────────────────────────────
  async function saveContent(key: string) {
    const value = contentDrafts[key]
    if (value === undefined) return
    setContentSaving((s) => ({ ...s, [key]: true }))
    try {
      await saveAdminContent(uid, key, value)
      setContentOverrides((o) => ({ ...o, [key]: value }))
      push("Saved")
    } catch {
      push("Save failed", "err")
    } finally {
      setContentSaving((s) => ({ ...s, [key]: false }))
    }
  }

  async function resetContent(key: string) {
    try {
      await deleteAdminContent(key)
      setContentOverrides((o) => { const n = { ...o }; delete n[key]; return n })
      setContentDrafts((d) => { const n = { ...d }; delete n[key]; return n })
      push("Reset to default")
    } catch {
      push("Reset failed", "err")
    }
  }

  // ── Hospital actions ──────────────────────────────────────────────────────
  async function addHospital() {
    if (!newHospName.trim()) return
    setHospAdding(true)
    try {
      await addFirestoreHospital(uid, newHospName.trim(), newHospTrust.trim() || undefined)
      setNewHospName("")
      setNewHospTrust("")
      push("Hospital added — pending approval")
      loadHospitals()
    } catch {
      push("Failed to add hospital", "err")
    } finally {
      setHospAdding(false)
    }
  }

  async function approveHospital(id: string) {
    await approveFirestoreHospital(uid, id)
    push("Hospital approved")
    loadHospitals()
  }

  async function deleteHospital(id: string) {
    await deleteFirestoreHospital(id)
    push("Hospital removed")
    loadHospitals()
  }

  // ── Surgeon actions ───────────────────────────────────────────────────────
  async function approveSurgeon(id: string) {
    await approveFirestoreSurgeon(uid, id)
    push("Surgeon approved")
    loadSurgeons()
  }

  async function deleteSurgeon(id: string) {
    await deleteFirestoreSurgeon(id)
    push("Surgeon removed")
    loadSurgeons()
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  async function handleImageUpload(key: string, file: File) {
    if (!uploadToStorage) {
      push("Firebase Storage not configured", "err")
      return
    }
    setImageUploading((u) => ({ ...u, [key]: true }))
    try {
      const url = await uploadToStorage(file, `admin-images/${key}`)
      setImageUrls((u) => ({ ...u, [key]: url }))
      push("Image uploaded")
    } catch {
      push("Upload failed", "err")
    } finally {
      setImageUploading((u) => ({ ...u, [key]: false }))
    }
  }

  // ── Exit dev mode ─────────────────────────────────────────────────────────
  function exitDevMode() {
    clearAdminSession()
    router.replace("/")
  }

  function toggleHomepageImages() {
    if (typeof window === "undefined") return
    setHomepageImagesEnabled((current) => {
      const next = !current
      window.localStorage.setItem(HOMEPAGE_IMAGES_KEY, next ? "true" : "false")
      return next
    })
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = buildStats()
  const grouped = groupedContent()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">

      {/* Toast rack */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium shadow-xl ${
              t.type === "ok"
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-red-50 border border-red-200 text-red-600"
            }`}
          >
            {t.type === "ok" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#4DA3FF]/20 flex items-center justify-center">
            <span className="text-[10px] font-black text-[#4DA3FF]">PS</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">PrepSight</p>
            <p className="text-sm font-bold text-slate-900 leading-none">Dev Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleHomepageImages}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-400"
          >
            <ImageIcon size={13} />
            Homepage images: {homepageImagesEnabled ? "On" : "Off"}
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-400"
          >
            View homepage
          </button>
          <button
            onClick={exitDevMode}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-400"
          >
            <LogOut size={13} />
            Exit dev mode
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-6 flex gap-1 shrink-0 overflow-x-auto">
        {(
          [
            { id: "content",   label: "Content",   icon: FileText   },
            { id: "hospitals", label: "Hospitals",  icon: Hospital   },
            { id: "surgeons",  label: "Surgeons",   icon: BarChart2  },
            { id: "images",    label: "Images",     icon: ImageIcon  },
            { id: "stats",     label: "Data",       icon: BarChart2  },
            { id: "csv",       label: "CSV Editor",  icon: Database   },
          ] as { id: Tab; label: string; icon: React.ElementType }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === id
                ? "border-[#4DA3FF] text-[#4DA3FF]"
                : "border-transparent text-slate-500 hover:text-slate-400"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={`flex-1 overflow-y-auto px-6 py-6 w-full mx-auto ${tab === "csv" ? "max-w-none" : "max-w-3xl"}`}>

        {/* ── Content tab ────────────────────────────────────────────────── */}
        {tab === "content" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold">Page content</h2>
              {contentLoading && (
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <RefreshCw size={12} className="animate-spin" /> Loading overrides…
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 -mt-2 mb-4">
              Overrides are stored in Firestore and take precedence over the default values in code.
              Resetting reverts to the code default.
            </p>

            {Object.entries(grouped).map(([page, entries]) => (
              <ContentGroup
                key={page}
                page={page}
                entries={entries}
                drafts={contentDrafts}
                overrides={contentOverrides}
                saving={contentSaving}
                expanded={!!expandedPages[page]}
                onToggle={() => setExpandedPages((e) => ({ ...e, [page]: !e[page] }))}
                onChange={(key, val) => setContentDrafts((d) => ({ ...d, [key]: val }))}
                onSave={saveContent}
                onReset={resetContent}
              />
            ))}
          </div>
        )}

        {/* ── Hospitals tab ───────────────────────────────────────────────── */}
        {tab === "hospitals" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold mb-1">Hospitals</h2>
              <p className="text-xs text-slate-500">
                Seed hospitals come from <code className="text-[#4DA3FF]">hospitals.json</code> and are read-only.
                User-added hospitals below require approval before appearing in onboarding.
              </p>
            </div>

            {/* Add hospital */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Add hospital</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newHospName}
                  onChange={(e) => setNewHospName(e.target.value)}
                  placeholder="Hospital name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4DA3FF] transition-colors"
                />
                <input
                  type="text"
                  value={newHospTrust}
                  onChange={(e) => setNewHospTrust(e.target.value)}
                  placeholder="Trust / health system (optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4DA3FF] transition-colors"
                />
                <button
                  onClick={addHospital}
                  disabled={hospAdding || !newHospName.trim()}
                  className="flex items-center gap-2 bg-[#4DA3FF] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2F8EF7] transition-colors disabled:opacity-40"
                >
                  {hospAdding ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add hospital
                </button>
              </div>
            </div>

            {/* Firestore hospitals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500 uppercase tracking-widest">User-added ({fsHospitals.length})</p>
                <button
                  onClick={loadHospitals}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>
              {hospitalsLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : fsHospitals.length === 0 ? (
                <p className="text-sm text-slate-500">No user-added hospitals yet.</p>
              ) : (
                <div className="space-y-2">
                  {fsHospitals.map((h) => (
                    <div key={h.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{h.name}</p>
                        {h.trust && <p className="text-xs text-slate-500 truncate">{h.trust}</p>}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Added {new Date(h.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {h.approved ? " · Approved" : " · Pending"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!h.approved && (
                          <button
                            onClick={() => approveHospital(h.id)}
                            className="flex items-center gap-1 text-xs text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                          >
                            <Check size={12} /> Approve
                          </button>
                        )}
                        <button
                          onClick={() => deleteHospital(h.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seed hospitals count */}
            <div className="text-xs text-slate-400 border-t border-slate-200 pt-4">
              Seed: {(hospitalsSeed as { hospital: string }[]).length} hospitals loaded from hospitals.json
            </div>
          </div>
        )}

        {/* ── Surgeons tab ────────────────────────────────────────────────── */}
        {tab === "surgeons" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold mb-1">Surgeons</h2>
              <p className="text-xs text-slate-500">
                Surgeons are user-generated (Waze model). Review and approve submissions here.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 uppercase tracking-widest">Submissions ({fsSurgeons.length})</p>
              <button
                onClick={loadSurgeons}
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} /> Refresh
              </button>
            </div>

            {surgeonsLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : fsSurgeons.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                <p className="text-sm text-slate-500">No surgeon submissions yet.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Surgeons will appear here when users add them to procedure cards.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {fsSurgeons.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1a1a2a] flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#4DA3FF]">
                        {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.specialty}{s.grade ? ` · ${s.grade}` : ""}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {s.approved ? "Approved" : "Pending"} ·{" "}
                        {new Date(s.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!s.approved && (
                        <button
                          onClick={() => approveSurgeon(s.id)}
                          className="flex items-center gap-1 text-xs text-green-700 border border-green-200 px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <Check size={12} /> Approve
                        </button>
                      )}
                      <button
                        onClick={() => deleteSurgeon(s.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Images tab ──────────────────────────────────────────────────── */}
        {tab === "images" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold mb-1">Images</h2>
              <p className="text-xs text-slate-500">
                Upload replacement images to Firebase Storage.
                {!storage && (
                  <span className="text-amber-400"> Firebase Storage is not configured — uploads unavailable.</span>
                )}
              </p>
            </div>

            {(
              [
                { key: "disclaimer",     label: "Disclaimer image",      path: "/disclaimer.png",     note: "Shown on onboarding step 3" },
                { key: "logo-medaskca",  label: "MEDASKCA logo",         path: "/logo-medaskca.png",  note: "Shown on loading screen" },
                { key: "ps-mark",        label: "PrepSight mark",         path: "/ps-mark.png",        note: "Shown in mobile drawer header" },
              ] as { key: string; label: string; path: string; note: string }[]
            ).map(({ key, label, path, note }) => (
              <div key={key} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                    {imageUrls[key] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrls[key]} alt={label} className="w-full h-full object-contain" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={path} alt={label} className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 mb-0.5">{label}</p>
                    <p className="text-xs text-slate-500 mb-1">{note}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{path}</p>
                    {imageUrls[key] && (
                      <p className="text-[10px] text-[#4DA3FF] mt-1 truncate">Storage URL saved</p>
                    )}
                    <button
                      onClick={() => fileRefs[key]?.current?.click()}
                      disabled={!storage || imageUploading[key]}
                      className="mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-colors disabled:opacity-40"
                    >
                      {imageUploading[key]
                        ? <RefreshCw size={12} className="animate-spin" />
                        : <Upload size={12} />}
                      {imageUploading[key] ? "Uploading…" : "Upload replacement"}
                    </button>
                    <input
                      ref={fileRefs[key]}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(key, file)
                        e.target.value = ""
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats / Data tab ────────────────────────────────────────────── */}
        {tab === "stats" && (
          <div className="space-y-6">
            <h2 className="text-base font-bold">Data overview</h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Procedures",  value: stats.total },
                { label: "Settings",    value: Object.keys(stats.settingMap).length },
                { label: "Specialties", value: Object.keys(stats.specialtyMap).length },
                { label: "Seed hospitals", value: (hospitalsSeed as unknown[]).length },
                { label: "Content keys",   value: CONTENT_REGISTRY.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-2xl font-black text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Procedures by setting */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Procedures by setting</p>
              <div className="space-y-2">
                {Object.entries(stats.settingMap)
                  .sort(([, a], [, b]) => b - a)
                  .map(([setting, count]) => (
                    <div key={setting} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-400 truncate">{setting}</span>
                          <span className="text-xs text-slate-900 font-semibold ml-2 shrink-0">{count}</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#4DA3FF] rounded-full"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Procedures by specialty */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">Procedures by specialty</p>
              <div className="space-y-2">
                {Object.entries(stats.specialtyMap)
                  .sort(([, a], [, b]) => b - a)
                  .map(([spec, count]) => (
                    <div key={spec} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-400">{spec}</span>
                      <span className="text-xs text-slate-900 font-semibold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* All procedure IDs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-4">All procedures</p>
              <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                {procedures.map((p, index) => (
                  <div key={`${p.id}-${index}`} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-slate-400 shrink-0 w-48 truncate">{p.id}</span>
                    <span className="text-xs text-slate-400 truncate">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CSV Editor tab ─────────────────────────────────────────────── */}
        {tab === "csv" && <CsvTab />}
      </div>
    </div>
  )
}

// ── Content group sub-component ───────────────────────────────────────────────
interface ContentGroupProps {
  page:      string
  entries:   ContentEntry[]
  drafts:    Record<string, string>
  overrides: Record<string, string>
  saving:    Record<string, boolean>
  expanded:  boolean
  onToggle:  () => void
  onChange:  (key: string, val: string) => void
  onSave:    (key: string) => void
  onReset:   (key: string) => void
}

function ContentGroup({
  page, entries, drafts, overrides, saving, expanded, onToggle, onChange, onSave, onReset,
}: ContentGroupProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900">{page}</span>
          <span className="text-xs text-slate-500">{entries.length} fields</span>
          {entries.some((e) => overrides[e.key] !== undefined) && (
            <span className="text-[10px] bg-[#4DA3FF]/20 text-[#4DA3FF] px-2 py-0.5 rounded-full">
              {entries.filter((e) => overrides[e.key] !== undefined).length} overridden
            </span>
          )}
        </div>
        {expanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-200 divide-y divide-slate-100">
          {entries.map((entry) => {
            const isOverridden = overrides[entry.key] !== undefined
            const draft        = drafts[entry.key] ?? entry.defaultValue
            const isDirty      = draft !== (overrides[entry.key] ?? entry.defaultValue)

            return (
              <div key={entry.key} className="px-5 py-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">{entry.label}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{entry.key}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {isOverridden && (
                      <button
                        onClick={() => onReset(entry.key)}
                        className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors"
                      >
                        Reset default
                      </button>
                    )}
                    <button
                      onClick={() => onSave(entry.key)}
                      disabled={saving[entry.key] || !isDirty}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4DA3FF] text-white hover:bg-[#2F8EF7] transition-colors disabled:opacity-40"
                    >
                      {saving[entry.key]
                        ? <RefreshCw size={11} className="animate-spin" />
                        : <Save size={11} />}
                      Save
                    </button>
                  </div>
                </div>

                {entry.multiline ? (
                  <textarea
                    value={draft}
                    onChange={(e) => onChange(entry.key, e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 resize-none focus:outline-none focus:border-[#4DA3FF] transition-colors leading-relaxed placeholder:text-slate-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => onChange(entry.key, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#4DA3FF] transition-colors placeholder:text-slate-400"
                  />
                )}

                {!isOverridden && (
                  <p className="mt-1.5 text-[10px] text-slate-400">Using code default</p>
                )}
                {isOverridden && !isDirty && (
                  <p className="mt-1.5 text-[10px] text-[#4DA3FF]">Overridden in Firestore</p>
                )}
                {isDirty && (
                  <p className="mt-1.5 text-[10px] text-amber-400">Unsaved changes</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── CSV Editor sub-component ──────────────────────────────────────────────────

// ── Client-side CSV helpers ────────────────────────────────────────────────
function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  function parseLine(line: string): string[] {
    const result: string[] = []
    let current = "", inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
        else inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) { result.push(current); current = "" }
      else current += ch
    }
    result.push(current)
    return result
  }
  const lines = text.split("\n").filter(l => l.trim())
  if (!lines.length) return { headers: [], rows: [] }
  return { headers: parseLine(lines[0]), rows: lines.slice(1).map(parseLine) }
}

function serializeCsvText(headers: string[], rows: string[][]): string {
  function q(v: string) {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) return '"' + v.replace(/"/g, '""') + '"'
    return v
  }
  return [headers.map(q).join(","), ...rows.map(r => headers.map((_, i) => q(r[i] ?? "")).join(","))].join("\n")
}

const MAX_TABLE_ROWS = 500

// ── CsvTable component ─────────────────────────────────────────────────────
function CsvTable({
  initialCsv,
  onChange,
  readOnly = false,
  filterColumn,
}: {
  initialCsv: string
  onChange?: (csv: string) => void
  readOnly?: boolean
  filterColumn?: string  // column name to show a filter dropdown for
}) {
  // parsed only on mount — parent uses key prop to force remount on new data load
  const { headers, rows: initialRows } = useMemo(() => parseCsvText(initialCsv), [])  // eslint-disable-line react-hooks/exhaustive-deps
  const [rows, setRows] = useState<string[][]>(initialRows)
  const [filterValue, setFilterValue] = useState("")
  const [search, setSearch] = useState("")
  const [editingCell, setEditingCell] = useState<{ ri: number; ci: number } | null>(null)

  const emit = useCallback((next: string[][]) => {
    onChange?.(serializeCsvText(headers, next))
  }, [headers, onChange])

  const filterColIndex = filterColumn ? headers.indexOf(filterColumn) : -1

  const filterOptions = useMemo(() => {
    if (filterColIndex === -1) return []
    const vals = new Set(rows.map(r => r[filterColIndex] ?? "").filter(Boolean))
    return [...vals].sort()
  }, [rows, filterColIndex])

  // Rows with original indices, after applying filter + search
  const visibleRows = useMemo(() => {
    return rows
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => {
        if (filterValue && filterColIndex !== -1 && (row[filterColIndex] ?? "") !== filterValue) return false
        if (search) {
          const q = search.toLowerCase()
          return row.some(cell => cell.toLowerCase().includes(q))
        }
        return true
      })
  }, [rows, filterValue, filterColIndex, search])

  function updateCell(origIdx: number, ci: number, val: string) {
    const next = rows.map((r, i) => i === origIdx ? r.map((c, j) => j === ci ? val : c) : r)
    setRows(next); emit(next)
  }

  function addRow() {
    const next = [...rows, headers.map(() => "")]
    setRows(next); emit(next)
  }

  function deleteRow(origIdx: number) {
    const next = rows.filter((_, i) => i !== origIdx)
    setRows(next); emit(next)
  }

  if (!headers.length) return <div className="text-xs text-slate-400 py-6 text-center">No data loaded</div>

  const displayRows = visibleRows.slice(0, MAX_TABLE_ROWS)
  const truncated = visibleRows.length > MAX_TABLE_ROWS

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {filterOptions.length > 0 && (
          <select
            value={filterValue}
            onChange={e => setFilterValue(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4DA3FF] transition-colors"
          >
            <option value="">All {filterColumn?.replace(/_/g, " ")}s</option>
            {filterOptions.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search…"
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-[#4DA3FF] transition-colors w-48"
        />
        <span className="text-[10px] text-slate-400 ml-auto">
          {visibleRows.length !== rows.length ? `${visibleRows.length} of ${rows.length}` : rows.length} rows · {headers.length} columns
        </span>
      </div>

      <div className="overflow-auto max-h-[600px] border border-slate-200 rounded-xl">
        <table className="text-xs border-collapse w-full" style={{ minWidth: "max-content" }}>
          <thead className="sticky top-0 z-10 bg-slate-100">
            <tr>
              {!readOnly && <th className="w-7 border-b border-slate-200 border-r border-slate-200" />}
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200 border-r border-slate-200 last:border-r-0"
                  style={{ minWidth: 100 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map(({ row, i: origIdx }) => (
              <tr key={origIdx} className="group hover:bg-blue-50/40 border-b border-slate-100 last:border-b-0">
                {!readOnly && (
                  <td className="text-center align-middle px-1 border-r border-slate-100 w-7">
                    <button
                      onClick={() => deleteRow(origIdx)}
                      className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={10} />
                    </button>
                  </td>
                )}
                {headers.map((_, ci) => {
                  const isEditing = !readOnly && editingCell?.ri === origIdx && editingCell?.ci === ci
                  return (
                    <td key={ci} className="border-r border-slate-100 last:border-r-0 p-0 overflow-hidden" style={{ maxWidth: 260 }}>
                      {isEditing ? (
                        <input
                          autoFocus
                          value={row[ci] ?? ""}
                          onChange={e => updateCell(origIdx, ci, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          onKeyDown={e => {
                            if (e.key === "Escape") setEditingCell(null)
                            if (e.key === "Enter") setEditingCell(null)
                            if (e.key === "Tab") {
                              e.preventDefault()
                              const nextCi = e.shiftKey ? ci - 1 : ci + 1
                              if (nextCi >= 0 && nextCi < headers.length) setEditingCell({ ri: origIdx, ci: nextCi })
                              else setEditingCell(null)
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-slate-800 focus:outline-none border border-[#4DA3FF] rounded w-full block"
                        />
                      ) : (
                        <div
                          onClick={() => !readOnly && setEditingCell({ ri: origIdx, ci })}
                          title={row[ci] ?? ""}
                          className={`px-3 py-1.5 text-slate-800 truncate select-text${!readOnly ? " cursor-text hover:bg-blue-50/50" : ""}`}
                        >
                          {row[ci] ?? ""}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {displayRows.length === 0 && (
              <tr>
                <td colSpan={headers.length + 1} className="px-4 py-6 text-center text-slate-400 text-xs">
                  No rows match the current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {truncated && (
        <p className="text-[10px] text-amber-500">Showing first {MAX_TABLE_ROWS} of {visibleRows.length} filtered rows.</p>
      )}
      {!readOnly && (
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#4DA3FF] transition-colors"
        >
          <Plus size={12} /> Add row
        </button>
      )}
    </div>
  )
}

const CSV_ENTITIES = [
  { group: "Taxonomy",           value: "taxonomy/specialties",                    label: "Specialties" },
  { group: "Taxonomy",           value: "taxonomy/service_lines",                  label: "Service Lines" },
  { group: "Taxonomy",           value: "taxonomy/anatomy",                        label: "Anatomy" },
  { group: "Procedures",         value: "procedures/trauma_and_orthopaedics",      label: "Trauma & Orthopaedics" },
  { group: "Procedures",         value: "procedures/general_surgery",              label: "General Surgery" },
  { group: "Procedures",         value: "procedures/urology",                      label: "Urology" },
  { group: "Procedures",         value: "procedures/gynaecology",                  label: "Gynaecology" },
  { group: "Procedures",         value: "procedures/obstetrics",                   label: "Obstetrics" },
  { group: "Procedures",         value: "procedures/otolaryngology",               label: "ENT" },
  { group: "Procedures",         value: "procedures/oral_and_maxillofacial",       label: "OMFS" },
  { group: "Procedures",         value: "procedures/dental_and_oral",              label: "Dental & Oral" },
  { group: "Procedures",         value: "procedures/plastic_and_reconstructive",   label: "Plastics" },
  { group: "Procedures",         value: "procedures/neurosurgery",                 label: "Neurosurgery" },
  { group: "Procedures",         value: "procedures/cardiothoracic",               label: "Cardiothoracic" },
  { group: "Procedures",         value: "procedures/vascular",                     label: "Vascular" },
  { group: "Procedures",         value: "procedures/paediatric",                   label: "Paediatric" },
  { group: "Procedures",         value: "procedures/opthalmology",                 label: "Ophthalmology" },
  { group: "Procedures",         value: "procedures/podiatric",                    label: "Podiatric" },
  { group: "Procedures",         value: "procedures/anaesthesia",                  label: "Anaesthesia" },
  { group: "Variants & Systems", value: "procedure_variants/trauma_and_orthopaedics", label: "Variants: T&O" },
  { group: "Variants & Systems", value: "systems",                                 label: "Systems" },
  { group: "Variants & Systems", value: "procedure_variant_system_map",            label: "Variant-System Map" },
  { group: "Variants & Systems", value: "suppliers",                               label: "Suppliers" },
] as const

function CsvTab() {
  const [entity, setEntity] = useState("")
  const [csv, setCsv] = useState("")
  const [csvKey, setCsvKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)

  async function loadCsv(selected: string) {
    if (!selected) return
    setLoading(true)
    setCsv("")
    setStatus(null)
    try {
      const res = await fetch(`/api/dev/csv?entity=${encodeURIComponent(selected)}`)
      if (res.ok) {
        setCsv(await res.text())
        setCsvKey(k => k + 1)
      } else {
        const d = await res.json()
        setStatus({ ok: false, message: d.error ?? "Load failed" })
      }
    } catch {
      setStatus({ ok: false, message: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  async function saveCsv() {
    if (!entity || !csv) return
    setSaving(true)
    setStatus(null)
    try {
      const res = await fetch("/api/dev/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity, csv }),
      })
      const d = await res.json()
      if (res.ok) {
        setStatus({ ok: true, message: `Saved — ${d.rows} rows written to JSON` })
      } else {
        setStatus({ ok: false, message: d.error ?? "Save failed" })
      }
    } catch {
      setStatus({ ok: false, message: "Network error" })
    } finally {
      setSaving(false)
    }
  }

  const groups = [...new Set(CSV_ENTITIES.map((e) => e.group))]

  return (
    <div className="space-y-6">
      <MasterImport />

      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">Per-entity editor</h2>
        <p className="text-xs text-slate-500">
          Select an entity to load it as an editable table. Click any cell to edit.
          Arrays use <code className="text-[#4DA3FF]">|</code> as separator (e.g. <code className="text-[#4DA3FF]">alias1|alias2</code>).
          Save writes back to the JSON file on disk.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <select
            value={entity}
            onChange={(e) => { setEntity(e.target.value); loadCsv(e.target.value) }}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#4DA3FF] transition-colors"
          >
            <option value="">— select entity —</option>
            {groups.map((group) => (
              <optgroup key={group} label={group}>
                {CSV_ENTITIES.filter((e) => e.group === group).map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {entity && (
            <button
              onClick={() => loadCsv(entity)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 px-3 py-2.5 rounded-xl hover:border-slate-400 hover:text-slate-900 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Reload
            </button>
          )}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 py-4">
            <RefreshCw size={12} className="animate-spin" /> Loading…
          </div>
        )}

        {!loading && entity && (
          <>
            <CsvTable key={csvKey} initialCsv={csv} onChange={setCsv} />

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div>
                {status && (
                  <p className={`text-xs flex items-center gap-1.5 ${status.ok ? "text-green-700" : "text-red-400"}`}>
                    {status.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {status.message}
                  </p>
                )}
              </div>
              <button
                onClick={saveCsv}
                disabled={saving || !csv || loading}
                className="flex items-center gap-2 bg-[#4DA3FF] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#2F8EF7] transition-colors disabled:opacity-40"
              >
                {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                Save to JSON
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Master CSV Import sub-component ──────────────────────────────────────────
type PreviewLine = { entity: string; count: number; path: string; new: number; updated: number }

function MasterImport() {
  const [csv, setCsv] = useState("")
  const [csvKey, setCsvKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [preview, setPreview] = useState<PreviewLine[] | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadCurrent() {
    setExporting(true)
    setStatus(null)
    try {
      const res = await fetch("/api/dev/csv/master")
      if (res.ok) {
        const text = await res.text()
        setCsv(text)
        setCsvKey(k => k + 1)
        setPreview(null)
      } else {
        setStatus({ ok: false, message: "Failed to load current data" })
      }
    } catch {
      setStatus({ ok: false, message: "Network error" })
    } finally {
      setExporting(false)
    }
  }

  async function runPreview() {
    if (!csv.trim()) return
    setLoading(true)
    setPreview(null)
    setStatus(null)
    try {
      const res = await fetch("/api/dev/csv/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: true }),
      })
      const d = await res.json()
      if (res.ok) {
        setPreview(d.preview)
        setRowCount(d.rows)
      } else {
        setStatus({ ok: false, message: d.error ?? "Preview failed" })
      }
    } catch {
      setStatus({ ok: false, message: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  async function runImport() {
    if (!csv.trim()) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch("/api/dev/csv/master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, dryRun: false }),
      })
      const d = await res.json()
      if (res.ok) {
        setPreview(d.preview)
        setRowCount(d.rows)
        setStatus({ ok: true, message: `Imported ${d.rows} CSV rows — ${d.preview.length} entity files written` })
      } else {
        setStatus({ ok: false, message: d.error ?? "Import failed" })
      }
    } catch {
      setStatus({ ok: false, message: "Network error" })
    } finally {
      setLoading(false)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsv((ev.target?.result as string) ?? "")
      setCsvKey(k => k + 1)
      setPreview(null)
      setStatus(null)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-1">Master Import</p>
        <h3 className="text-sm font-bold text-slate-900">all_specialties_master.csv</h3>
        <p className="text-xs text-slate-500 mt-1">
          Load current data or upload a new master CSV to review and batch-import all entity JSONs.
          Anatomy merges (preserving parent_id / sort_order). You can edit cells inline before importing.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={loadCurrent}
          disabled={exporting}
          className="flex items-center gap-2 text-sm font-medium bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40"
        >
          {exporting ? <RefreshCw size={13} className="animate-spin" /> : <Database size={13} />}
          Load current data
        </button>
        <span className="text-xs text-slate-400">or</span>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 text-sm font-medium border-2 border-dashed border-slate-300 text-slate-600 px-4 py-2.5 rounded-xl hover:border-[#4DA3FF] hover:text-[#4DA3FF] transition-colors"
        >
          <Upload size={13} />
          {csv ? "Upload new CSV" : "Upload CSV file"}
        </button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>

      {exporting && (
        <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
          <RefreshCw size={12} className="animate-spin" /> Building master CSV from current JSON files…
        </div>
      )}

      {csv && !exporting && (
        <CsvTable key={csvKey} initialCsv={csv} onChange={setCsv} filterColumn="specialty_name" />
      )}

      {csv && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={runPreview}
            disabled={loading}
            className="flex items-center gap-2 text-xs border border-slate-200 text-slate-500 px-4 py-2 rounded-xl hover:border-[#4DA3FF] hover:text-[#4DA3FF] transition-colors disabled:opacity-40"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Database size={12} />}
            Preview changes
          </button>
          <button
            onClick={runImport}
            disabled={loading || !preview}
            className="flex items-center gap-2 text-xs bg-[#4DA3FF] text-white font-semibold px-4 py-2 rounded-xl hover:bg-[#2F8EF7] transition-colors disabled:opacity-40"
          >
            {loading ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            Import All
          </button>
          {!preview && (
            <span className="text-[10px] text-slate-400">Preview first to unlock import</span>
          )}
        </div>
      )}

      {status && (
        <p className={`text-xs flex items-center gap-1.5 ${status.ok ? "text-green-700" : "text-red-400"}`}>
          {status.ok ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {status.message}
        </p>
      )}

      {preview && (
        <div className="border-t border-slate-200 pt-4 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">
            Preview — {rowCount} CSV rows → {preview.length} files
          </p>
          <div className="overflow-auto border border-slate-100 rounded-xl">
            <table className="text-xs w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200">Entity</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 border-b border-slate-200">Total</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 border-b border-slate-200">New</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 border-b border-slate-200">Updated</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 border-b border-slate-200">File</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((line) => (
                  <tr key={line.path} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-1.5 text-slate-700 font-medium">{line.entity}</td>
                    <td className="px-3 py-1.5 text-right text-slate-900 font-semibold">{line.count}</td>
                    <td className="px-3 py-1.5 text-right">
                      {line.new > 0 ? <span className="text-green-600 font-semibold">+{line.new}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {line.updated > 0 ? <span className="text-blue-500 font-semibold">{line.updated}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-slate-400">{line.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
