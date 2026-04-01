"use client"

import { useState } from "react"
import SettingsPageShell from "@/components/SettingsPageShell"
import { readUserPreferences, saveUserPreferences, type UserPreferences } from "@/lib/user-preferences"

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="settings-border flex items-center justify-between gap-4 border-b py-3">
      <div className="min-w-0">
        <p className="settings-text text-sm font-medium">{label}</p>
      </div>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#0EA5E9]" : "bg-[#CBD5E1]"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_4px_10px_rgba(15,23,42,0.18)] transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  )
}

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => readUserPreferences())

  function updatePreferences(updater: (current: UserPreferences) => UserPreferences) {
    setPreferences((current) => {
      const next = updater(current)
      saveUserPreferences(next)
      return next
    })
  }

  return (
    <SettingsPageShell
      title="Notifications"
    >
      <div>
        <ToggleRow
          label="Procedure updates"
          checked={preferences.notifications.procedureUpdates}
          onChange={(checked) =>
            updatePreferences((current) => ({
              ...current,
              notifications: { ...current.notifications, procedureUpdates: checked },
            }))
          }
        />
        <ToggleRow
          label="Product announcements"
          checked={preferences.notifications.productAnnouncements}
          onChange={(checked) =>
            updatePreferences((current) => ({
              ...current,
              notifications: { ...current.notifications, productAnnouncements: checked },
            }))
          }
        />
        <ToggleRow
          label="Account alerts"
          checked={preferences.notifications.accountAlerts}
          onChange={(checked) =>
            updatePreferences((current) => ({
              ...current,
              notifications: { ...current.notifications, accountAlerts: checked },
            }))
          }
        />
      </div>
    </SettingsPageShell>
  )
}
