"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { Check, Users, KeyRound } from "lucide-react"
import { getProfile, saveProfile } from "@/lib/profile"
import { onAuthChange } from "@/lib/auth"
import { USER_ROLE_LABEL } from "@/lib/types"
import SettingsPageShell from "@/components/SettingsPageShell"
import {
  createTeamWorkspace,
  getActiveTeamSnapshot,
  getTeamMembersSnapshot,
  getTeamWorkspacesSnapshot,
  subscribeTeams,
  joinTeamWorkspace,
} from "@/lib/team-workspaces"

export default function ProfileSettingsPage() {
  const profile = useMemo(() => getProfile(), [])
  const [uid, setUid] = useState<string | null>(null)
  const [teamName, setTeamName] = useState(profile?.hospital ? `${profile.hospital} Team` : "")
  const [inviteCode, setInviteCode] = useState("")
  const [message, setMessage] = useState("")
  useEffect(() => onAuthChange((user) => setUid(user?.uid ?? null)), [])
  useSyncExternalStore(subscribeTeams, getTeamWorkspacesSnapshot, getTeamWorkspacesSnapshot)
  const activeTeam = getActiveTeamSnapshot(profile)
  const teamMembers = getTeamMembersSnapshot(activeTeam?.id)

  async function handleCreateTeam() {
    if (!profile || !teamName.trim()) return
    const team = createTeamWorkspace({
      name: teamName.trim(),
      profile,
      uid,
    })
    await saveProfile(
      {
        ...profile,
        activeOrganizationId: team.id,
        organizationIds: Array.from(new Set([...(profile.organizationIds ?? []), team.id])),
      },
      uid ?? undefined,
    )
    setMessage(`Team created. Invite code: ${team.inviteCode}`)
  }

  async function handleJoinTeam() {
    if (!profile || !inviteCode.trim()) return
    const team = joinTeamWorkspace({
      inviteCode,
      profile,
      uid,
    })
    if (!team) {
      setMessage("Team code not found.")
      return
    }
    await saveProfile(
      {
        ...profile,
        activeOrganizationId: team.id,
        organizationIds: Array.from(new Set([...(profile.organizationIds ?? []), team.id])),
      },
      uid ?? undefined,
    )
    setMessage(`Joined ${team.internalName}.`)
  }

  return (
    <SettingsPageShell
      title="Profile settings"
    >
      <div className="grid gap-5">
        <div className="settings-muted settings-border grid gap-4 border-b pb-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em]">Hospital</p>
              <p className="mt-1">{profile?.hospital || "Not set"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em]">Role</p>
              <p className="mt-1">{profile ? USER_ROLE_LABEL[profile.role] : "Not set"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em]">Departments</p>
              <p className="mt-1">{profile?.departments.join(", ") || "Not set"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em]">Specialties</p>
              <p className="mt-1">{profile?.specialtiesOfInterest.join(", ") || "Not set"}</p>
            </div>
        </div>

        <div>
          <Link
            href="/onboarding"
            className="inline-flex rounded-[10px] bg-[#06B6D4] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0891B2]"
          >
            Open onboarding
          </Link>
        </div>

        <div className="settings-border grid gap-4 border-t pt-5">
          <div className="flex items-start gap-3">
            <div className="settings-surface-subtle settings-text flex h-9 w-9 items-center justify-center rounded-[14px]">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="settings-text text-sm font-medium">Team workspace</p>
              <p className="settings-muted mt-1 text-sm">
                Members are visible internally. Public sharing uses anonymised team and member codes.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="settings-border settings-surface rounded-[14px] border p-4">
              <p className="settings-text text-sm font-medium">Create a team</p>
              <input
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="e.g. St Thomas Arthroplasty Team"
                className="settings-border settings-surface settings-text mt-3 w-full rounded-[12px] border px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleCreateTeam}
                disabled={!profile || !teamName.trim()}
                className="mt-3 inline-flex rounded-[10px] bg-[#06B6D4] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0891B2] disabled:opacity-40"
              >
                Create team
              </button>
            </div>

            <div className="settings-border settings-surface rounded-[14px] border p-4">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="settings-accent" />
                <p className="settings-text text-sm font-medium">Join with code</p>
              </div>
              <input
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder="TEAM-XXXXXX"
                className="settings-border settings-surface settings-text mt-3 w-full rounded-[12px] border px-3 py-2.5 text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleJoinTeam}
                disabled={!profile || !inviteCode.trim()}
                className="mt-3 inline-flex rounded-[10px] border border-[#7DD3FC] bg-[#E0F2FE] px-3.5 py-2 text-sm font-medium text-[#0C4A6E] transition-colors hover:bg-[#C6ECFD] disabled:opacity-40"
              >
                Join team
              </button>
            </div>
          </div>

          {activeTeam ? (
            <div className="settings-border settings-surface rounded-[14px] border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="settings-text text-sm font-medium">{activeTeam.internalName}</p>
                  <p className="settings-muted mt-1 text-sm">
                    Public alias {activeTeam.publicAlias} · Invite code {activeTeam.inviteCode}
                  </p>
                </div>
                <span className="rounded-full bg-[#E0F2FE] px-2.5 py-1 text-xs font-medium text-[#0C4A6E]">
                  Active team
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {teamMembers.length > 0 ? teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#F8FBFD] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="settings-text truncate text-sm font-medium">{member.displayName || "Unknown member"}</p>
                      <p className="settings-muted truncate text-xs">
                        Internal role {USER_ROLE_LABEL[member.internalRole] ?? member.internalRole}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="settings-text text-xs font-medium">{member.publicAlias}</p>
                      <p className="settings-muted text-[11px]">Public code</p>
                    </div>
                  </div>
                )) : (
                  <p className="settings-muted text-sm">No members yet.</p>
                )}
              </div>
            </div>
          ) : null}

          {message ? (
            <div className="rounded-[12px] border border-[#BFEAF5] bg-[#EEF9FC] px-3 py-2.5 text-sm text-[#0F4C5C]">
              <span className="inline-flex items-center gap-2">
                <Check size={14} />
                {message}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </SettingsPageShell>
  )
}
