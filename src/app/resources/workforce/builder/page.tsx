"use client"

import { getProfile } from "@/lib/profile"
import StaffingReportCalendar from "@/components/StaffingReportCalendar"
import WorkforceSectionNav from "@/components/WorkforceSectionNav"
import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

function slugifyOrganization(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export default function WorkforceBuilderPage() {
  const profile = getProfile()
  const organizationScope =
    profile?.activeOrganizationId ??
    profile?.organizationIds?.find((value) => value.trim()) ??
    (profile?.hospital ? slugifyOrganization(profile.hospital) : undefined)

  return (
    <WorkspaceDesktopShell currentNav="workforce">
      <div className="px-2 py-2 lg:px-4 lg:py-4">
        <WorkforceSectionNav current="builder" />

        <div className="mt-5 rounded-[18px] border border-[#2d2d2d] bg-[#101010] px-5 py-5">
          <h2 className="text-[25px] tracking-[-0.04em] text-white">Builder</h2>
          <p className="mt-3 max-w-[760px] text-[14px] leading-7 text-[#9a9a9a]">
            Manager configuration surface for allocation templates, staffing rules, theatre setup, consultant
            mapping, and assignment controls.
          </p>
        </div>

        <div className="mt-5">
          <StaffingReportCalendar
            organizationId={organizationScope}
            title="Roster Upload Calendar"
            description="Bring the allocation calendar into Builder so uploaded roster dates are visible while configuring workforce rules and assignment logic."
          />
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
