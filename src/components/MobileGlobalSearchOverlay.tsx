"use client"

import { ArrowLeft, FileText, FolderSearch, MessageSquareText, Search, Stethoscope, UserRound } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

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
  icon: typeof MessageSquareText
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
  { key: "messages", title: "Messages", subtitle: "Chats and discussions", icon: MessageSquareText },
  { key: "procedures", title: "Procedures", subtitle: "SOPs and techniques", icon: Stethoscope },
  { key: "people", title: "People", subtitle: "Staff and contacts", icon: UserRound },
  { key: "resources", title: "Resources", subtitle: "Files and documents", icon: FolderSearch },
] as const

const SEARCH_GROUPS: SearchGroup[] = [
  {
    key: "procedures",
    title: "Procedures",
    icon: Stethoscope,
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
    icon: MessageSquareText,
    results: [
      {
        id: "message-tom-lap-chole",
        title: "TOM",
        line1: "“Lap chole set missing clips for 5mm.”",
        line2: "Theatres Chat · 19:46",
        keywords: ["lap chole", "clips", "5mm", "tom", "theatres chat"],
      },
      {
        id: "message-skye-cali-lap-chole",
        title: "Skye and Cali",
        line1: "“Voice call · Lap chole case discussion”",
        line2: "19:06 · 21s",
        keywords: ["lap chole", "voice call", "case discussion", "skye", "cali"],
      },
      {
        id: "message-theatre-3-schedule",
        title: "Theatre Coordination",
        line1: "“Theatre 3 schedule updated for the afternoon list.”",
        line2: "Theatres Chat · 08:15",
        keywords: ["theatre 3 schedule", "theatre 3", "schedule", "afternoon list"],
      },
    ],
  },
  {
    key: "people",
    title: "People",
    icon: UserRound,
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
    icon: FileText,
    results: [
      {
        id: "resource-lap-chole-checklist",
        title: "Laparoscopic Cholecystectomy – Checklist",
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

export default function MobileGlobalSearchOverlay({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [recentSearches, setRecentSearches] = useState<string[]>(DEFAULT_RECENTS)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    const timeout = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(timeout)
  }, [open])

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return []
    return SEARCH_GROUPS
      .map((group) => ({
        ...group,
        results: group.results.filter((result) => matchesQuery(query, result)),
      }))
      .filter((group) => group.results.length > 0)
  }, [query])

  if (!open) return null

  return (
    <>
      <style jsx global>{`
        @keyframes mobileGlobalSearchFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mobileGlobalSearchRiseIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[35] overflow-y-auto bg-black text-white"
        style={{
          animation: "mobileGlobalSearchFadeIn 220ms ease-out both",
          paddingTop: "calc(env(safe-area-inset-top,0px) + 10px)",
          paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 108px)",
        }}
      >
        <div
          className="px-3"
          style={{ animation: "mobileGlobalSearchRiseIn 240ms ease-out both" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-[#1a1a1a]"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>

            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[#2d2d2d] bg-[#161616] px-4 py-3">
              <Search size={16} className="shrink-0 text-[#0096C7]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search procedures, messages, people…"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#6f6f6f]"
              />
            </label>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 px-1 text-[15px] text-[#d8d8d8] transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>

          {!query.trim() ? (
            <div className="pt-10">
              <div className="mx-auto flex max-w-[320px] flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#151515] text-[#0096C7]">
                  <Search size={32} />
                </div>
                <h1 className="mt-6 text-[30px] tracking-[-0.04em] text-white">Search everything</h1>
                <p className="mt-3 text-[15px] leading-7 text-[#8f8f8f]">
                  Find procedures, messages, people, resources and more across PrepSight.
                </p>
              </div>

              <section className="mt-10">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[16px] text-white">Search by category</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_CARDS.map((card) => {
                    const Icon = card.icon
                    return (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => setQuery(card.title)}
                        className="rounded-[20px] border border-[#2d2d2d] bg-[#171717] p-4 text-left transition-colors hover:border-[#3a3a3a] hover:bg-[#1d1d1d]"
                      >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111111] text-[#0096C7]">
                          <Icon size={18} />
                        </div>
                        <p className="text-[15px] text-white">{card.title}</p>
                        <p className="mt-1 text-[13px] leading-5 text-[#8f8f8f]">{card.subtitle}</p>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="mt-10">
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
                <div className="overflow-hidden rounded-[20px] border border-[#2d2d2d] bg-[#161616]">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuery(item)}
                      className="flex w-full items-center gap-3 border-b border-[#252525] px-4 py-4 text-left last:border-b-0 hover:bg-[#1d1d1d]"
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
                <div className="space-y-7">
                  {filteredGroups.map((group) => {
                    const Icon = group.icon
                    return (
                      <section key={group.key}>
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#151515] text-[#0096C7]">
                              <Icon size={16} />
                            </span>
                            <h2 className="text-[16px] text-white">{group.title}</h2>
                          </div>
                          <button type="button" className="text-[13px] text-[#0096C7] hover:text-[#67cfcf]">
                            View all
                          </button>
                        </div>

                        <div className="space-y-3">
                          {group.results.map((result) => (
                            <article
                              key={result.id}
                              className="rounded-[20px] border border-[#2d2d2d] bg-[#171717] px-4 py-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[15px] text-white">{result.title}</p>
                                  <p className="mt-1 text-[13px] text-[#b0b0b0]">{result.line1}</p>
                                  <p className="mt-1 text-[12px] text-[#7f7f7f]">{result.line2}</p>
                                </div>
                                {result.badge ? (
                                  <span className="shrink-0 rounded-full border border-[#2d2d2d] bg-[#101010] px-2.5 py-1 text-[11px] text-[#0096C7]">
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
