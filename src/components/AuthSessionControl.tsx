"use client"

import { LogOut } from "lucide-react"
import { avatarColour, getInitials } from "@/lib/utils"
import { type User } from "@/lib/auth"

type AuthSessionControlProps = {
  user: User
  onSignOut: () => void
  className?: string
}

export default function AuthSessionControl({
  user,
  onSignOut,
  className = "",
}: AuthSessionControlProps) {
  const label = user.displayName?.trim() || user.email?.trim() || "Signed-in account"
  const initials = getInitials(label)
  const avatarClass = avatarColour(label)

  return (
    <div className={`flex items-center gap-3 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur ${className}`.trim()}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarClass}`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="max-w-[12rem] truncate text-sm font-semibold">{label}</p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-white/60">Signed in</p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white transition-colors hover:bg-white/14"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  )
}
