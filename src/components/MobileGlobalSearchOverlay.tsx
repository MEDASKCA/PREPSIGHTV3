"use client"

import { Search, X } from "lucide-react"
import { Fragment, useEffect, useMemo, useRef, useState } from "react"

type SearchGroupKey = "messages" | "procedures" | "people" | "resources"

type SearchResult = {
  id: string
  title: string
  line1: string
  line2: string
  keywords: string[]
  badge?: string
}

type SearchGroup = {
  key: SearchGroupKey
  title: string
  results: SearchResult[]
}

const DEFAULT_RECENTS = [
  "lap chole",
  "Spinal anaesthesia checklist",
  "Dr Ahmed Khan",
  "ERAS protocol",
  "Theatre 3 schedule",
]

const CATEGORY_CARDS = [
  { key: "messages", title: "Messages", subtitle: "Chats and discussions" },
  { key: "procedures", title: "Procedures", subtitle: "SOPs and techniques" },
  { key: "people", title: "People", subtitle: "Staff and contacts" },
  { key: "resources", title: "Resources", subtitle: "Files and documents" },
] as const

const DEFAULT_CATEGORY_FILTERS: SearchGroupKey[] = ["messages", "procedures", "people", "resources"]

const SEARCH_GROUPS: SearchGroup[] = [
  {
    key: "procedures",
    title: "Procedures",
    results: [
      {
        id: "procedure-lap-chole",
        title: "Laparoscopic Cholecystectomy",
        line1: "General Surgery",
        line2: "Royal Free Hospital · Updated 2w ago",
        keywords: ["lap chole", "laparoscopic cholecystectomy", "cholecystectomy", "general surgery"],
      },
      {
        id: "procedure-spinal-checklist",
        title: "Spinal Anaesthesia Checklist",
        line1: "Anaesthetics",
        line2: "Royal Free Hospital · Updated 5d ago",
        keywords: ["spinal anaesthesia checklist", "spinal", "anaesthesia", "checklist"],
      },
      {
        id: "procedure-eras",
        title: "ERAS Protocol",
        line1: "Perioperative pathway",
        line2: "Royal Free Hospital · Updated 1w ago",
        keywords: ["eras protocol", "eras", "protocol", "enhanced recovery"],
      },
    ],
  },
  {
    key: "messages",
    title: "Messages",
    results: [
      {
        id: "message-tom-lap-chole",
        title: "TOM",
        line1: "\"Lap chole set missing clips for 5mm.\"",
        line2: "Theatres Chat · 19:46",
        keywords: ["lap chole", "clips", "5mm", "tom", "theatres chat"],
      },
      {
        id: "message-skye-cali-lap-chole",
        title: "Skye and Cali",
        line1: "\"Voice call · Lap chole case discussion\"",
        line2: "19:06 · 21s",
        keywords: ["lap chole", "voice call", "case discussion", "skye", "cali"],
      },
      {
        id: "message-theatre-3-schedule",
        title: "Theatre Coordination",
        line1: "\"Theatre 3 schedule updated for the afternoon list.\"",
        line2: "Theatres Chat · 08:15",
        keywords: ["theatre 3 schedule", "theatre 3", "schedule", "afternoon list"],
      },
    ],
  },
  {
    key: "people",
    title: "People",
    results: [
      {
        id: "person-ahmed-khan",
        title: "Dr Ahmed Khan",
        line1: "Consultant General Surgeon",
        line2: "Royal Free Hospital",
        keywords: ["dr ahmed khan", "ahmed khan", "consultant general surgeon", "general surgeon"],
      },
      {
        id: "person-skye-porter",
        title: "Skye Porter",
        line1: "Senior Scrub Practitioner",
        line2: "Royal Free Hospital",
        keywords: ["skye porter", "skye", "scrub practitioner"],
      },
      {
        id: "person-cali-james",
        title: "Cali James",
        line1: "Theatre Coordinator",
        line2: "Royal Free Hospital",
        keywords: ["cali james", "cali", "theatre coordinator"],
      },
    ],
  },
  {
    key: "resources",
    title: "Resources",
    results: [
      {
        id: "resource-lap-chole-checklist",
        title: "Laparoscopic Cholecystectomy checklist",
        line1: "PrepSight Library · Updated 3w ago",
        line2: "Royal Free Hospital",
        keywords: ["lap chole", "laparoscopic cholecystectomy checklist", "checklist", "pdf"],
        badge: "PDF",
      },
      {
        id: "resource-spinal-checklist-pdf",
        title: "Spinal Anaesthesia Checklist",
        line1: "PrepSight Library · Updated 1w ago",
        line2: "Department resource",
        keywords: ["spinal anaesthesia checklist", "spinal", "anaesthesia", "pdf"],
        badge: "PDF",
      },
      {
        id: "resource-eras-protocol",
        title: "ERAS Protocol",
        line1: "PrepSight Library · Updated 6d ago",
        line2: "Enhanced recovery pathway",
        keywords: ["eras protocol", "eras", "protocol"],
        badge: "DOC",
      },
    ],
  },
]

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

function matchesQuery(query: string, result: SearchResult) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return true
  const tokens = normalizedQuery.split(" ").filter(Boolean)
  const haystack = normalize([result.title, result.line1, result.line2, ...result.keywords].join(" "))
  return tokens.every((token) => haystack.includes(token))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function renderHighlightedText(text: string, query: string) {
  const tokens = Array.from(new Set(normalize(query).split(" ").filter(Boolean))).sort((left, right) => right.length - left.length)
  if (tokens.length === 0) return text

  const pattern = tokens.map(escapeRegExp).join("|")
  if (!pattern) return text

  const regex = new RegExp(`(${pattern})`, "gi")
  const parts = text.split(regex)

  return parts.map((part, index) => {
    const matched = tokens.some((token) => part.toLowerCase() === token.toLowerCase())
    return matched ? (
      <span key={`${part}-${index}`} className="text-[#67CFCF]">
        {part}
      </span>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    )
  })
}

export default function MobileGlobalSearchOverlay({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENTS)
  const [activeCategoryFilters, setActiveCategoryFilters] = useState<SearchGroupKey[]>(DEFAULT_CATEGORY_FILTERS)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setActiveCategoryFilters(DEFAULT_CATEGORY_FILTERS)
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timeout)
  }, [open])

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return []
    return SEARCH_GROUPS
      .filter((group) => activeCategoryFilters.includes(group.key))
      .map((group) => ({
        ...group,
        results: group.results.filter((result) => matchesQuery(query, result)),
      }))
      .filter((group) => group.results.length > 0)
  }, [activeCategoryFilters, query])

  function toggleCategoryFilter(key: SearchGroupKey) {
    setActiveCategoryFilters((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  if (!open) return null

  return (
    <>
      <style jsx global>{`
        @keyframes mobileGlobalSearchFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileGlobalSearchDrawerIn {
          from { transform: translateX(-28px) scale(0.985); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[35] bg-black/58 text-white lg:hidden"
        style={{ animation: "mobileGlobalSearchFadeIn 260ms ease-out both" }}
        onClick={onClose}
      >
        <div
          className="h-full w-[min(88vw,29rem)] overflow-y-auto rounded-r-[32px] rounded-tl-[24px] border-r border-t border-[#2d2d2d] bg-[linear-gradient(180deg,#111111_0%,#0a0a0a_100%)] px-4 shadow-[18px_0_44px_rgba(0,0,0,0.5)]"
          style={{
            animation: "mobileGlobalSearchDrawerIn 300ms cubic-bezier(0.22,1,0.36,1) both",
            paddingTop: "calc(env(safe-area-inset-top,0px) + 12px)",
            paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 108px)",
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="mb-2 flex items-start justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#d8d8d8] transition-colors hover:bg-[#1a1a1a] hover:text-white"
              aria-label="Close search"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center">
            <label className="flex min-w-0 flex-1 items-center rounded-full border border-[#2d2d2d] bg-[#161616] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anything"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#6f6f6f]"
              />
            </label>
          </div>

          {!query.trim() ? (
            <div className="pt-5">
              <section className="mt-2">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[16px] text-white">Recent searches</h2>
                  {recentSearches.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setRecentSearches([])}
                      className="text-[13px] text-[#0096C7] hover:text-[#67cfcf]"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
                <div>
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="flex w-full items-center gap-3 px-1 py-3 text-left hover:bg-[#141414]"
                    >
                      <Search size={14} className="shrink-0 text-[#6f6f6f]" />
                      <span className="text-[14px] text-[#d8d8d8]">{item}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="pt-6">
              {filteredGroups.length > 0 ? (
                <div className="space-y-6">
                  {filteredGroups.map((group) => {
                    return (
                      <section key={group.key}>
                        <div className="mb-3 flex items-center justify-between">
                          <h2 className="text-[16px] text-white">{group.title}</h2>
                          <button type="button" className="text-[13px] text-[#0096C7] hover:text-[#67cfcf]">
                            View all
                          </button>
                        </div>

                        <div>
                          {group.results.map((result) => (
                            <article
                              key={result.id}
                              className="border-b border-[#181818] px-1 py-3 last:border-b-0"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[14px] text-white">{renderHighlightedText(result.title, query)}</p>
                                  <p className="mt-0.5 text-[12px] text-[#b0b0b0]">{renderHighlightedText(result.line1, query)}</p>
                                  <p className="mt-0.5 text-[11px] text-[#7f7f7f]">{renderHighlightedText(result.line2, query)}</p>
                                </div>
                                {result.badge ? (
                                  <span className="shrink-0 rounded-full border border-[#1f1f1f] bg-[#101010] px-2 py-0.5 text-[10px] text-[#0096C7]">
                                    {result.badge}
                                  </span>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              ) : (
                <div className="pt-20 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#151515] text-[#0096C7]">
                    <Search size={24} />
                  </div>
                  <p className="mt-5 text-[20px] text-white">No results found</p>
                  <p className="mt-2 text-[14px] text-[#8f8f8f]">
                    Try another term or browse one of the search categories.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
