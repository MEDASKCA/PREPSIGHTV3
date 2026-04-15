"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, Eye, GitBranch, Heart, MessageCircle, Plus, Send, X } from "lucide-react"
import AppMenuContent from "@/components/AppMenuContent"
import AppTopBar from "@/components/AppTopBar"
import TriangleIcon from "@/components/TriangleIcon"
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

function buildBranchSummary(branch: BranchEntry) {
  const parts = [
    branch.systemName,
    branch.approach?.trim(),
    branch.supplierName?.trim(),
    `${branch.versions.length} published version${branch.versions.length === 1 ? "" : "s"}`,
    branch.defaultBranch ? "Default" : null,
  ].filter(Boolean)

  return parts.join(" | ")
}

function getPublishedVersionLabel(count: number) {
  return `${count} published version${count === 1 ? "" : "s"}`
}

function buildVersionSummary(version: PublishedVersion) {
  return `Version: ${version.name}`
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

function cardMatchesBranch(card: Procedure, systemName: string, supplierName?: string, approach?: string) {
  const normalizedSystem = normalizeText(systemName)
  const normalizedSupplier = normalizeText(supplierName)
  const normalizedApproach = normalizeText(approach)
  const cardSystem = normalizeText(card.implantSystem)
  const cardDescription = normalizeText(card.description)
  const cardApproach = normalizeText(card.approach)
  const haystack = normalizeText(`${card.name} ${card.implantSystem ?? ""} ${card.description ?? ""}`)

  if (cardSystem) {
    return cardSystem.includes(normalizedSystem)
  }

  if (normalizedSupplier && haystack.includes(normalizedSupplier)) {
    return !normalizedApproach || cardApproach.includes(normalizedApproach) || cardDescription.includes(normalizedApproach)
  }

  return false
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
        .filter((card) => cardMatchesBranch(card, system.name, system.supplier?.name, variant.approach))
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
      className={`fixed inset-x-0 bottom-0 z-40 max-h-[72vh] w-full rounded-t-[20px] border border-[#0F4C5C] bg-[linear-gradient(180deg,rgba(232,248,252,0.94)_0%,rgba(244,251,255,0.9)_100%)] shadow-[0_-18px_40px_rgba(16,36,62,0.16)] backdrop-blur-xl transition-transform duration-200 ${open ? "translate-y-0 lg:translate-x-0" : "translate-y-full lg:translate-x-full"} lg:inset-y-auto lg:bottom-0 lg:right-0 lg:left-auto lg:top-[72px] lg:max-h-[calc(100vh-72px)] lg:w-full lg:max-w-[28rem] lg:rounded-t-none lg:rounded-l-[18px] lg:border-y lg:border-r-0 lg:border-l lg:shadow-[-18px_0_40px_rgba(16,36,62,0.16)] lg:translate-y-0`}
    >
      <div className="flex h-full flex-col">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-[#B9DCE4] lg:hidden" />
        <div className="flex items-start justify-between border-b border-[#7CB9C7] px-3.5 py-2.5 lg:px-5 lg:py-4">
          <div>
            <div className="text-[13px] text-[#61758B]">Published version</div>
            <div className="mt-0.5 text-[16px] tracking-[-0.03em] text-[#10243E] lg:mt-1 lg:text-[20px]">
              {version?.name ?? "Details"}
              {version ? <span className="ml-2 text-[14px] tracking-normal text-[#61758B]">| {getVersionLinkStatus(version.name)}</span> : null}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-[8px] p-2 text-[#61758B] hover:bg-[#F4FBFF]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3.5 py-3 lg:px-5 lg:py-5">
          {branch && version ? (
            <div className="space-y-3 lg:space-y-5">
              <div>
                <div className="text-[13px] text-[#61758B]">Branch</div>
                <div className="mt-1 text-[13px] leading-5 text-[#10243E] lg:text-[15px] lg:leading-7">
                  {branch.systemName}
                  {branch.approach ? ` | ${branch.approach}` : ""}
                  {branch.supplierName ? ` | ${branch.supplierName}` : ""}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-[#B9DCE4] pb-2.5 text-[13px] text-[#0F4C5C]">
                <span className="inline-flex items-center gap-1">
                  <Heart size={15} />
                  {version.likes}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye size={15} />
                  {version.views}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bookmark size={15} />
                  {version.saves}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle size={15} />
                  {comments.length}
                </span>
              </div>

              <div className="space-y-1.5 border-b border-[#B9DCE4] pb-3 lg:grid lg:gap-3 lg:space-y-0 lg:sm:grid-cols-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5 lg:block lg:text-[15px]">
                  <span className="text-[#61758B]">Contributor</span>
                  <span className="text-[#10243E] lg:mt-1 lg:block">{version.contributor}</span>
                  <span className="text-[#61758B] lg:hidden">Organisation</span>
                  <span className="text-[#10243E] lg:hidden">{version.organization}</span>
                  <span className="text-[#61758B] lg:hidden">Published</span>
                  <span className="text-[#10243E] lg:hidden">{formatDate(version.publishedAt)}</span>
                </div>
                <div className="hidden lg:block">
                  <div className="text-[13px] text-[#61758B]">Organisation</div>
                  <div className="mt-1 text-[15px] text-[#10243E]">{version.organization}</div>
                </div>
                <div className="hidden lg:block">
                  <div className="text-[13px] text-[#61758B]">Published</div>
                  <div className="mt-1 text-[15px] text-[#10243E]">{formatDate(version.publishedAt)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
                <Link
                  href={version.href}
                  className="inline-flex rounded-[10px] bg-[#0077B6] px-3.5 py-2 text-[13px] text-white hover:bg-[#00689f] lg:px-4 lg:text-[14px]"
                >
                  Open version
                </Link>
                <button
                  type="button"
                  className="inline-flex rounded-[10px] bg-[#0077B6] px-3.5 py-2 text-[13px] text-white hover:bg-[#00689f] lg:px-4 lg:text-[14px]"
                >
                  Create My Team version
                </button>
              </div>

              <div className="border-t border-[#B9DCE4] pt-3">
                <div className="flex items-center gap-2 text-[14px] text-[#10243E] lg:text-[15px]">
                  <MessageCircle size={15} />
                  Comments
                </div>

                <div className="mt-2.5 space-y-2.5">
                  {comments.map((comment) => (
                    <div key={comment.id} className="rounded-[12px] border border-[#B9DCE4] bg-[rgba(244,251,255,0.88)] px-3 py-2 backdrop-blur-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[13px] text-[#10243E] lg:text-[14px]">{comment.author}</div>
                        <div className="text-[12px] text-[#61758B]">{comment.createdAt}</div>
                      </div>
                      <div className="mt-1.5 text-[13px] leading-5 text-[#406175] lg:text-[14px] lg:leading-6">{comment.body}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 flex items-start gap-2">
                  <textarea
                    value={commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    placeholder="Add a comment"
                    className="min-h-[64px] flex-1 resize-none rounded-[10px] border border-[#7CB9C7] bg-[rgba(248,251,253,0.92)] px-3 py-2 text-[13px] text-[#10243E] outline-none placeholder:text-[#7B8EA3] backdrop-blur-sm lg:min-h-[76px] lg:py-2.5 lg:text-[14px]"
                  />
                  <button
                    type="button"
                    className="inline-flex h-[36px] items-center gap-1.5 rounded-[10px] bg-[#0077B6] px-3 text-[13px] text-white hover:bg-[#00689f] lg:h-[40px] lg:gap-2 lg:text-[14px]"
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
            </section>

            <section className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 pb-3 text-[14px] lg:border-b lg:border-[#D5EAF1] lg:text-[15px]">
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

            <section className="relative left-1/2 mt-6 w-screen -translate-x-1/2 px-0 lg:left-auto lg:w-auto lg:translate-x-0 lg:px-0">
              <div className="flex items-center justify-between px-1 pb-3 lg:border-b lg:border-[#D9EBF0]">
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
                <div className="px-1 py-4 lg:border-b lg:border-[#E3EDF1]">
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

              <div className="lg:bg-[#F4FBFF]">
                <div className="hidden lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.35fr)_minmax(0,1.2fr)_minmax(88px,0.65fr)_minmax(132px,0.9fr)_20px] lg:items-center lg:gap-3 lg:border-b lg:border-[#0F4C5C] lg:px-0 lg:py-2">
                  <span className="truncate text-[12px] text-[#0F4C5C]">System</span>
                  <span className="truncate text-[12px] text-[#0F4C5C]">Approach</span>
                  <span className="truncate text-[12px] text-[#0F4C5C]">Supplier</span>
                  <span className="truncate text-[12px] text-[#0F4C5C]">Branch</span>
                  <span className="truncate text-right text-[12px] text-[#0F4C5C]">Versions</span>
                  <span aria-hidden="true" />
                </div>
                {orderedBranches.length > 0 ? orderedBranches.map((branch, branchIndex) => {
                  const expanded = selectedBranchId === branch.id

                  return (
                    <div key={branch.id} className="px-0 py-1 lg:px-0 lg:py-0">
                      <button
                        type="button"
                        onClick={() => handleSelectBranch(branch)}
                        className={`group flex w-full items-center justify-between gap-3 rounded-none border-t border-[#0F4C5C] bg-[#D9EFF7] px-4 py-2.5 text-left transition-colors hover:bg-[#C7EAF7] last:border-b last:border-b-[#0F4C5C] lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.35fr)_minmax(0,1.2fr)_minmax(88px,0.65fr)_minmax(132px,0.9fr)_20px] lg:items-center lg:gap-3 lg:border-b lg:border-[#0F4C5C] lg:px-0 lg:py-2.5 lg:hover:bg-[#CFEAF5] ${branchIndex === 0 ? "lg:border-t" : ""}`}
                      >
                        <span className="min-w-0 flex-1 text-[15px] leading-6 text-[#10243E] transition-colors group-hover:lg:text-[#0096C7] lg:text-[15px]">
                          <span className="line-clamp-2 lg:hidden">{buildBranchSummary(branch)}</span>
                          <span className="hidden min-w-0 lg:block lg:truncate">{branch.systemName}</span>
                        </span>
                        <span className="hidden min-w-0 text-[15px] text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7] lg:block lg:truncate">
                          {branch.approach?.trim() || "Not specified"}
                        </span>
                        <span className="hidden min-w-0 text-[15px] text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7] lg:block lg:truncate">
                          {branch.supplierName?.trim() || "Unknown supplier"}
                        </span>
                        <span className="hidden text-[15px] text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7] lg:block lg:truncate">
                          {branch.defaultBranch ? "Default" : ""}
                        </span>
                        <span className="hidden whitespace-nowrap text-right text-[15px] text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7] lg:block">
                          {getPublishedVersionLabel(branch.versions.length)}
                        </span>
                        <span className="hidden lg:flex lg:justify-end">
                          <TriangleIcon
                            direction={expanded ? "up" : "down"}
                            size={11}
                            className="shrink-0 text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7]"
                          />
                        </span>
                        <span className="lg:hidden">
                          <TriangleIcon
                            direction={expanded ? "up" : "down"}
                            size={11}
                            className="shrink-0 text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7]"
                          />
                        </span>
                      </button>

                      {expanded ? (
                        <div className="pb-1.5 pl-0.5 lg:bg-[#F4FBFF] lg:px-0 lg:pb-2 lg:pl-0">
                          <div className="space-y-1 pl-1 lg:space-y-0 lg:pl-0">
                            {branch.versions.length > 0 ? branch.versions.map((version) => (
                              <button
                                key={version.id}
                                type="button"
                                onClick={() => handleSelectVersion(branch, version)}
                                className="group flex w-full items-center justify-between gap-3 rounded-none border-t border-[#A9D3DC] bg-[#F4FBFF] px-4 py-2 text-left hover:bg-[#EAF7FD] last:border-b last:border-b-[#A9D3DC] lg:border-x-0 lg:border-t-0 lg:border-b lg:border-[#B9DCE4] lg:bg-[#F4FBFF] lg:px-0 lg:py-2 lg:hover:bg-[#EDF8FC] last:lg:border-b-0"
                              >
                                <span className="min-w-0 flex-1 text-[14px] text-[#10243E] transition-colors group-hover:lg:text-[#0096C7] lg:text-[15px]">
                                  <span className="block truncate">{buildVersionSummary(version)}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2.5 text-[#0F4C5C] transition-colors group-hover:lg:text-[#0096C7]">
                                  <span
                                    aria-label={`${version.likes} likes`}
                                    className="inline-flex items-center gap-1 text-[13px]"
                                  >
                                    <Heart size={14} />
                                    {version.likes}
                                  </span>
                                  <span
                                    aria-label={`${version.views} views`}
                                    className="inline-flex items-center gap-1 text-[13px]"
                                  >
                                    <Eye size={14} />
                                    {version.views}
                                  </span>
                                </span>
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
          className="fixed inset-0 z-30 bg-[#10243E]/18 lg:top-[72px]"
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
