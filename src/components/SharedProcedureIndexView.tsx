"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, ChevronDown, Eye, GitBranch, Heart, MessageCircle, Plus, Send, X } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import WorkspaceNavRail from "@/components/WorkspaceNavRail"
import { getBookmarksSnapshot, removeBookmark, saveBookmark, subscribeBookmarks } from "@/lib/bookmarks"
import {
  addCardToLocalLibrary,
  createLocalLibrary,
  getDefaultLocalLibraryId,
  getLibrariesSnapshot,
  getPublishedCardsByFamilySnapshot,
  subscribeLibraries,
} from "@/lib/libraries"
import { formatProcedureHierarchy } from "@/lib/procedure-hierarchy"
import { getProfile } from "@/lib/profile"
import { buildSystemCardSections } from "@/lib/system-card"
import { getActiveTeamSnapshot } from "@/lib/team-workspaces"
import type { Procedure } from "@/lib/types"
import type { VariantWithSystems } from "@/lib/variants"

type BranchView = "approach" | "supplier" | "system" | "classification"

type PublishedVersion = {
  id: string
  name: string
  contributor: string
  organization: string
  publishedAt?: string
  href: string
  likes: number
  views: number
  saves: number
  recommended?: boolean
}

type VersionComment = {
  id: string
  author: string
  body: string
  createdAt: string
}

type BranchEntry = {
  id: string
  variantId: string
  variantName: string
  approach?: string
  systemId: string
  systemName: string
  supplierName?: string
  versions: PublishedVersion[]
  defaultBranch?: boolean
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function formatDate(value?: string) {
  if (!value) return "Recently updated"
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function normalizeText(value?: string) {
  return (value ?? "").trim().toLowerCase()
}

function getOverviewText(procedure: Procedure) {
  return (
    procedure.description ||
    procedure.sections.find((section) => section.summary?.trim())?.summary ||
    "Choose a branch below, then inspect a published version or create a My Team version from it."
  )
}

function getClassificationLabel(branch: BranchEntry, procedureName: string) {
  const label = branch.variantName.trim()
  if (!label) return "Unclassified"
  if (normalizeText(label) === normalizeText(procedureName)) return "Unclassified"
  if (branch.approach?.trim()) return "Approach-led"
  return label
}

function getGroupLabel(branch: BranchEntry, view: BranchView, procedureName: string) {
  if (view === "approach") return branch.approach?.trim() || "No approach specified"
  if (view === "supplier") return branch.supplierName?.trim() || "Unknown supplier"
  if (view === "classification") return getClassificationLabel(branch, procedureName)
  return branch.systemName
}

function getViewLabel(view: BranchView) {
  if (view === "approach") return "Approach"
  if (view === "supplier") return "Supplier"
  if (view === "classification") return "Classification"
  return "System"
}

function normalizeOrganizationName(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function isSameOrganization(cardOrganization: string | undefined, localOrganization: string | undefined) {
  const left = normalizeOrganizationName(cardOrganization)
  const right = normalizeOrganizationName(localOrganization)
  if (!left || !right) return false
  return left.includes(right) || right.includes(left)
}

function getVisibleOrganizationLabel(
  card: Procedure,
  localOrganization?: string,
) {
  if (isSameOrganization(card.sourceOrganizationName, localOrganization)) {
    return localOrganization ?? card.sourceOrganizationName ?? "Unknown organisation"
  }

  return card.sourceOrganizationPublicAlias?.trim() || "PSH-000"
}

function getVersionLinkStatus(versionName: string) {
  return normalizeText(versionName).includes("unl") ? "Unlinked" : "Linked"
}

function buildBranchEntries(
  libraryId: string,
  procedure: Procedure,
  variants: VariantWithSystems[],
  publishedCards: Procedure[],
  localOrganization?: string,
): BranchEntry[] {
  return variants.flatMap((variant) =>
    variant.systems.map((system) => {
      const versions = publishedCards
        .filter((card) => {
          const haystack = normalizeText(
            `${card.name} ${card.variantLabel ?? ""} ${card.implantSystem ?? ""} ${card.description ?? ""}`,
          )
          return (
            haystack.includes(normalizeText(system.name)) ||
            haystack.includes(normalizeText(system.supplier?.name)) ||
            haystack.includes(normalizeText(variant.name)) ||
            haystack.includes(normalizeText(variant.approach))
          )
        })
        .map((card, index) => ({
          id: card.id,
          name: card.variantLabel?.trim() || card.implantSystem?.trim() || card.name,
          contributor: card.sourceContributorPublicAlias ?? card.sourceContributorName ?? "Unknown contributor",
          organization: getVisibleOrganizationLabel(card, localOrganization),
          publishedAt: card.publishedAt,
          href: `/libraries/${libraryId}/cards/${card.id}`,
          likes: 0,
          views: 0,
          saves: 0,
          recommended: system.is_default && index === 0,
        }))

      return {
        id: `${variant.id}:${system.id}`,
        variantId: variant.id,
        variantName: variant.name,
        approach: variant.approach,
        systemId: system.id,
        systemName: system.name,
        supplierName: system.supplier?.name,
        versions,
        defaultBranch: system.is_default,
      }
    }),
  )
}

function VersionDrawer({
  branch,
  version,
  onClose,
}: {
  branch: BranchEntry | null
  version: PublishedVersion | null
  onClose: () => void
}) {
  const open = Boolean(branch && version)
  const [commentDraft, setCommentDraft] = useState("")

  const comments = useMemo<VersionComment[]>(() => {
    if (!version) return []
    return [
      {
        id: `${version.id}-comment-1`,
        author: version.organization,
        body: "Useful branch structure. This version is ready for local adaptation.",
        createdAt: "Today",
      },
    ]
  }, [version])

  return (
    <div
      className={`fixed inset-y-0 right-0 z-40 w-full max-w-[30rem] border-l border-[#D5EAF1] bg-white shadow-[-18px_0_40px_rgba(16,36,62,0.16)] transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-[#D9EBF0] px-5 py-4">
          <div>
            <div className="text-[13px] text-[#61758B]">Published version</div>
            <div className="mt-1 text-[20px] tracking-[-0.03em] text-[#10243E]">
              {version?.name ?? "Details"}
              {version ? <span className="ml-2 text-[14px] tracking-normal text-[#61758B]">| {getVersionLinkStatus(version.name)}</span> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] p-2 text-[#61758B] hover:bg-[#F4FBFF]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {branch && version ? (
            <div className="space-y-6">
              <div>
                <div className="text-[13px] text-[#61758B]">Branch</div>
                <div className="mt-2 text-[15px] leading-7 text-[#10243E]">
                  {branch.systemName}
                  {branch.approach ? ` | ${branch.approach}` : ""}
                  {branch.supplierName ? ` | ${branch.supplierName}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-5 border-b border-[#E3EDF1] pb-4 text-[14px] text-[#61758B]">
                <span className="inline-flex items-center gap-2">
                  <Heart size={16} />
                  {version.likes}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Eye size={16} />
                  {version.views}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Bookmark size={16} />
                  {version.saves}
                </span>
                <span className="inline-flex items-center gap-2">
                  <MessageCircle size={16} />
                  {comments.length}
                </span>
              </div>

              <div className="grid gap-4 border-b border-[#E3EDF1] pb-5 sm:grid-cols-3">
                <div>
                  <div className="text-[13px] text-[#61758B]">Contributor</div>
                  <div className="mt-1 text-[15px] text-[#10243E]">{version.contributor}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#61758B]">Organisation</div>
                  <div className="mt-1 text-[15px] text-[#10243E]">{version.organization}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#61758B]">Published</div>
                  <div className="mt-1 text-[15px] text-[#10243E]">{formatDate(version.publishedAt)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href={version.href}
                  className="inline-flex rounded-[10px] bg-[#0F4C5C] px-4 py-2 text-[14px] text-white hover:bg-[#123f4b]"
                >
                  Open version
                </Link>
                <button
                  type="button"
                  className="inline-flex rounded-[10px] border border-[#C9E3EE] px-4 py-2 text-[14px] text-[#10243E] hover:bg-[#F4FBFF]"
                >
                  Create My Team version
                </button>
              </div>

              <div className="border-t border-[#E3EDF1] pt-5">
                <div className="flex items-center gap-2 text-[15px] text-[#10243E]">
                  <MessageCircle size={16} />
                  Comments
                </div>

                <div className="mt-4 space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-[12px] bg-[#F4FBFF] px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[14px] text-[#10243E]">{comment.author}</div>
                        <div className="text-[12px] text-[#61758B]">{comment.createdAt}</div>
                      </div>
                      <div className="mt-2 text-[14px] leading-6 text-[#406175]">{comment.body}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-start gap-3">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a comment"
                    className="min-h-[92px] flex-1 resize-none rounded-[10px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[14px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                  />
                  <button
                    type="button"
                    className="inline-flex h-[42px] items-center gap-2 rounded-[10px] bg-[#0F4C5C] px-3 text-[14px] text-white hover:bg-[#123f4b]"
                  >
                    <Send size={15} />
                    Send
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [selectedVersionId, setSelectedVersionId] = useState("")
  const [branchView, setBranchView] = useState<BranchView>("system")
  const [filterOpen, setFilterOpen] = useState(false)
  const [valueFilterOpen, setValueFilterOpen] = useState(false)
  const [selectedViewValue, setSelectedViewValue] = useState("All")
  const [variantName, setVariantName] = useState("")
  const [supplierName, setSupplierName] = useState("")
  const [message, setMessage] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const hierarchyLabel = formatProcedureHierarchy(procedure)
  const profile = getProfile()
  const activeTeam = getActiveTeamSnapshot(profile)
  const localOrganization = activeTeam?.internalName ?? profile?.hospital
  const bookmarkId = `shared-index:${libraryId}:${procedure.id}`

  useSyncExternalStore(subscribeLibraries, getLibrariesSnapshot, getLibrariesSnapshot)
  const bookmarks = useSyncExternalStore(subscribeBookmarks, getBookmarksSnapshot, getBookmarksSnapshot)
  const saved = useMemo(() => bookmarks.some((bookmark) => bookmark.id === bookmarkId), [bookmarkId, bookmarks])

  const publishedCards = useMemo(
    () => getPublishedCardsByFamilySnapshot(procedure.familyId),
    [procedure.familyId],
  )
  const branches = useMemo(
    () => buildBranchEntries(libraryId, procedure, variants, publishedCards, localOrganization),
    [libraryId, localOrganization, procedure, variants, publishedCards],
  )
  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === selectedBranchId) ?? null,
    [branches, selectedBranchId],
  )
  const selectedVersion = useMemo(
    () => selectedBranch?.versions.find((version) => version.id === selectedVersionId) ?? null,
    [selectedBranch, selectedVersionId],
  )
  const filteredBranches = useMemo(() => {
    return branches.filter((branch) =>
      selectedViewValue === "All"
        ? true
        : getGroupLabel(branch, branchView, procedure.name) === selectedViewValue,
    )
  }, [branchView, branches, procedure.name, selectedViewValue])
  const orderedBranches = useMemo(() => {
    return [...filteredBranches].sort((left, right) => {
      const leftGroup = getGroupLabel(left, branchView, procedure.name)
      const rightGroup = getGroupLabel(right, branchView, procedure.name)
      const grouped = leftGroup.localeCompare(rightGroup)
      if (grouped !== 0) return grouped
      return left.systemName.localeCompare(right.systemName)
    })
  }, [branchView, filteredBranches, procedure.name])
  const availableViewValues = useMemo(() => {
    if (branchView === "system") return []
    return [
      "All",
      ...Array.from(new Set(branches.map((branch) => getGroupLabel(branch, branchView, procedure.name)))).sort((a, b) => a.localeCompare(b)),
    ]
  }, [branchView, branches, procedure.name])

  function handleToggleNavigation() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopNavOpen((value) => !value)
      return
    }
    setMobileMenuOpen((value) => !value)
  }

  function handleSelectBranch(branch: BranchEntry) {
    setSelectedBranchId((current) => (current === branch.id ? "" : branch.id))
    setSelectedVersionId("")
  }

  function handleSelectVersion(branch: BranchEntry, version: PublishedVersion) {
    setSelectedBranchId(branch.id)
    setSelectedVersionId(version.id)
  }

  function handleStartCreate(branch: BranchEntry) {
    setSelectedBranchId(branch.id)
    setVariantName(`${branch.systemName} - My Team`)
    setSupplierName(branch.supplierName ?? branch.systemName)
    setComposerOpen(true)
    setMessage("")
  }

  function handleCreateVariant() {
    const trimmedVariantName = variantName.trim()
    const trimmedSupplierName = supplierName.trim()

    if (!selectedBranch) {
      setMessage("Select a branch first.")
      return
    }

    if (!trimmedVariantName) {
      setMessage("Enter the version name.")
      return
    }

    if (!trimmedSupplierName) {
      setMessage("Enter the supplier or system.")
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
          description: `Local ${procedure.name} version based on ${selectedBranch.systemName}.`,
          implantSystem: trimmedSupplierName,
          sections: buildSystemCardSections(
            procedure,
            selectedBranch.variantId,
            selectedBranch.variantName,
            selectedBranch.systemId,
            selectedBranch.systemName,
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
      setMessage("Unable to create version right now.")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="app-shell-bg min-h-screen bg-[#F6FAFC] text-[#10243E]">
      <AppTopBar
        menuOpen={mobileMenuOpen}
        onToggleMenu={handleToggleNavigation}
        menuContent={<AppMenuContent />}
        searchPlaceholder="Search anywhere..."
        mobileMenuOnly
      />

      <main className="w-full px-4 pb-8 pt-4 lg:pl-0 lg:pr-4 lg:pt-4 lg:pb-4">
        <div className={`lg:grid lg:gap-4 ${desktopNavOpen ? "lg:grid-cols-[210px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]"}`}>
          {desktopNavOpen ? <WorkspaceNavRail currentNav="collections" /> : null}

          <div className="min-w-0 lg:px-8 lg:pt-4">
            <section className="px-1 pb-2">
              <p className="text-[13px] text-[#5B7A8A]">Community</p>
              <h1 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E] lg:text-[30px]">
                {procedure.name}
              </h1>
              <p className="mt-2 text-[15px] leading-7 text-[#5B7A8A] lg:text-[16px]">{hierarchyLabel}</p>
              <p className="mt-3 max-w-[72rem] text-[15px] leading-7 text-[#61758B] lg:text-[16px]">
                {getOverviewText(procedure)}
              </p>
            </section>

            <section className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#D5EAF1] pb-3 text-[14px] lg:text-[15px]">
              <button
                type="button"
                onClick={() => {
                  setComposerOpen((value) => !value)
                  setMessage("")
                }}
                className="inline-flex items-center gap-1.5 text-[#0F4C5C] hover:text-[#10243E]"
              >
                <Plus size={14} />
                Create My Team version
              </button>
              <button
                type="button"
                onClick={() => {
                  if (saved) {
                    removeBookmark(bookmarkId)
                    return
                  }

                  saveBookmark({
                    id: bookmarkId,
                    title: procedure.name,
                    subtitle: `Community | ${hierarchyLabel}`,
                    href: `/libraries/${libraryId}/cards/${procedure.id}`,
                  })
                }}
                className="inline-flex items-center gap-1.5 text-[#0F4C5C] hover:text-[#10243E]"
              >
                <Bookmark size={14} />
                {saved ? "Bookmarked" : "Bookmark"}
              </button>
            </section>

            <section className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-[#61758B] lg:text-[15px]">
              <span className="inline-flex items-center gap-1.5">
                <GitBranch size={13} />
                {branches.length} total branches
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Heart size={13} />
                Published versions are community-visible
              </span>
            </section>

            <section className="mt-6">
              <div className="flex items-center justify-between border-b border-[#D9EBF0] px-1 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-[13px] lg:text-[14px]">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFilterOpen((value) => !value)}
                      className="inline-flex items-center gap-2 rounded-[8px] border border-[#C9E3EE] bg-[#EEF6FA] px-3 py-1.5 text-[#406175] hover:bg-[#DFF2FA]"
                    >
                      <span>View by: {getViewLabel(branchView)}</span>
                      <span className={`text-[11px] leading-none transition-transform ${filterOpen ? "rotate-180" : ""}`}>▼</span>
                    </button>

                    {filterOpen ? (
                      <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[13rem] rounded-[14px] border border-[#D5EAF1] bg-white p-2 shadow-[0_16px_30px_rgba(16,36,62,0.12)]">
                        {([
                          ["approach", "By Approach"],
                          ["supplier", "By Supplier"],
                          ["system", "By System"],
                          ["classification", "By Classification"],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setBranchView(value)
                              setFilterOpen(false)
                              setSelectedViewValue("All")
                              setValueFilterOpen(false)
                            }}
                            className={`block w-full rounded-[10px] px-3 py-2 text-left text-[14px] ${
                              branchView === value
                                ? "bg-[#F0FAFC] text-[#10243E]"
                                : "text-[#406175] hover:bg-[#EAF7FD]"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {branchView !== "system" ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setValueFilterOpen((value) => !value)}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-[#C9E3EE] bg-[#EEF6FA] px-3 py-1.5 text-[#406175] hover:bg-[#DFF2FA]"
                      >
                        <span>{getViewLabel(branchView)}: {selectedViewValue}</span>
                        <span className={`text-[11px] leading-none transition-transform ${valueFilterOpen ? "rotate-180" : ""}`}>▼</span>
                      </button>

                      {valueFilterOpen ? (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[15rem] rounded-[14px] border border-[#D5EAF1] bg-white p-2 shadow-[0_16px_30px_rgba(16,36,62,0.12)]">
                          {availableViewValues.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setSelectedViewValue(value)
                                setValueFilterOpen(false)
                              }}
                              className={`block w-full rounded-[10px] px-3 py-2 text-left text-[14px] ${
                                selectedViewValue === value
                                  ? "bg-[#F0FAFC] text-[#10243E]"
                                  : "text-[#406175] hover:bg-[#EAF7FD]"
                              }`}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <span className="ml-1 text-[13px] text-[#61758B] lg:text-[14px]">
                    {orderedBranches.length} total {orderedBranches.length === 1 ? "branch" : "branches"}
                  </span>
                </div>

                {composerOpen ? (
                  <button
                    type="button"
                    onClick={() => setComposerOpen(false)}
                    className="text-[16px] text-[#61758B]"
                    aria-label="Close create version"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>

              {composerOpen ? (
                <div className="border-b border-[#E3EDF1] px-1 py-4">
                  <div className="mb-3 text-[14px] text-[#61758B]">
                    {selectedBranch
                      ? <>Creating from <span className="text-[#10243E]">{selectedBranch.systemName}</span>.</>
                      : <>Select a branch below first, then create a My Team version from that branch.</>}
                  </div>
                  <div className="space-y-3">
                    <input
                      value={variantName}
                      onChange={(event) => setVariantName(event.target.value)}
                      placeholder="My Team version name"
                      className="w-full rounded-[6px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[15px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                    />
                    <input
                      value={supplierName}
                      onChange={(event) => setSupplierName(event.target.value)}
                      placeholder="Implant system or supplier"
                      className="w-full rounded-[6px] border border-[#D5EAF1] bg-[#F8FBFD] px-3 py-2.5 text-[15px] text-[#10243E] outline-none placeholder:text-[#7B8EA3]"
                    />
                    {message ? <p className="text-[14px] text-[#B65454]">{message}</p> : null}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isCreating}
                        onClick={handleCreateVariant}
                        className="rounded-[6px] bg-[#2A96A8] px-3 py-2 text-[14px] text-white disabled:opacity-60"
                      >
                        {isCreating ? "Creating..." : "Create My Team version"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                {orderedBranches.length > 0 ? orderedBranches.map((branch) => {
                  const expanded = selectedBranchId === branch.id

                  return (
                    <div key={branch.id} className="border-b border-[#E3EDF1] px-1 py-1 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => handleSelectBranch(branch)}
                        className="flex w-full items-center justify-between gap-4 rounded-[8px] px-2 py-2 text-left transition-colors hover:bg-[#C7EAF7]"
                      >
                        <span className="min-w-0 text-[15px] text-[#10243E] lg:text-[16px]">
                          <span className="inline-flex flex-wrap items-center gap-y-1">
                            <span>{branch.systemName}</span>
                            {branch.approach ? <span className="mx-2.5 text-[#61758B]">|</span> : null}
                            {branch.approach ? <span className="text-[#61758B]">{branch.approach}</span> : null}
                            {branch.supplierName ? <span className="mx-2.5 text-[#61758B]">|</span> : null}
                            {branch.supplierName ? <span className="text-[#61758B]">{branch.supplierName}</span> : null}
                            <span className="mx-2.5 text-[#61758B]">|</span>
                            <span className="text-[#61758B]">{branch.versions.length} published version{branch.versions.length === 1 ? "" : "s"}</span>
                            {branch.defaultBranch ? <span className="mx-2.5 text-[#61758B]">|</span> : null}
                            {branch.defaultBranch ? <span className="text-[#0F4C5C]">Default</span> : null}
                          </span>
                        </span>
                        <ChevronDown size={16} className={`shrink-0 text-[#61758B] transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </button>

                      {expanded ? (
                        <div className="pb-2 pl-6">
                          <div className="ml-3 border-l border-[#D9EBF0] pl-5">
                            {branch.versions.length > 0 ? branch.versions.map((version) => (
                              <button
                                key={version.id}
                                type="button"
                                onClick={() => handleSelectVersion(branch, version)}
                                className="flex w-full items-center justify-between gap-4 rounded-[8px] px-2 py-2 text-left hover:bg-[#EAF7FD]"
                              >
                                <span className="min-w-0 text-[14px] text-[#10243E] lg:text-[15px]">
                                  <span className="inline-flex flex-wrap items-center gap-y-1">
                                    <span>{version.name}</span>
                                    <span className="mx-2 text-[#61758B]">|</span>
                                    <span className="text-[#61758B]">{version.organization}</span>
                                    <span className="mx-2 text-[#61758B]">|</span>
                                    <span className="text-[#61758B]">{version.likes} likes</span>
                                    <span className="mx-2 text-[#61758B]">|</span>
                                    <span className="text-[#61758B]">{version.views} views</span>
                                  </span>
                                </span>
                                {version.recommended ? <span className="text-[12px] text-[#0F4C5C]">Recommended</span> : null}
                              </button>
                            )) : (
                              <div className="px-2 py-3 text-[14px] text-[#61758B]">
                                No published versions yet for this branch.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                }) : (
                  <div className="px-1 py-6 text-[14px] text-[#61758B] lg:text-[15px]">
                    No branches match the current filters.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {selectedVersion ? (
        <button
          type="button"
          onClick={() => setSelectedVersionId("")}
          className="fixed inset-0 z-30 bg-[#10243E]/18"
          aria-label="Close version details"
        />
      ) : null}
      <VersionDrawer
        branch={selectedBranch}
        version={selectedVersion}
        onClose={() => setSelectedVersionId("")}
      />
    </div>
  )
}
