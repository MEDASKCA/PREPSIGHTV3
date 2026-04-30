"use client"

import Link from "next/link"
import { useMemo, useState, useSyncExternalStore } from "react"
import { Bookmark, Search, Trash2 } from "lucide-react"
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
        <p className="text-[13px] text-[#7f7f7f] lg:hidden">my team</p>
        <h1 className="mt-1 text-[28px] tracking-[-0.04em] text-white lg:hidden lg:text-[30px]">bookmarks</h1>
        <p className="mt-0 text-[15px] leading-7 text-[#9a9a9a] lg:text-[16px]">
          Keep quick links to community procedures and versions you want to return to.
        </p>
      </section>

      <section className="mt-5 flex flex-wrap items-center gap-3 border-b border-[#2d2d2d] pb-3 text-[14px] text-[#8f8f8f] lg:text-[15px]">
        <span>{filteredBookmarks.length} saved {filteredBookmarks.length === 1 ? "bookmark" : "bookmarks"}</span>
        {query ? <span>matching "{query}"</span> : null}
      </section>

      <section className="mt-4">
        {filteredBookmarks.length > 0 ? (
          <div className="overflow-hidden rounded-[12px] border border-[#2d2d2d] bg-[#161616]">
            {filteredBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="flex items-center justify-between gap-4 border-b border-[#252525] px-4 py-3 last:border-b-0 hover:bg-[#1d1d1d]">
                <Link href={bookmark.href} className="min-w-0 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-[10px] border border-[#2d2d2d] bg-[#202020] p-2 text-white">
                      <Bookmark size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[15px] text-white lg:text-[16px]">{bookmark.title}</div>
                      <div className="mt-1 truncate text-[13px] text-[#8f8f8f] lg:text-[14px]">{bookmark.subtitle}</div>
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  className="shrink-0 rounded-[10px] p-2 text-[#8f8f8f] hover:bg-[#202020] hover:text-white"
                  aria-label={`Remove ${bookmark.title} from bookmarks`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[12px] border border-[#2d2d2d] bg-[#161616] px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#202020] text-white">
              {query ? <Search size={18} /> : <Bookmark size={18} />}
            </div>
            <div className="mt-4 text-[16px] text-white">
              {query ? "No bookmarks match that search." : "No bookmarks yet."}
            </div>
            <div className="mt-2 text-[14px] leading-6 text-[#8f8f8f]">
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
      sectionLabel="Library Bookmarks"
    >
      {content}
    </LibraryAppShell>
  )
}
