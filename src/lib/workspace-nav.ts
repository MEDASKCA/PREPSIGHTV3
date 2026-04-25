export type WorkspaceNavKey =
  | "collections"
  | "bookmarks"
  | "review"
  | "calendar"
  | "connectors"
  | "catalogue"
  | "workforce"
  | "equipment"
  | "supplies"

export type WorkspaceNavGroupKey = "library" | "resources" | "insights"

export type WorkspaceNavItem = {
  key: WorkspaceNavKey
  label: string
  href: string
  iconSrc: string
}

export type WorkspaceNavGroup = {
  key: WorkspaceNavGroupKey
  label: string
  items: WorkspaceNavItem[]
}

export const WORKSPACE_TOP_LEVEL_ITEMS: WorkspaceNavItem[] = [
  { key: "calendar", label: "Calendar", href: "/calendar", iconSrc: "/icons/navigation/calendar.svg" },
  { key: "connectors", label: "Connectors", href: "/connectors", iconSrc: "/icons/navigation/catalogue.svg" },
]

export const WORKSPACE_NAV_GROUPS: WorkspaceNavGroup[] = [
  {
    key: "library",
    label: "Library",
    items: [
      { key: "collections", label: "Collections", href: "/", iconSrc: "/icons/navigation/collections.svg" },
      { key: "bookmarks", label: "Bookmarks", href: "/bookmarks", iconSrc: "/icons/navigation/bookmarks.svg" },
      { key: "review", label: "Review", href: "/review", iconSrc: "/icons/navigation/review.svg" },
      { key: "catalogue", label: "Catalogue", href: "/catalogue", iconSrc: "/icons/navigation/catalogue.svg" },
    ],
  },
  {
    key: "resources",
    label: "Resources",
    items: [
      { key: "workforce", label: "Workforce", href: "/resources/workforce", iconSrc: "/icons/navigation/review.svg" },
      { key: "equipment", label: "Equipment", href: "/resources/equipment", iconSrc: "/icons/navigation/catalogue.svg" },
      { key: "supplies", label: "Supplies", href: "/resources/supplies", iconSrc: "/icons/navigation/bookmarks.svg" },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    items: [],
  },
]

export const WORKSPACE_NAV_ITEMS = [...WORKSPACE_TOP_LEVEL_ITEMS, ...WORKSPACE_NAV_GROUPS.flatMap(group => group.items)]
