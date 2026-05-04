export type TabKey = "library" | "resources" | "updates" | "comms"
export type UpdateKey = "community" | "logistics" | "bookmarks"

export type UpdateSummary = {
  key: UpdateKey
  title: string
  detail: string
  time: string
  body: string
}
