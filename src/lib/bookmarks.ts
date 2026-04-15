"use client"

import { onAuthChange } from "./auth"
import {
  canUseCollaborationFirestore,
  deleteFirestoreBookmark,
  getFirestoreBookmarks,
  saveFirestoreBookmark,
  type StoredBookmarkRecord,
} from "./collaboration-firestore"

export type BookmarkRecord = StoredBookmarkRecord

const BOOKMARKS_STORAGE_KEY = "prepsight_bookmarks"
const BOOKMARKS_EVENT = "prepsight:bookmarks"

let cachedBookmarksRaw: string | null | undefined
let cachedBookmarks: BookmarkRecord[] = []
let cachedSnapshotKey: string | null | undefined
let cachedSnapshot: BookmarkRecord[] = []
let authListening = false
let activeUid: string | null = null

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
    return cachedBookmarks
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

function mergeBookmarks(primary: BookmarkRecord[], secondary: BookmarkRecord[]): BookmarkRecord[] {
  const byId = new Map<string, BookmarkRecord>()
  for (const bookmark of secondary) byId.set(bookmark.id, bookmark)
  for (const bookmark of primary) byId.set(bookmark.id, bookmark)
  return [...byId.values()].sort((left, right) => right.savedAt.localeCompare(left.savedAt))
}

async function hydrateRemoteBookmarks(uid: string | null): Promise<void> {
  if (typeof window === "undefined") return
  if (!canUseCollaborationFirestore(uid)) {
    writeBookmarks(readBookmarks())
    emitBookmarksChanged()
    return
  }

  const remoteUid = uid as string
  const localBookmarks = readBookmarks()
  const remoteBookmarks = await getFirestoreBookmarks(remoteUid)
  const merged = mergeBookmarks(remoteBookmarks, localBookmarks)
  writeBookmarks(merged)
  emitBookmarksChanged()

  const remoteIds = new Set(remoteBookmarks.map((bookmark) => bookmark.id))
  await Promise.all(
    localBookmarks
      .filter((bookmark) => !remoteIds.has(bookmark.id))
      .map((bookmark) => saveFirestoreBookmark(remoteUid, bookmark).catch(() => undefined)),
  )
}

function ensureRealtimeSync(): void {
  if (authListening || typeof window === "undefined") return
  authListening = true
  readBookmarks()

  onAuthChange((user) => {
    activeUid = user?.uid ?? null
    void hydrateRemoteBookmarks(activeUid)
  })
}

export function subscribeBookmarks(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined

  ensureRealtimeSync()
  const handler = () => listener()
  window.addEventListener(BOOKMARKS_EVENT, handler)
  window.addEventListener("storage", handler)

  return () => {
    window.removeEventListener(BOOKMARKS_EVENT, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getBookmarksSnapshot(): BookmarkRecord[] {
  ensureRealtimeSync()
  const bookmarks = readBookmarks()
  const snapshotKey = JSON.stringify(bookmarks.map((bookmark) => [bookmark.id, bookmark.savedAt]))

  if (snapshotKey === cachedSnapshotKey) return cachedSnapshot

  cachedSnapshotKey = snapshotKey
  cachedSnapshot = [...bookmarks].sort((left, right) => right.savedAt.localeCompare(left.savedAt))
  return cachedSnapshot
}

export function hasBookmark(bookmarkId: string): boolean {
  ensureRealtimeSync()
  return readBookmarks().some((bookmark) => bookmark.id === bookmarkId)
}

export function saveBookmark(input: Omit<BookmarkRecord, "savedAt">): void {
  ensureRealtimeSync()
  const bookmark: BookmarkRecord = {
    ...input,
    savedAt: new Date().toISOString(),
  }
  const bookmarks = readBookmarks().filter((entry) => entry.id !== input.id)
  bookmarks.push(bookmark)
  writeBookmarks(bookmarks)
  emitBookmarksChanged()

  if (canUseCollaborationFirestore(activeUid)) {
    const remoteUid = activeUid as string
    void saveFirestoreBookmark(remoteUid, bookmark).catch((error) => {
      console.warn("[PrepSight] saveBookmark remote sync failed:", error)
    })
  }
}

export function removeBookmark(bookmarkId: string): void {
  ensureRealtimeSync()
  const next = readBookmarks().filter((bookmark) => bookmark.id !== bookmarkId)
  writeBookmarks(next)
  emitBookmarksChanged()

  if (canUseCollaborationFirestore(activeUid)) {
    const remoteUid = activeUid as string
    void deleteFirestoreBookmark(remoteUid, bookmarkId).catch((error) => {
      console.warn("[PrepSight] removeBookmark remote sync failed:", error)
    })
  }
}
