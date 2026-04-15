"use client"

import { Globe, Moon, Sun, Trash2 } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import SettingsPageShell from "@/components/SettingsPageShell"
import { deleteAuthenticatedAccount, onAuthChange } from "@/lib/auth"
import { clearProfile } from "@/lib/profile"
import {
  applyUserPreferences,
  type LanguagePreference,
  readUserPreferences,
  saveUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences"

const LANGUAGE_OPTIONS: Array<{ value: LanguagePreference; label: string; detail: string }> = [
  { value: "en", label: "English", detail: "Default workspace language." },
  { value: "es", label: "Spanish", detail: "Ready for future translation wiring." },
  { value: "fr", label: "French", detail: "Prepared for later API-based translation." },
  { value: "de", label: "German", detail: "Stored locally for future language routing." },
  { value: "pt", label: "Portuguese", detail: "Stored locally for future language routing." },
]

export default function AccessSettingsPage() {
  const router = useRouter()
  const [preferences, setPreferences] = useState<UserPreferences>(() => readUserPreferences())
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  function updatePreferences(updater: (current: UserPreferences) => UserPreferences) {
    setPreferences((current) => {
      const next = updater(current)
      saveUserPreferences(next)
      applyUserPreferences(next)
      return next
    })
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm("Delete your account? This removes your profile and signs you out.")
    if (!confirmed) return

    setDeleteBusy(true)
    setDeleteError("")

    try {
      const user = await new Promise<Parameters<Parameters<typeof onAuthChange>[0]>[0]>((resolve) => {
        const unsubscribe = onAuthChange((nextUser) => {
          unsubscribe()
          resolve(nextUser)
        })
      })

      if (user?.uid) {
        const { deleteUserAccountData } = await import("@/lib/firestore")
        await deleteUserAccountData(user.uid)
      }

      clearProfile()
      await deleteAuthenticatedAccount()
      router.push("/login")
      router.refresh()
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      if (code === "auth/requires-recent-login") {
        setDeleteError("Delete account requires you to sign in again first.")
      } else {
        setDeleteError("Delete account failed. Try again.")
      }
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <SettingsPageShell
      title="Permissions & Access"
    >
      <div className="grid gap-5">
        <div>
          <div className="flex items-start gap-3">
            <div className="settings-surface-subtle settings-text flex h-9 w-9 items-center justify-center rounded-[14px]">
              {preferences.access.appearance === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div className="min-w-0">
              <p className="settings-text text-sm font-medium">Appearance</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                updatePreferences((current) => ({
                  ...current,
                  access: { ...current.access, appearance: "light" },
                }))
              }
              className={`rounded-[12px] border px-3 py-2.5 text-sm font-medium transition-colors ${
                preferences.access.appearance === "light"
                  ? "border-[#7DD3FC] bg-[#E0F2FE] text-[#0C4A6E]"
                  : "settings-border settings-surface settings-muted"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Sun size={16} />
                Light theme
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                updatePreferences((current) => ({
                  ...current,
                  access: { ...current.access, appearance: "dark" },
                }))
              }
              className={`rounded-[12px] border px-3 py-2.5 text-sm font-medium transition-colors ${
                preferences.access.appearance === "dark"
                  ? "border-[#1E293B] bg-[#0F172A] text-[#E2E8F0]"
                  : "settings-border settings-surface settings-muted"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Moon size={16} />
                Dark theme
              </span>
            </button>
          </div>
        </div>

        <div className="settings-border border-t pt-4">
          <div className="flex items-start gap-3">
            <div className="settings-surface-subtle settings-text flex h-9 w-9 items-center justify-center rounded-[14px]">
              <Globe size={18} />
            </div>
            <div className="min-w-0">
              <p className="settings-text text-sm font-medium">Language settings</p>
            </div>
          </div>
          <label className="mt-3 grid gap-2">
            <span className="settings-muted text-xs font-medium uppercase tracking-[0.16em]">Preferred language</span>
            <select
              value={preferences.access.language}
              onChange={(event) =>
                updatePreferences((current) => ({
                  ...current,
                  access: {
                    ...current.access,
                    language: event.target.value as LanguagePreference,
                  },
                }))
              }
              className="settings-border settings-surface settings-text rounded-[12px] border px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#7DD3FC]"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="settings-border border-t pt-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[14px] bg-[#FCE8E8] text-[#B42318]">
              <Trash2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="settings-text text-sm font-medium">Account deletion</p>
              <p className="settings-muted mt-1 text-sm">
                Permanently remove your profile and signed-in account from PrepSight.
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-[14px] border border-[#F3C7C7] bg-[#FFF6F6] p-4">
            <button
              type="button"
              onClick={() => void handleDeleteAccount()}
              disabled={deleteBusy}
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#B42318] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#962018] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 size={16} />
              {deleteBusy ? "Deleting account..." : "Delete account"}
            </button>
            {deleteError ? <p className="mt-3 text-sm text-[#B42318]">{deleteError}</p> : null}
          </div>
        </div>
      </div>
    </SettingsPageShell>
  )
}
