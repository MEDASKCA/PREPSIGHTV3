"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRightLeft, Bell, LogOut, RotateCcw, Settings2, UserRound, X } from "lucide-react"
import { onAuthChange, signOut, type User } from "@/lib/auth"
import { clearProfile, getProfile, resetOnboarding } from "@/lib/profile"
import { type PrepSightProfile, USER_ROLE_LABEL } from "@/lib/types"
import { avatarColour, getInitials } from "@/lib/utils"

function SettingsRow({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b settings-border py-3 text-left transition-colors hover:opacity-80"
    >
      <span className="settings-accent">{icon}</span>
      <p className="settings-text text-sm font-medium">{title}</p>
    </button>
  )
}

export default function ProfileButton({
  modeSwitch,
}: {
  modeSwitch?: {
    label: string
    path: string
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<PrepSightProfile | null>(() => getProfile())

  useEffect(() => {
    const unsub = onAuthChange((nextUser) => setUser(nextUser))
    return unsub
  }, [])

  const displayName = user?.displayName ?? user?.email ?? profile?.name ?? "You"
  const displayRole = profile ? USER_ROLE_LABEL[profile.role] ?? profile.role : "No role set"
  const photoURL = user?.photoURL
  const initials = getInitials(displayName)
  const colour = avatarColour(displayName)

  function handleOpen() {
    setProfile(getProfile())
    setOpen(true)
  }

  function openSettingsPage(path: string) {
    setOpen(false)
    router.push(path)
  }

  async function handleSignOut() {
    clearProfile()
    await signOut()
    setOpen(false)
    router.push("/login")
  }

  function handleResetOnboarding() {
    resetOnboarding()
    setOpen(false)
    router.push("/onboarding")
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label="Settings"
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center transition-transform hover:scale-[1.02]"
      >
        <img src="/hamburger.png" alt="" className="h-11 w-11 object-contain" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="settings-surface settings-overlay-panel w-full overflow-hidden rounded-t-[30px] sm:max-w-xl sm:rounded-[30px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between bg-[linear-gradient(135deg,#67E8F9_0%,#06B6D4_100%)] px-5 pb-5 pt-5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full ${!photoURL ? `${colour} text-white text-sm font-semibold` : ""}`}>
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <p className="settings-header-text text-base font-medium">{displayName}</p>
                  <p className="settings-header-muted mt-0.5 text-sm">{displayRole}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/30 text-white transition-colors hover:bg-white/45"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-3 sm:px-6">
              {modeSwitch ? (
                <SettingsRow
                  icon={<ArrowRightLeft size={16} />}
                  title={modeSwitch.label}
                  onClick={() => openSettingsPage(modeSwitch.path)}
                />
              ) : null}
              <SettingsRow
                icon={<UserRound size={16} />}
                title="Profile"
                onClick={() => openSettingsPage("/settings/profile")}
              />
              <SettingsRow
                icon={<Settings2 size={16} />}
                title="Settings"
                onClick={() => openSettingsPage("/settings/access")}
              />

              <div className="mt-1 border-t settings-border pt-1">
                <SettingsRow
                  icon={<Bell size={16} />}
                  title="Notifications"
                  onClick={() => openSettingsPage("/settings/notifications")}
                />
                <SettingsRow
                  icon={<RotateCcw size={16} />}
                  title="Run onboarding again"
                  onClick={handleResetOnboarding}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:text-red-600"
                >
                  <span className="text-red-500">
                    <LogOut size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-red-600">Sign out</p>
                    <p className="settings-muted text-xs">{user?.email}</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
