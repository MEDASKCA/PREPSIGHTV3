export type TabKey = "chat" | "library" | "logistics" | "updates"
export type ChatFilter = "all" | "unread" | "groups" | "direct"
export type ChatType = "group" | "direct"
export type CollectionKey = "community" | "groups" | "bookmarks" | "review" | "calendar" | "catalogue" | "directory"
export type LogisticsKey = "members" | "access" | "equipment"
export type UpdateKey = "community" | "logistics" | "bookmarks"

export type ChatMessage = {
  id: string
  sender: "self" | "other" | "tom"
  author: string
  body: string
  time: string
}

export type ChatThread = {
  id: string
  type: ChatType
  title: string
  subtitle: string
  preview: string
  time: string
  unread: number
  online?: boolean
  accent: string
  members?: string[]
  messages: ChatMessage[]
}

export type AssistantMessage = {
  id: string
  sender: "self" | "tom"
  body: string
  time: string
}

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
