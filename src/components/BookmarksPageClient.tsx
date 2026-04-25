"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { Bookmark, Search, Trash2 } from "lucide-react"
import DesktopSectionWordmark from "@/components/DesktopSectionWordmark"
import LibraryAppShell from "@/components/LibraryAppShell"
import { getBookmarksSnapshot, removeBookmark, subscribeBookmarks } from "@/lib/bookmarks"

function normalizeText(value: string) {
  return value.toLowerCase().trim()
}

function BookmarksPageContent({
  query,
  filteredBookmarks,
}: {
  query: string
  filteredBookmarks: ReturnType<typeof getBookmarksSnapshot>
}) {
  return (
    <div className="px-1 py-4 lg:px-8 lg:pt-4">
      <section>
        <p className="text-[13px] text-[#5B7A8A] lg:hidden">My Team</p>
        <h1 className="mt-1 text-[28px] tracking-[-0.04em] text-[#10243E] lg:hidden lg:text-[30px]">Bookmarks</h1>
        <div className="hidden lg:block">
          <DesktopSectionWordmark label="Library Bookmarks" />
        </div>
        <p className="mt-3 text-[15px] leading-7 text-[#61758B] lg:text-[16px]">
          Keep quick links to community procedures and versions you want to return to.
        </p>
      </section>

      <section className="mt-5 flex flex-wrap items-center gap-3 border-b border-[#D5EAF1] pb-3 text-[14px] text-[#61758B] lg:text-[15px]">
        <span>{filteredBookmarks.length} saved {filteredBookmarks.length === 1 ? "bookmark" : "bookmarks"}</span>
        {query ? <span>matching "{query}"</span> : null}
      </section>

      <section className="mt-4">
        {filteredBookmarks.length > 0 ? (
          <div className="divide-y divide-[#E3EDF1] overflow-hidden rounded-[16px] border border-[#D9EBF0] bg-white">
            {filteredBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-[#F4FBFF]">
                <Link href={bookmark.href} className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-[10px] bg-[#EAF7FD] p-2 text-[#0F4C5C]">
                      <Bookmark size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] text-[#10243E] lg:text-[16px]">{bookmark.title}</div>
                      <div className="mt-1 truncate text-[13px] text-[#61758B] lg:text-[14px]">{bookmark.subtitle}</div>
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  className="shrink-0 rounded-[10px] p-2 text-[#61758B] hover:bg-[#EAF7FD] hover:text-[#10243E]"
                  aria-label={`Remove ${bookmark.title} from bookmarks`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[16px] border border-[#D9EBF0] bg-white px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF7FD] text-[#0F4C5C]">
              {query ? <Search size={18} /> : <Bookmark size={18} />}
            </div>
            <div className="mt-4 text-[16px] text-[#10243E]">
              {query ? "No bookmarks match that search." : "No bookmarks yet."}
            </div>
            <div className="mt-2 text-[14px] leading-6 text-[#61758B]">
              {query
                ? "Try a different search term."
                : "Use Bookmark on a procedure or version to keep it here."}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default function BookmarksPageClient({ embedded = false }: { embedded?: boolean }) {
  const [query, setQuery] = useState("")
  const bookmarks = useSyncExternalStore(subscribeBookmarks, getBookmarksSnapshot, getBookmarksSnapshot)

  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    if (!normalizedQuery) return bookmarks

    return bookmarks.filter((bookmark) =>
      normalizeText(`${bookmark.title} ${bookmark.subtitle}`).includes(normalizedQuery),
    )
  }, [bookmarks, query])

  const content = <BookmarksPageContent query={query} filteredBookmarks={filteredBookmarks} />

  if (embedded) return content

  return (
    <LibraryAppShell
      currentNav="bookmarks"
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search bookmarks..."
    >
      {content}
    </LibraryAppShell>
  )
}
