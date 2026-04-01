"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Bookmark,
  ChevronDown,
  ChevronRight,
  GitBranch,
  History,
  Info,
  Plus,
  Search,
  X,
} from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import {
  addCardToLocalLibrary,
  createLocalLibrary,
  getDefaultLocalLibraryId,
  getLibrariesSnapshot,
  getLocalCardsByFamilySnapshot,
  getPublishedCardsByFamilySnapshot,
  subscribeLibraries,
} from "@/lib/libraries"
import { formatProcedureHierarchy } from "@/lib/procedure-hierarchy"
import { buildSystemCardSections } from "@/lib/system-card"
import type { Procedure } from "@/lib/types"
import type { VariantWithSystems } from "@/lib/variants"

type VariantRow = {
  id: string
  href: string
  title: string
  supplier?: string
  statusLabel?: string
  isDefault?: boolean
}

type VersionEntry = {
  id: string
  name: string
  detail: string
  active: boolean
  href: string
}

type SourceEntry = {
  id: string
  title: string
  detail: string
  href: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function buildGlobalRows(
  libraryId: string,
  procedure: Procedure,
  variants: VariantWithSystems[],
): VariantRow[] {
  return variants.flatMap((variant) =>
    variant.systems.map((system) => ({
      id: `${variant.id}:${system.id}`,
      href: `/libraries/${libraryId}/cards/${procedure.id}?variant=${encodeURIComponent(variant.id)}&system=${encodeURIComponent(system.id)}`,
      title: system.name,
      supplier: system.supplier?.name,
      isDefault: system.is_default,
    })),
  )
}

function formatDate(value?: string) {
  if (!value) return "recently"
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getOverviewText(procedure: Procedure): string {
  return (
    procedure.description ||
    procedure.sections.find((section) => section.summary?.trim())?.summary ||
    "This global repository contains published procedure cards from local organisations."
  )
}

export default function SharedProcedureIndexView({
  libraryId,
  procedure,
  variants,
}: {
  libraryId: string
  procedure: Procedure
  variants: VariantWithSystems[]
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [repositoryTab, setRepositoryTab] = useState<"variants" | "versions">("variants")
  const [followed, setFollowed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [variantName, setVariantName] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [message, setMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [openVersionId, setOpenVersionId] = useState<string>("")
  const [openSourceId, setOpenSourceId] = useState<string>("")
  const hierarchyLabel = formatProcedureHierarchy(procedure)

  useSyncExternalStore(subscribeLibraries, getLibrariesSnapshot, getLibrariesSnapshot)

  const localLibraryId = getDefaultLocalLibraryId()
  const localCards = localLibraryId ? getLocalCardsByFamilySnapshot(localLibraryId, procedure.familyId) : []
  const localRows = useMemo<VariantRow[]>(
    () =>
      localCards.map((card) => ({
        id: card.id,
        href: `/libraries/${localLibraryId}/cards/${card.id}`,
        title: card.variantLabel?.trim() || card.name,
        supplier: card.implantSystem,
        statusLabel: card.publishState === "published" ? "published" : "draft",
      })),
    [localCards, localLibraryId],
  )
  const globalRows = useMemo(() => buildGlobalRows(libraryId, procedure, variants), [libraryId, procedure, variants])
  const allVariantRows = [...globalRows, ...localRows]
  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return allVariantRows
    return allVariantRows.filter((row) =>
      `${row.title} ${row.supplier ?? ""} ${row.statusLabel ?? ""}`.toLowerCase().includes(normalized),
    )
  }, [allVariantRows, search])
  const defaultGlobalVariant = useMemo(
    () =>
      variants
        .flatMap((variant) => variant.systems.map((system) => ({ variant, system })))
        .find((entry) => entry.system.is_default)
      ?? variants.flatMap((variant) => variant.systems.map((system) => ({ variant, system })))[0]
      ?? null,
    [variants],
  )
  const publishedCards = useMemo(
    () => getPublishedCardsByFamilySnapshot(procedure.familyId),
    [procedure.familyId],
  )
  const versionEntries = useMemo<VersionEntry[]>(
    () =>
      publishedCards.length > 0
        ? publishedCards.map((card, index) => ({
            id: card.id,
            name: card.variantLabel?.trim() || card.implantSystem?.trim() || card.name,
            detail: `${card.sourceOrganizationPublicAlias ?? "PSH-000"} · ${card.sourceContributorPublicAlias ?? "TO-CONS-000"} · Published ${formatDate(card.publishedAt)}`,
            active: card.id === procedure.id || index === 0,
            href: `/libraries/${libraryId}/cards/${card.id}`,
          }))
        : [
            {
              id: "no-published-cards",
              name: "No published versions yet",
              detail: "Create a local card and publish it to make it visible in the global repository.",
              active: true,
              href: `/libraries/${libraryId}/cards/${procedure.id}`,
            },
          ],
    [libraryId, procedure.familyId, procedure.id, publishedCards],
  )
  const sourceEntries = useMemo<SourceEntry[]>(
    () =>
      localCards.slice(0, 3).map((card) => ({
        id: card.id,
        title: card.variantLabel?.trim() || card.name,
        detail: `${card.publishState === "published" ? "Published from local" : "Draft local card"}${card.implantSystem ? ` · ${card.implantSystem}` : ""}`,
        href: `/libraries/${localLibraryId}/cards/${card.id}`,
      })),
    [localCards, localLibraryId],
  )

  function handleCreateVariant() {
    const trimmedVariantName = variantName.trim()
    const trimmedSupplierName = supplierName.trim()

    if (!trimmedVariantName) {
      setMessage("Enter the variant name.")
      return
    }

    if (!trimmedSupplierName) {
      setMessage("Enter the supplier.")
      return
    }

    if (!defaultGlobalVariant) {
      setMessage("No base variant is available yet.")
      return
    }

    setIsCreating(true)
    setMessage("")

    try {
      const nextLibraryId =
        getDefaultLocalLibraryId()
        ?? createLocalLibrary({
          name: "My Local Cards",
          description: "Local procedure cards created from the global repository.",
          visibility: "organization",
        }).id

      const created = addCardToLocalLibrary({
        libraryId: nextLibraryId,
        sourceCard: {
          ...procedure,
          id: `${procedure.id}--${slugify(trimmedVariantName) || "variant"}`,
          name: procedure.name,
          variantLabel: trimmedVariantName,
          description: `Local ${procedure.name} variant for ${trimmedVariantName} by ${trimmedSupplierName}.`,
          implantSystem: trimmedSupplierName,
          sections: buildSystemCardSections(
            procedure,
            defaultGlobalVariant.variant.id,
            defaultGlobalVariant.variant.name,
            defaultGlobalVariant.system.id,
            defaultGlobalVariant.system.name,
          ),
          status: "draft",
          cardScope: "local",
        },
      })

      setComposerOpen(false)
      setVariantName("")
      setSupplierName("")
      router.push(`/libraries/${nextLibraryId}/cards/${created.id}`)
    } catch {
      setMessage("Unable to create variant right now.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F6FAFC] text-[#10243E]">
      <div className="mx-auto min-h-screen max-w-5xl border-x border-[#D5EAF1] bg-transparent">
        <AppTopBar
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((value) => !value)}
          menuContent={<AppMenuContent />}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Find or create a variant..."
        />

        <main className="pb-8">
          <section className="mx-4 mt-4 border-b border-[#D5EAF1] pb-4">
            <div className="text-[12px] uppercase tracking-[0.12em] text-[#61758B]">Global repository</div>
            <h1 className="mt-1 text-[24px] leading-tight tracking-[-0.03em] text-[#10243E]">{procedure.name}</h1>
            <p className="mt-2 text-[13px] leading-5 text-[#61758B]">{hierarchyLabel}</p>
          </section>

          <section className="mx-4 mt-3 border-b border-[#D5EAF1] pb-3">
            <div className="flex items-start gap-3 text-[13px] leading-5 text-[#355B68]">
              <Info size={16} className="mt-0.5 shrink-0 text-[#2A96A8]" />
              <p>
                Global shows published cards only. Create a local version, refine it in your organisation, and publish it back here.
              </p>
            </div>
          </section>

          <section className="mx-4 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#D5EAF1] pb-3 text-[13px]">
            <button type="button" onClick={() => setFollowed((value) => !value)} className="inline-flex items-center gap-1.5 text-[#0F4C5C] hover:text-[#10243E]">
              <Bell size={14} />
              {followed ? "Following" : "Follow"}
            </button>
            <button
              type="button"
              onClick={() => {
                setComposerOpen((value) => !value)
                setMessage("")
              }}
              className="inline-flex items-center gap-1.5 text-[#0F4C5C] hover:text-[#10243E]"
            >
              <Plus size={14} />
              Fork to local
            </button>
            <button type="button" onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-1.5 text-[#0F4C5C] hover:text-[#10243E]">
              <Bookmark size={14} />
              {saved ? "Saved" : "Save"}
            </button>
          </section>

          <section className="mx-4 mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-[#61758B]">
            <button type="button" onClick={() => setSaved((value) => !value)} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <Bookmark size={13} />
              {saved ? 25 : 24} saved
            </button>
            <button type="button" onClick={() => setComposerOpen(true)} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <GitBranch size={13} />
              {localRows.length} local branches
            </button>
            <button type="button" onClick={() => setFollowed((value) => !value)} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <Bell size={13} />
              {followed ? 13 : 12} following
            </button>
            <button type="button" onClick={() => setRepositoryTab("versions")} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <History size={13} />
              {versionEntries.length} published versions
            </button>
            <button type="button" onClick={() => setOpenSourceId((current) => (current ? "" : "open"))} className="inline-flex items-center gap-1.5 transition-colors hover:text-[#10243E]">
              <Info size={13} />
              {sourceEntries.length} source versions
            </button>
          </section>

          <section className="mx-4 mt-5 border-t border-[#D5EAF1]">
            <div className="flex items-center justify-between border-b border-[#D9EBF0] px-1 py-3">
              <span className="text-[13px] text-[#10243E]">Branches and published versions</span>
              {composerOpen ? (
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="text-[16px] text-[#61758B]"
                  aria-label="Close add variant"
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className="border-b border-[#E3EDF1] px-1 py-2.5">
              <label className="flex items-center gap-2 text-[13px] text-[#61758B]">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find a published system or local fork..."
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#10243E] outline-none placeholder:text-[#7A8DA3]"
                />
              </label>
            </div>

            <div className="flex border-b border-[#E3EDF1]">
              <button
                type="button"
                onClick={() => setRepositoryTab("variants")}
                className={`flex-1 px-4 py-2 text-[13px] ${
                  repositoryTab === "variants" ? "border-b-2 border-[#2A96A8] text-[#10243E]" : "text-[#61758B]"
                }`}
              >
                Branches
              </button>
              <button
                type="button"
                onClick={() => setRepositoryTab("versions")}
                className={`flex-1 px-4 py-2 text-[13px] ${
                  repositoryTab === "versions" ? "border-b-2 border-[#2A96A8] text-[#10243E]" : "text-[#61758B]"
                }`}
              >
                Published versions
              </button>
            </div>

            {composerOpen ? (
              <div className="border-b border-[#E3EDF1] px-1 py-3">
                <div className="space-y-3">
                  <input
                    value={variantName}
                    onChange={(event) => setVariantName(event.target.value)}
                    placeholder="Local branch name"
                    className="w-full rounded-[6px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[14px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                  />
                  <input
                    value={supplierName}
                    onChange={(event) => setSupplierName(event.target.value)}
                    placeholder="Implant system or supplier"
                    className="w-full rounded-[6px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[14px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                  />
                  {message ? <p className="text-[13px] text-[#B65454]">{message}</p> : null}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isCreating}
                      onClick={handleCreateVariant}
                      className="rounded-[6px] bg-[#2A96A8] px-3 py-2 text-[13px] text-white disabled:opacity-60"
                    >
                      {isCreating ? "Creating..." : "Create local fork"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {repositoryTab === "variants" ? (
              <div>
                {filteredRows.map((row) => (
                  <Link
                    key={row.id}
                    href={row.href}
                    className="flex items-center justify-between border-b border-[#E3EDF1] px-1 py-3 text-[13px] hover:bg-[#F8FBFD]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch size={14} className="shrink-0 text-[#61758B]" />
                      <span className="truncate text-[#10243E]">
                        {row.title}
                        {row.supplier ? <span className="text-[#61758B]"> · {row.supplier}</span> : null}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-[#61758B]">
                      {row.isDefault ? <span className="text-[11px]">default</span> : null}
                      {row.statusLabel ? <span className="text-[12px]">{row.statusLabel}</span> : null}
                      <ChevronRight size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div>
                {versionEntries.map((version) => (
                  <div key={version.id} className="border-b border-[#E3EDF1] px-1 py-3 text-[13px]">
                    <button
                      type="button"
                      onClick={() => setOpenVersionId((current) => (current === version.id ? "" : version.id))}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span className="flex items-center gap-2 text-[#10243E]">
                        <History size={14} className="text-[#61758B]" />
                        {version.name}
                      </span>
                      <ChevronDown
                        size={15}
                        className={`text-[#61758B] transition-transform ${openVersionId === version.id ? "rotate-180" : ""}`}
                      />
                    </button>
                    {openVersionId === version.id ? (
                      <div className="pt-2">
                        <div className="text-[12px] text-[#61758B]">{version.detail}</div>
                        <Link href={version.href} className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#0F4C5C] hover:text-[#10243E]">
                          Open card
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="mx-4 mt-5 border-t border-[#D5EAF1]">
            <div className="border-b border-[#D9EBF0] px-1 py-3 text-[14px] text-[#10243E]">
              Source versions
            </div>
            <div>
              {sourceEntries.length > 0 ? sourceEntries.map((source) => (
                <div key={source.id} className="border-b border-[#E3EDF1] px-1 py-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => setOpenSourceId((current) => (current === source.id ? "" : source.id))}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-[#10243E]">
                      <Info size={14} className="text-[#61758B]" />
                      {source.title}
                    </span>
                    <ChevronDown
                      size={15}
                      className={`text-[#61758B] transition-transform ${openSourceId === source.id ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openSourceId === source.id ? (
                    <div className="pt-2">
                      <div className="text-[12px] text-[#61758B]">{source.detail}</div>
                      <Link href={source.href} className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#0F4C5C] hover:text-[#10243E]">
                        Open card
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  ) : null}
                </div>
              )) : (
                <div className="px-1 py-4 text-[12px] text-[#61758B]">
                  No local cards have been created for this procedure yet.
                </div>
              )}
            </div>
          </section>

          <section className="mx-4 mt-5 border-t border-[#D5EAF1]">
            <div className="border-b border-[#D9EBF0] px-1 py-3 text-[14px] text-[#10243E]">
              Overview
            </div>
            <div className="px-1 py-4">
              <p className="text-[14px] leading-6 text-[#406175]">{getOverviewText(procedure)}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
