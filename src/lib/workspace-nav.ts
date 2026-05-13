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
  | "user_accounts"

export type WorkspaceNavGroupKey = "library" | "resources" | "insights" | "management"

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
      { key: "workforce", label: "Workforce", href: "/resources/workforce", iconSrc: "/icons/navigation/workforce.svg" },
      { key: "equipment", label: "Equipment", href: "/resources/equipment", iconSrc: "/icons/navigation/equipment.svg" },
      { key: "supplies", label: "Supplies", href: "/resources/supplies", iconSrc: "/icons/navigation/supplies.svg" },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    items: [],
  },
  {
    key: "management",
    label: "Management",
    items: [],
  },
]

export const WORKSPACE_NAV_ITEMS = [...WORKSPACE_TOP_LEVEL_ITEMS, ...WORKSPACE_NAV_GROUPS.flatMap(group => group.items)]

export function getNavBreadcrumb(key: WorkspaceNavKey): { group: string | null; label: string } {
  for (const group of WORKSPACE_NAV_GROUPS) {
    const item = group.items.find(i => i.key === key)
    if (item) return { group: null, label: `${group.label} ${item.label}` }
  }
  const topItem = WORKSPACE_TOP_LEVEL_ITEMS.find(i => i.key === key)
  if (topItem) return { group: null, label: topItem.label }
  return { group: null, label: "" }
}
