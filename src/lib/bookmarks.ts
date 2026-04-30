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
const KNOWN_REMOTE_BOOKMARK_IDS_KEY = "prepsight_known_remote_bookmark_ids"
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

function readKnownRemoteBookmarkIds(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = window.localStorage.getItem(KNOWN_REMOTE_BOOKMARK_IDS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed : [])
  } catch { return new Set() }
}

function writeKnownRemoteBookmarkIds(ids: Set<string>): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KNOWN_REMOTE_BOOKMARK_IDS_KEY, JSON.stringify([...ids]))
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
  const remoteIds = new Set(remoteBookmarks.map((b) => b.id))

  // If Firestore is completely empty but local has bookmarks, the user wiped Firebase.
  // Treat every local bookmark as deleted rather than re-uploading them.
  if (remoteBookmarks.length === 0 && localBookmarks.length > 0) {
    writeBookmarks([])
    writeKnownRemoteBookmarkIds(new Set())
    emitBookmarksChanged()
    return
  }

  // Track which IDs have ever been in Firestore.
  // If a local bookmark was previously known to be in Firestore but is now gone, it was deleted.
  let knownRemoteIds = readKnownRemoteBookmarkIds()
  if (knownRemoteIds.size === 0) {
    knownRemoteIds = new Set(remoteIds)
    writeKnownRemoteBookmarkIds(knownRemoteIds)
  }

  const deletedRemoteIds = new Set(
    localBookmarks
      .filter((b) => knownRemoteIds.has(b.id) && !remoteIds.has(b.id))
      .map((b) => b.id),
  )

  const validLocalBookmarks = localBookmarks.filter((b) => !deletedRemoteIds.has(b.id))
  writeBookmarks(mergeBookmarks(remoteBookmarks, validLocalBookmarks))
  writeKnownRemoteBookmarkIds(new Set([...knownRemoteIds, ...remoteIds]))
  emitBookmarksChanged()

  await Promise.all(
    validLocalBookmarks
      .filter((b) => !remoteIds.has(b.id))
      .map((b) => saveFirestoreBookmark(remoteUid, b).catch(() => undefined)),
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

export function clearAllLocalBookmarks(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(BOOKMARKS_STORAGE_KEY)
  window.localStorage.removeItem(KNOWN_REMOTE_BOOKMARK_IDS_KEY)
  cachedBookmarksRaw = undefined
  cachedBookmarks = []
  cachedSnapshotKey = undefined
  emitBookmarksChanged()
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
