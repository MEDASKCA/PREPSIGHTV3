export type TabKey = "library" | "logistics" | "updates" | "comms"
export type CollectionKey = "community" | "groups" | "bookmarks" | "review" | "calendar" | "catalogue" | "directory"
export type LogisticsKey = "members" | "access" | "equipment"
export type UpdateKey = "community" | "logistics" | "bookmarks"

export type CollectionSummary = {
  key: CollectionKey
  title: string
  subtitle: string
  summary: string
  accent: string
  items: Array<{ title: string; meta: string }>
}

export type LogisticsSummary = {
  key: LogisticsKey
  title: string
  detail: string
  tone: string
  rows: Array<{ title: string; meta: string }>
}

export type UpdateSummary = {
  key: UpdateKey
  title: string
  detail: string
  time: string
  body: string
}
