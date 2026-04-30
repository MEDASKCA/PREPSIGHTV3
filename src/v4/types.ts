export type TabKey = "library" | "logistics" | "updates" | "comms"
export type LogisticsKey = "members" | "access" | "equipment"
export type UpdateKey = "community" | "logistics" | "bookmarks"

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
