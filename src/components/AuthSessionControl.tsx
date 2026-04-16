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
    <div className={`flex items-center gap-2 rounded-full border border-[#7DD9EE]/70 bg-[#DDF7FC]/92 px-2.5 py-1.5 text-[#0F4C5C] shadow-[0_10px_24px_rgba(15,76,92,0.14)] backdrop-blur ${className}`.trim()}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarClass}`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="max-w-[9rem] truncate text-xs font-semibold sm:max-w-[11rem]">{label}</p>
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#0F4C5C]/60">Signed in</p>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#7DD9EE] bg-white/70 text-[#0F4C5C] transition-colors hover:bg-[#7DD9EE]/45"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut size={14} />
      </button>
    </div>
  )
}
