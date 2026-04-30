"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronLeft, ChevronRight, LogOut, Settings, UserRound } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  WORKSPACE_NAV_GROUPS,
  WORKSPACE_NAV_ITEMS,
  WORKSPACE_TOP_LEVEL_ITEMS,
  type WorkspaceNavGroupKey,
  type WorkspaceNavKey,
} from "@/lib/workspace-nav"
import { clearProfile, getProfile } from "@/lib/profile"
import { onAuthChange, signOut, type User } from "@/lib/auth"
import { clearDemoSession } from "@/lib/demo-access"

export type { WorkspaceNavKey } from "@/lib/workspace-nav"

const MANAGEMENT_ROLES = new Set(["manager", "senior_manager"])

export default function WorkspaceNavRail({
  currentNav,
  collapsed = false,
  onToggleCollapsed,
}: {
  currentNav: WorkspaceNavKey
  collapsed?: boolean
  onToggleCollapsed?: () => void
}) {
  const router = useRouter()
  const profile = getProfile()
  const canManage = MANAGEMENT_ROLES.has(profile?.role ?? "")
  const [user, setUser] = useState<User | null>(null)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => onAuthChange(setUser), [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleSignOut() {
    setProfileMenuOpen(false)
    clearProfile()
    clearDemoSession()
    await signOut()
    router.replace("/login")
  }

  const displayName = profile?.name ?? user?.displayName ?? user?.email ?? "Account"
  const profileInitial = (displayName.trim()[0] ?? "P").toUpperCase()

  const visibleGroups = WORKSPACE_NAV_GROUPS.filter(
    (group) => group.key !== "management" || canManage,
  )

  const [openGroups, setOpenGroups] = useState<Record<WorkspaceNavGroupKey, boolean>>({
    library: true,
    resources: true,
    insights: false,
    management: true,
  })

  function toggleGroup(groupKey: WorkspaceNavGroupKey) {
    setOpenGroups(current => ({ ...current, [groupKey]: !current[groupKey] }))
  }

  const visibleFlatItems = canManage
    ? WORKSPACE_NAV_ITEMS
    : WORKSPACE_NAV_ITEMS.filter((item) => item.key !== "user_accounts")

  return (
    <aside
      className={`hidden min-w-0 self-stretch border-r border-[#2d2d2d] bg-[#202020] pt-4 lg:flex lg:min-h-screen lg:flex-col ${
        collapsed ? "px-2 pb-3" : "px-3 pb-3"
      }`}
    >
      {/* ── Top: logo + collapse toggle ── */}
      <div className={`flex pb-2 ${collapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-4 px-1"}`}>
        {collapsed ? (
          <Link href="/" className="flex items-center justify-center">
            <img src="/PrepSight%20logo.png" alt="PrepSight" className="h-[54px] w-auto" />
          </Link>
        ) : (
          <Link href="/" className="app-display-font flex items-center gap-1 text-[26px] tracking-[-0.05em] text-[#0096C7]">
            <img src="/PrepSight%20logo.png" alt="" aria-hidden="true" className="h-[54px] w-auto" />
            PrepSight
          </Link>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ChevronRight size={15} strokeWidth={2.2} />
            : <ChevronLeft  size={15} strokeWidth={2.2} />
          }
        </button>
      </div>

      {/* ── Nav items (scrollable middle section) ── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {collapsed ? (
          <div className="space-y-1">
            {visibleFlatItems.map((item) => {
              const active = item.key === currentNav
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center justify-center rounded-[10px] px-2 py-1.5 ${
                    active ? "bg-white/10 font-medium text-white" : "text-[#D7E7F7] hover:bg-white/6"
                  }`}
                  title={item.label}
                >
                  <img src={item.iconSrc} alt="" aria-hidden="true" className="h-[26px] w-[26px] shrink-0 object-contain" />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {visibleGroups.map((group) => {
              const isOpen = openGroups[group.key]
              return (
                <div key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="flex min-w-0 items-center justify-between px-2 pb-0.5 text-left"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `Collapse ${group.label}` : `Expand ${group.label}`}
                  >
                    <p className={`text-[17px] text-white/84 ${isOpen ? "italic" : "font-medium"}`}>{group.label}</p>
                  </button>
                  {isOpen && group.items.length > 0 ? (
                    <div className="space-y-1 pl-3">
                      {group.items.map((item) => {
                        const active = item.key === currentNav
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-[8px] px-2 py-1 text-[15px] ${
                              active ? "bg-white/10 font-medium text-white" : "text-[#D7E7F7] hover:bg-white/6"
                            }`}
                          >
                            <img src={item.iconSrc} alt="" aria-hidden="true" className="h-[26px] w-[26px] shrink-0 object-contain" />
                            {item.label}
                          </Link>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}

            {WORKSPACE_TOP_LEVEL_ITEMS.length > 0 ? (
              <div className="pt-1">
                <div className="mb-1 h-[3px] rounded-full bg-white/12" />
                {WORKSPACE_TOP_LEVEL_ITEMS.map((item) => {
                  const active = item.key === currentNav
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-[8px] px-2 py-2 text-[15px] ${
                        active ? "bg-white/10 font-medium text-white" : "text-[#D7E7F7] hover:bg-white/6"
                      }`}
                    >
                      <img src={item.iconSrc} alt="" aria-hidden="true" className="h-[26px] w-[26px] shrink-0 object-contain" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Bottom: notifications + profile ── */}
      <div className={`relative mt-2 border-t border-[#2d2d2d] pt-2 ${collapsed ? "flex flex-col items-center gap-1" : "space-y-0.5 px-1"}`}>
        {/* Notifications */}
        <button
          type="button"
          className={`flex items-center gap-3 rounded-[8px] text-[#D7E7F7] transition-colors hover:bg-white/8 hover:text-white ${
            collapsed ? "w-10 justify-center px-2 py-2" : "w-full px-2 py-2 text-[14px]"
          }`}
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={18} className="shrink-0" />
          {!collapsed && <span>Notifications</span>}
        </button>

        {/* Profile */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileMenuOpen(v => !v)}
            className={`flex items-center gap-3 rounded-[8px] text-[#D7E7F7] transition-colors hover:bg-white/8 hover:text-white ${
              collapsed ? "w-10 justify-center px-1 py-1" : "w-full px-2 py-2"
            }`}
            aria-label="Account"
            title={collapsed ? displayName : undefined}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f8fb8] text-[13px] font-semibold text-white">
              {profileInitial}
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[13px] font-medium text-white">{displayName}</span>
                {user?.email && <span className="block truncate text-[11px] text-white/40">{user.email}</span>}
              </span>
            )}
          </button>

          {profileMenuOpen && (
            <div className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-52 overflow-hidden rounded-[16px] border border-white/10 bg-[#1a1a1a] shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
              <div className="border-b border-white/8 px-3 py-2.5">
                <p className="truncate text-[13px] font-medium text-white">{displayName}</p>
                {user?.email && <p className="truncate text-[11px] text-white/40">{user.email}</p>}
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={() => { setProfileMenuOpen(false); router.push("/settings/profile") }}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/8 hover:text-white"
                >
                  <UserRound size={14} />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileMenuOpen(false); router.push("/settings/notifications") }}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/8 hover:text-white"
                >
                  <Bell size={14} />
                  Notifications
                </button>
                <button
                  type="button"
                  onClick={() => { setProfileMenuOpen(false); router.push("/settings/access") }}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/8 hover:text-white"
                >
                  <Settings size={14} />
                  Settings
                </button>
                <div className="my-1 h-px bg-white/8" />
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
