"use client"

export type BookmarkRecord = {
  id: string
  title: string
  subtitle: string
  href: string
  savedAt: string
}

const BOOKMARKS_STORAGE_KEY = "prepsight_bookmarks"
const BOOKMARKS_EVENT = "prepsight:bookmarks"

let cachedBookmarksRaw: string | null | undefined
let cachedBookmarks: BookmarkRecord[] = []
let cachedSnapshotKey: string | null | undefined
let cachedSnapshot: BookmarkRecord[] = []

function readBookmarks(): BookmarkRecord[] {
  if (typeof window === "undefined") return []

  try {
    const raw = window.localStorage.getItem(BOOKMARKS_STORAGE_KEY)
    if (raw === cachedBookmarksRaw) return cachedBookmarks
    if (!raw) {
      cachedBookmarksRaw = raw
      cachedBookmarks = []
      return cachedBookmarks
    }

    const parsed = JSON.parse(raw)
    cachedBookmarksRaw = raw
    cachedBookmarks = Array.isArray(parsed)
      ? parsed.filter((entry): entry is BookmarkRecord => Boolean(entry) && typeof entry.id === "string")
      : []
    return cachedBookmarks
  } catch {
    return []
  }
}

function writeBookmarks(bookmarks: BookmarkRecord[]): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(bookmarks)
  cachedBookmarksRaw = raw
  cachedBookmarks = bookmarks
  cachedSnapshotKey = undefined
  window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, raw)
}

function emitBookmarksChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(BOOKMARKS_EVENT))
}

export function subscribeBookmarks(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined

  const handler = () => listener()
  window.addEventListener(BOOKMARKS_EVENT, handler)
  window.addEventListener("storage", handler)

  return () => {
    window.removeEventListener(BOOKMARKS_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getBookmarksSnapshot(): BookmarkRecord[] {
  const bookmarks = readBookmarks()
  const snapshotKey = JSON.stringify(bookmarks.map((bookmark) => [bookmark.id, bookmark.savedAt]))

  if (snapshotKey === cachedSnapshotKey) return cachedSnapshot

  cachedSnapshotKey = snapshotKey
  cachedSnapshot = [...bookmarks].sort((left, right) => right.savedAt.localeCompare(left.savedAt))
  return cachedSnapshot
}

export function hasBookmark(bookmarkId: string): boolean {
  return readBookmarks().some((bookmark) => bookmark.id === bookmarkId)
}

export function saveBookmark(input: Omit<BookmarkRecord, "savedAt">): void {
  const bookmarks = readBookmarks().filter((bookmark) => bookmark.id !== input.id)
  bookmarks.push({
    ...input,
    savedAt: new Date().toISOString(),
  })
  writeBookmarks(bookmarks)
  emitBookmarksChanged()
}

export function removeBookmark(bookmarkId: string): void {
  const next = readBookmarks().filter((bookmark) => bookmark.id !== bookmarkId)
  writeBookmarks(next)
  emitBookmarksChanged()
}
