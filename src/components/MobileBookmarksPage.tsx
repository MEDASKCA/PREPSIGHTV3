"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import BookmarksPageClient from "@/components/BookmarksPageClient"
import MobileWorkspaceChildShell from "@/components/MobileWorkspaceChildShell"
import { getBookmarksSnapshot, subscribeBookmarks } from "@/lib/bookmarks"

function normalizeText(value: string) {
  return value.toLowerCase().trim()
}

export default function MobileBookmarksPage() {
  const [query, setQuery] = useState("")
  const bookmarks = useSyncExternalStore(subscribeBookmarks, getBookmarksSnapshot, getBookmarksSnapshot)

  const filteredBookmarks = useMemo(() => {
    const normalizedQuery = normalizeText(query)
    if (!normalizedQuery) return bookmarks

    return bookmarks.filter((bookmark) =>
      normalizeText(`${bookmark.title} ${bookmark.subtitle}`).includes(normalizedQuery),
    )
  }, [bookmarks, query])

  return (
    <MobileWorkspaceChildShell
      parentTitle="Library"
      childTitle="Bookmarks"
      activeSurface="library"
      searchValue={query}
      onSearchChange={setQuery}
      searchPlaceholder="Search bookmarks..."
    >
      <BookmarksPageClient embedded queryOverride={query} filteredBookmarksOverride={filteredBookmarks} />
    </MobileWorkspaceChildShell>
  )
}
