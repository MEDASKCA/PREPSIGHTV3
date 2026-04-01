"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Menu, Search, UserCircle2, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { getLibrariesSnapshot, getLibraryCardsSnapshot, subscribeLibraries } from "@/lib/libraries"
import { getProcedureLibrarySnapshot, subscribeProcedureLibrary } from "@/lib/procedure-library"
import type { Procedure } from "@/lib/types"
import type { ReactNode } from "react"

type SearchItem = {
  id: string
  title: string
  subtitle: string
  href: string
  keywords: string[]
  kind: "page" | "library" | "guide"
}

const STATIC_SEARCH_ITEMS: SearchItem[] = [
  { id: "page:home", title: "Home", subtitle: "Dashboard", href: "/", keywords: ["home", "dashboard", "workspace"], kind: "page" },
  { id: "page:review", title: "Review", subtitle: "Validation and moderation", href: "/review", keywords: ["review", "moderation", "validation"], kind: "page" },
  { id: "page:calendar", title: "Calendar", subtitle: "Schedule and case planning", href: "/calendar", keywords: ["calendar", "schedule", "cases"], kind: "page" },
  { id: "page:catalogue", title: "Catalogue", subtitle: "Products and stock", href: "/catalogue", keywords: ["catalogue", "catalog", "products", "stock", "stockroom"], kind: "page" },
  { id: "page:directory", title: "Directory", subtitle: "Hospitals and trusts", href: "/directory", keywords: ["directory", "hospitals", "trusts"], kind: "page" },
  { id: "page:settings-profile", title: "Profile", subtitle: "Profile and workspace settings", href: "/settings/profile", keywords: ["profile", "settings", "workspace"], kind: "page" },
  { id: "page:settings-access", title: "Access", subtitle: "Access and appearance", href: "/settings/access", keywords: ["access", "appearance", "settings"], kind: "page" },
  { id: "page:settings-notifications", title: "Notifications", subtitle: "Notification settings", href: "/settings/notifications", keywords: ["notifications", "alerts", "settings"], kind: "page" },
  { id: "page:new-procedure", title: "New procedure", subtitle: "Create a new procedure guide", href: "/procedures/new", keywords: ["new", "procedure", "guide", "create"], kind: "page" },
]

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s/.-]+/g, " ").replace(/\s+/g, " ").trim()
}

function getProcedureSearchHref(procedure: Procedure): string {
  return `/procedures/${procedure.id}`
}

function scoreSearchItem(item: SearchItem, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return null

  const title = normalizeSearchText(item.title)
  const subtitle = normalizeSearchText(item.subtitle)
  const haystack = `${title} ${subtitle} ${item.keywords.map(normalizeSearchText).join(" ")}`
  const tokens = normalizedQuery.split(" ").filter(Boolean)
  if (tokens.length === 0) return null

  let score = 0
  for (const token of tokens) {
    if (title.startsWith(token)) score += 8
    else if (title.includes(token)) score += 5
    else if (subtitle.includes(token)) score += 3
    else if (haystack.includes(token)) score += 1
    else {
      const condensed = haystack.replace(/\s+/g, "")
      if (!condensed.includes(token.replace(/\s+/g, ""))) return null
      score += 0.5
    }
  }

  if (title === normalizedQuery) score += 10
  if (tokens.every((token) => title.includes(token))) score += 4
  if (item.kind === "page") score += 0.3

  return score
}

export default function AppTopBar({
  menuOpen,
  onToggleMenu,
  menuContent,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search",
}: {
  menuOpen: boolean
  onToggleMenu: () => void
  menuContent?: ReactNode
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const libraries = useSyncExternalStore(subscribeLibraries, getLibrariesSnapshot, getLibrariesSnapshot)
  const procedures = useSyncExternalStore(
    subscribeProcedureLibrary,
    getProcedureLibrarySnapshot,
    getProcedureLibrarySnapshot,
  )
  const [query, setQuery] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const searchItems = useMemo<SearchItem[]>(() => {
    const libraryItems = libraries.map((library) => ({
      id: `library:${library.id}`,
      title: library.name,
      subtitle: library.libraryType === "shared" ? "PrepSight Library" : `${library.ownerName} Library`,
      href: `/libraries/${library.id}`,
      keywords: [library.description ?? "", library.ownerName, library.libraryType, "library", "repository"],
      kind: "library" as const,
    }))

    const cardItems = libraries.flatMap((library) =>
      getLibraryCardsSnapshot(library.id).map((card) => ({
        id: `guide:${library.id}:${card.id}`,
        title: card.name,
        subtitle: `${library.libraryType === "shared" ? "PrepSight Library" : library.ownerName} · ${card.specialty}${card.implantSystem ? ` · ${card.implantSystem}` : ""}`,
        href: `/libraries/${library.id}/cards/${card.id}`,
        keywords: [
          card.description ?? "",
          card.specialty,
          card.setting,
          card.implantSystem ?? "",
          card.variantLabel ?? "",
          card.familyId,
          "procedure",
          "guide",
          "card",
        ],
        kind: "guide" as const,
      })),
    )

    const procedureItems = procedures.map((procedure) => ({
      id: `procedure:${procedure.id}`,
      title: procedure.name,
      subtitle: `${procedure.setting} · ${procedure.specialty}`,
      href: getProcedureSearchHref(procedure),
      keywords: [
        procedure.description ?? "",
        procedure.specialty,
        procedure.setting,
        procedure.approach ?? "",
        ...(procedure.aliases ?? []),
      ],
      kind: "guide" as const,
    }))

    const deduped = new Map<string, SearchItem>()
    for (const item of [...STATIC_SEARCH_ITEMS, ...libraryItems, ...cardItems, ...procedureItems]) {
      if (!deduped.has(item.href)) deduped.set(item.href, item)
    }
    return Array.from(deduped.values())
  }, [libraries, procedures])

  const results = useMemo(() => {
    if (!query.trim()) return []
    return searchItems
      .map((item) => ({ item, score: scoreSearchItem(item, query) }))
      .filter((entry): entry is { item: SearchItem; score: number } => entry.score !== null)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        return left.item.title.localeCompare(right.item.title)
      })
      .slice(0, 8)
      .map((entry) => entry.item)
  }, [query, searchItems])

  useEffect(() => {
    setQuery("")
    setSearchOpen(false)
    setHighlightedIndex(0)
  }, [pathname])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSearchOpen(false)
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  function handleSelect(item: SearchItem) {
    setQuery("")
    setSearchOpen(false)
    router.push(item.href)
  }

  return (
    <div ref={rootRef} className="sticky top-0 z-30">
      <header className="relative border-b border-[#4EA8B8] bg-[#2A96A8] px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMenu}
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#6FBECB] bg-white/78 text-[#10243E]"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <Link href="/" className="flex items-center">
              <span className="app-display-font text-[26px] tracking-[-0.05em] text-white">
                PrepSight
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#6FBECB] bg-white/78 text-[#10243E]"
              aria-label="Activity"
            >
              <Bell size={17} />
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#6FBECB] bg-white/78 text-[#10243E]"
              aria-label="Profile"
            >
              <UserCircle2 size={18} />
            </button>
          </div>
        </div>

        {menuOpen && menuContent ? (
          <div className="absolute left-3 top-full z-40 mt-2 w-[calc(50vw-0.75rem)] min-w-[14rem] max-w-[18rem] rounded-[12px] border border-[#5FAFBE] bg-[#D9EEF2] p-2 shadow-[0_12px_32px_rgba(16,36,62,0.18)]">
            {menuContent}
          </div>
        ) : null}
      </header>

      <div className="relative border-b border-[#CFE3E8] bg-[#F4F7FA] px-3 py-3">
        <label className="flex min-w-0 items-center gap-2 rounded-[12px] border border-[#CFE3E8] bg-white px-3 py-2.5">
          <Search size={16} className="shrink-0 text-[#61758B]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (!results.length) return
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setHighlightedIndex((current) => (current + 1) % results.length)
              } else if (event.key === "ArrowUp") {
                event.preventDefault()
                setHighlightedIndex((current) => (current - 1 + results.length) % results.length)
              } else if (event.key === "Enter") {
                event.preventDefault()
                handleSelect(results[highlightedIndex] ?? results[0])
              }
            }}
            placeholder="Search anywhere..."
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[#10243E] outline-none placeholder:text-[#7A8DA3]"
          />
        </label>

        {searchOpen && query.trim() ? (
          <div className="absolute inset-x-3 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[16px] border border-[#CFE3E8] bg-white shadow-[0_18px_40px_rgba(16,36,62,0.18)]">
            {results.length > 0 ? (
              <div className="max-h-[min(60vh,28rem)] overflow-y-auto py-2">
                {results.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left ${index === highlightedIndex ? "bg-[#F0FAFC]" : "bg-white hover:bg-[#F8FBFD]"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] text-[#10243E]">{item.title}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-[#61758B]">{item.subtitle}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#F2FAFD] px-2 py-1 text-[11px] text-[#406175]">
                      {item.kind === "page" ? "Page" : item.kind === "library" ? "Library" : "Guide"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-4 text-[13px] text-[#61758B]">
                No matches for "{query}".
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
