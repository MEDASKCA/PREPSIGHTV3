export type WorkspaceNavKey =
  | "collections"
  | "bookmarks"
  | "review"
  | "calendar"
  | "catalogue"

export type WorkspaceNavItem = {
  key: WorkspaceNavKey
  label: string
  href: string
  iconSrc: string
}

export const WORKSPACE_NAV_ITEMS: WorkspaceNavItem[] = [
  { key: "collections", label: "Collections", href: "/", iconSrc: "/icons/navigation/collections.svg" },
  { key: "bookmarks", label: "Bookmarks", href: "/bookmarks", iconSrc: "/icons/navigation/bookmarks.svg" },
  { key: "review", label: "Review", href: "/review", iconSrc: "/icons/navigation/review.svg" },
  { key: "calendar", label: "Calendar", href: "/calendar", iconSrc: "/icons/navigation/calendar.svg" },
  { key: "catalogue", label: "Catalogue", href: "/catalogue", iconSrc: "/icons/navigation/catalogue.svg" },
]
