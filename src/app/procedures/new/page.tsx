"use client"

import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, House, Search, ChevronRight, Plus, Check } from "lucide-react"
import Fuse from "fuse.js"
import { SEED_SUPERSEDES } from "@/lib/data"
import { CLINICAL_SETTINGS, DEFAULT_SECTIONS_BY_SETTING, SECTION_TYPE_CATALOGUE, SETTING_SPECIALTIES } from "@/lib/settings"
import { ClinicalSetting, Procedure, SectionType } from "@/lib/types"
import {
  buildBlankProcedureDraft,
  getProcedureLibrarySnapshot,
  saveProcedureDraftLocal,
  subscribeProcedureLibrary,
} from "@/lib/procedure-library"
import { getDefaultLocalLibraryId, saveLocalLibraryCard } from "@/lib/libraries"
import {
  getSpecialtySectionTemplatesSnapshot,
  getTemplateForSpecialtySnapshot,
  saveSpecialtySectionTemplate,
  subscribeSectionTemplates,
} from "@/lib/section-templates"

type Step = "search" | "confirm-existing" | "register-new"

export default function NewCardPage() {
  const router = useRouter()
  const procedureLibrary = useSyncExternalStore(
    subscribeProcedureLibrary,
    getProcedureLibrarySnapshot,
    getProcedureLibrarySnapshot,
  )
  useSyncExternalStore(
    subscribeSectionTemplates,
    getSpecialtySectionTemplatesSnapshot,
    getSpecialtySectionTemplatesSnapshot,
  )

  const [query,        setQuery]        = useState("")
  const [step,         setStep]         = useState<Step>("search")
  const [selected,     setSelected]     = useState<Procedure | null>(null)
  const [newName,      setNewName]      = useState("")
  const [newSetting,   setNewSetting]   = useState<ClinicalSetting | "">("")
  const [newSpecialty, setNewSpecialty] = useState("")
  const [selectedSectionTypes, setSelectedSectionTypes] = useState<SectionType[]>(DEFAULT_SECTIONS_BY_SETTING["Operating Theatre"])

  const searchableProcedures = useMemo(
    () => procedureLibrary.filter((p) => !(p.id in SEED_SUPERSEDES)),
    [procedureLibrary],
  )

  const fuse = useMemo(() => new Fuse(searchableProcedures, {
    keys: ["name"],
    threshold: 0.45,
    minMatchCharLength: 3,
    includeScore: true,
  }), [searchableProcedures])

  const matches = useMemo(() => {
    if (query.trim().length < 3) return []
    return fuse.search(query.trim()).slice(0, 5)
  }, [query, fuse])

  const existingSpecialties = useMemo(() =>
    [...new Set(searchableProcedures.map(p => p.specialty))].sort()
  , [searchableProcedures])

  const suggestedSpecialties = useMemo(() => {
    if (!newSetting) return existingSpecialties
    const bySetting = SETTING_SPECIALTIES[newSetting] ?? []
    return [...new Set([...bySetting, ...existingSpecialties])].sort()
  }, [existingSpecialties, newSetting])

  const sectionOptions = useMemo(() => {
    const defaultTypes = newSetting ? (DEFAULT_SECTIONS_BY_SETTING[newSetting] ?? []) : []
    return SECTION_TYPE_CATALOGUE.map((entry) => ({
      ...entry,
      recommended: defaultTypes.includes(entry.type),
      selected: selectedSectionTypes.includes(entry.type),
    }))
  }, [newSetting, selectedSectionTypes])

  const activeSpecialtyTemplate = useMemo(() => {
    if (!newSetting || !newSpecialty.trim()) return null
    return getTemplateForSpecialtySnapshot(newSetting, newSpecialty.trim())
  }, [newSetting, newSpecialty])

  useEffect(() => {
    if (!newSetting || !newSpecialty.trim()) return
    const template = getTemplateForSpecialtySnapshot(newSetting, newSpecialty.trim())
    if (template?.sectionTypes?.length) {
      setSelectedSectionTypes(template.sectionTypes)
    }
  }, [newSetting, newSpecialty])

  // ── Step 1: Search ──────────────────────────────────────────────────────────
  if (step === "search") {
    return (
      <div className="app-shell-bg min-h-screen">
        <header className="app-header-bg app-card-border sticky top-0 z-30 border-b">
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:pt-3">
            <Link href="/" className="app-header-muted shrink-0 transition-colors hover:opacity-80">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="app-header-text flex-1 text-[18px] font-medium lg:text-base">New procedure card</h1>
            <Link href="/" className="app-header-muted shrink-0 rounded-lg p-2 transition-colors hover:opacity-80" aria-label="Home">
              <House size={18} />
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <p className="app-text-strong mb-1 text-xl font-bold lg:text-lg">What procedure is this card for?</p>
          <p className="app-text-muted mb-6 text-[15px] lg:text-sm">
            Type a name. PrepSight will check the shared library first so you can extend what exists before creating a new draft.
          </p>

          <div className="mb-6 rounded-2xl border border-[#D8E3EE] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5B7288]">Library building</p>
            <p className="mt-2 text-[15px] font-semibold text-[#10243E]">
              The goal is to make adding future specialties feel like guided publishing, not rewiring the app.
            </p>
            <p className="mt-1 text-[14px] leading-6 text-[#61758B]">
              Start by checking whether a validated card or draft already exists. If not, register the procedure and use the same structured schema that powers the live THR and TKR reference slice.
            </p>
          </div>

          {/* Search input */}
          <div className="relative mb-4">
            <Search size={16} className="app-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Total Hip Replacement…"
              autoFocus
              className="app-card-bg app-card-border app-text-strong w-full rounded-xl border py-3.5 pl-10 pr-4 text-[17px] placeholder:text-[#cbd5e1] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] lg:text-base"
            />
          </div>

          {/* Fuzzy matches */}
          {matches.length > 0 && (
            <div className="app-card-bg app-card-border mb-4 overflow-hidden rounded-xl border">
              <p className="app-text-muted app-card-border border-b px-4 py-2.5 text-[11px] uppercase tracking-wide lg:text-xs">
                Closest matches in registry
              </p>
              {matches.map(({ item }) => (
                <button
                  key={item.id}
                  onClick={() => { setSelected(item); setStep("confirm-existing") }}
                  className="app-card-border hover:app-card-bg-soft flex w-full items-center justify-between border-b px-4 py-3.5 text-left transition-colors last:border-0"
                >
                  <div className="min-w-0 mr-3">
                    <p className="app-text-strong text-[15px] font-semibold leading-snug lg:text-sm">{item.name}</p>
                    <p className="app-text-muted mt-0.5 text-xs">{item.specialty} · {item.setting}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[13px] font-semibold text-[#4DA3FF] lg:text-xs">
                    Use this <ChevronRight size={13} />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* New procedure option */}
          {query.trim().length >= 3 && (
            <button
              onClick={() => { setNewName(query.trim()); setStep("register-new") }}
              className="app-card-bg app-primary-text w-full flex items-center justify-between rounded-xl border border-dashed border-[#4DA3FF] px-4 py-3.5 text-left transition-colors hover:bg-[#EFF8FF]"
            >
              <div className="min-w-0 mr-3">
                <p className="text-[15px] font-semibold text-[#4DA3FF] lg:text-sm">This is a completely new procedure</p>
                <p className="app-text-muted mt-0.5 text-[13px] lg:text-xs">
                  Add &ldquo;{query.trim()}&rdquo; to the registry and start a blank card
                </p>
              </div>
              <Plus size={16} className="text-[#4DA3FF] shrink-0" />
            </button>
          )}
        </main>
      </div>
    )
  }

  // ── Step 2a: Confirm existing ───────────────────────────────────────────────
  if (step === "confirm-existing" && selected) {
    return (
      <div className="app-shell-bg min-h-screen">
        <header className="app-header-bg app-card-border sticky top-0 z-30 border-b">
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:pt-3">
            <button
              onClick={() => setStep("search")}
              className="app-header-muted shrink-0 transition-colors hover:opacity-80"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="app-header-text flex-1 text-[18px] font-medium lg:text-base">Confirm procedure</h1>
            <Link href="/" className="app-header-muted shrink-0 rounded-lg p-2 transition-colors hover:opacity-80" aria-label="Home">
              <House size={18} />
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <p className="app-text-muted mb-4 text-[15px] lg:text-sm">
            Is this the procedure you want to extend in the shared library?
          </p>

          <div className="app-card-bg app-card-border mb-6 rounded-xl border px-4 py-4">
            <p className="app-text-strong text-[17px] font-bold leading-snug lg:text-base">{selected.name}</p>
            <p className="app-text-muted mt-1.5 text-xs">{selected.specialty} · {selected.setting}</p>
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => router.push(`/procedures/${selected.id}`)}
              className="app-primary-bg flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-colors hover:bg-[#2F8EF7]"
            >
              <Check size={16} /> Yes, open this card
            </button>
            <button
              onClick={() => setStep("search")}
              className="app-card-border app-text rounded-xl border px-5 py-3 text-[15px] font-semibold transition-colors hover:bg-[#F4F7FA] lg:text-base"
            >
              Go back
            </button>
          </div>

          <button
            onClick={() => { setNewName(query.trim()); setStep("register-new") }}
            className="app-text-muted w-full text-center text-[15px] transition-colors hover:text-[#4DA3FF] lg:text-sm"
          >
            No — &ldquo;{query}&rdquo; is a different procedure →
          </button>
        </main>
      </div>
    )
  }

  // ── Step 2b: Register new procedure ────────────────────────────────────────
  if (step === "register-new") {
    const canSubmit = newName.trim() && newSetting && newSpecialty.trim() && selectedSectionTypes.length > 0

    return (
      <div className="app-shell-bg min-h-screen">
        <header className="app-header-bg app-card-border sticky top-0 z-30 border-b">
          <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 pb-2.5 pt-[calc(env(safe-area-inset-top,0px)+8px)] lg:pt-3">
            <button
              onClick={() => setStep("search")}
              className="app-header-muted shrink-0 transition-colors hover:opacity-80"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="app-header-text flex-1 text-[18px] font-medium lg:text-base">Register new procedure</h1>
            <Link href="/" className="app-header-muted shrink-0 rounded-lg p-2 transition-colors hover:opacity-80" aria-label="Home">
              <House size={18} />
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <p className="app-text-strong mb-1 text-xl font-bold lg:text-lg">New procedure details</p>
          <p className="app-text-muted mb-6 text-[15px] lg:text-sm">
            This creates a proposed procedure entry and prepares the next card draft for collaborative review.
          </p>

          <div className="mb-6 rounded-2xl border border-[#D8E3EE] bg-white px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5B7288]">Publishing path</p>
            <p className="mt-2 text-[15px] font-semibold text-[#10243E]">
              Draft first, then validate.
            </p>
            <p className="mt-1 text-[14px] leading-6 text-[#61758B]">
              New procedures should begin as structured proposals, then move through review before they become live reference cards. That keeps the library collaborative without letting unvalidated content look canonical.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-[#94a3b8] lg:text-xs">
                Procedure name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[17px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] lg:text-base"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-[#94a3b8] lg:text-xs">
                Clinical setting
              </label>
              <select
                value={newSetting}
                onChange={(e) => {
                  const nextSetting = e.target.value as ClinicalSetting
                  setNewSetting(nextSetting)
                  if (nextSetting) {
                    setSelectedSectionTypes(DEFAULT_SECTIONS_BY_SETTING[nextSetting] ?? [])
                  }
                }}
                className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[17px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] lg:text-base"
              >
                <option value="">Select a setting…</option>
                {CLINICAL_SETTINGS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-[#94a3b8] lg:text-xs">
                Specialty
              </label>
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                placeholder="e.g. Trauma and Orthopaedics"
                list="specialty-options"
                className="w-full rounded-xl border border-[#D5DCE3] bg-white px-3 py-3 text-[17px] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4DA3FF] lg:text-base"
              />
              <datalist id="specialty-options">
                {suggestedSpecialties.map(s => <option key={s} value={s} />)}
              </datalist>
              <p className="mt-1.5 px-1 text-[13px] text-[#94a3b8] lg:text-xs">
                Choose the closest existing specialty so the browse tree stays consistent as the library grows.
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label className="block text-[11px] uppercase tracking-wide text-[#94a3b8] lg:text-xs">
                  Section ribbon
                </label>
                <span className="text-[12px] text-[#64748B]">{selectedSectionTypes.length} selected</span>
              </div>
              <div className="rounded-2xl border border-[#D8E3EE] bg-white p-3">
                <p className="mb-3 text-[13px] text-[#61758B]">
                  Pick the sections this draft should start with. This is the controlled authoring palette for the card.
                </p>
                <div className="flex flex-wrap gap-2">
                  {sectionOptions.map((entry) => {
                    const active = entry.selected
                    return (
                      <button
                        key={entry.type}
                        type="button"
                        onClick={() => {
                          setSelectedSectionTypes((current) => (
                            current.includes(entry.type)
                              ? current.filter((item) => item !== entry.type)
                              : [...current, entry.type]
                          ))
                        }}
                        className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                          active
                            ? "border-[#4DA3FF] bg-[#EFF8FF] text-[#1E4E8C]"
                            : "border-[#D5DCE3] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <div className="text-[13px] font-semibold">{entry.label}</div>
                        <div className="mt-0.5 text-[11px] leading-4 text-inherit/80">{entry.description}</div>
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSetting || !newSpecialty.trim()) return
                      saveSpecialtySectionTemplate({
                        setting: newSetting,
                        specialty: newSpecialty.trim(),
                        sectionTypes: selectedSectionTypes,
                      })
                    }}
                    disabled={!newSetting || !newSpecialty.trim() || selectedSectionTypes.length === 0}
                    className="rounded-xl border border-[#BFEAF5] bg-[#EEF9FC] px-3 py-2 text-[12px] font-semibold text-[#0F4C5C] transition-colors hover:bg-[#DDF4FA] disabled:opacity-40"
                  >
                    Save as specialty template
                  </button>
                  {activeSpecialtyTemplate ? (
                    <button
                      type="button"
                      onClick={() => setSelectedSectionTypes(activeSpecialtyTemplate.sectionTypes)}
                      className="rounded-xl border border-[#D5EAF1] bg-white px-3 py-2 text-[12px] font-semibold text-[#406175] transition-colors hover:bg-[#F8FBFD]"
                    >
                      Use saved template
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <button
            disabled={!canSubmit}
            onClick={() => {
              if (!newSetting) return
              const draft = buildBlankProcedureDraft({
                name: newName.trim(),
                setting: newSetting,
                specialty: newSpecialty.trim(),
                sectionTypes: selectedSectionTypes,
              })
              const defaultLibraryId = getDefaultLocalLibraryId()
              if (defaultLibraryId) {
                saveLocalLibraryCard(defaultLibraryId, draft)
                router.push(`/libraries/${encodeURIComponent(defaultLibraryId)}/cards/${encodeURIComponent(draft.id)}`)
                return
              }
              saveProcedureDraftLocal(draft)
              router.push(`/procedures/${encodeURIComponent(draft.id)}`)
            }}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#4DA3FF] py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-[#2F8EF7] disabled:cursor-not-allowed disabled:opacity-40 lg:text-base"
          >
            <Plus size={16} /> Propose procedure and start draft
          </button>
        </main>
      </div>
    )
  }

  return null
}
