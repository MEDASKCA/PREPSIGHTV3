const HISTORY_KEY = "prepsight_history"
const MAX_HISTORY = 5

export interface HistoryEntry {
  procedureId: string
  variantId?: string
  systemId?: string
}

export function addToHistory(entry: HistoryEntry): void {
  if (typeof window === "undefined") return
  try {
    const current = getHistory()
    const updated = [
      entry,
      ...current.filter(
        (item) =>
          !(
            item.procedureId === entry.procedureId &&
            item.variantId === entry.variantId &&
            item.systemId === entry.systemId
          ),
      ),
    ].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as Array<string | HistoryEntry>
    return parsed.map((item) =>
      typeof item === "string" ? { procedureId: item } : item,
    )
  } catch {
    return []
  }
}
