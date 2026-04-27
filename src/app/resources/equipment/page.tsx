"use client"

import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

export default function EquipmentPage() {
  return (
    <WorkspaceDesktopShell currentNav="equipment" sectionLabel="Resources Equipment">
      <div className="px-5 py-4 lg:px-6 lg:py-5">
        <div className="rounded-[28px] border border-[#D6E7EE] bg-white/88 p-6 shadow-[0_18px_46px_rgba(16,36,62,0.08)]">
          <p className="text-[15px] text-[#35516A]">Equipment is being prepared.</p>
        </div>
      </div>
    </WorkspaceDesktopShell>
  )
}
