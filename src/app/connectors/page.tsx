"use client"

import WorkspaceDesktopShell from "@/components/WorkspaceDesktopShell"

const connectorGroups = [
  {
    title: "sso and identity",
    detail: "microsoft entra, google workspace, and scoped hospital access flows land here.",
  },
  {
    title: "data feeds",
    detail: "catalogue imports, workforce sync, and supply data ingestion belong here.",
  },
  {
    title: "outbound actions",
    detail: "notifications, exports, and webhook delivery should stay light and traceable.",
  },
]

export default function ConnectorsPage() {
  return (
    <WorkspaceDesktopShell currentNav="connectors" sectionLabel="Connectors">
      <div className="space-y-5 px-2 py-2 lg:px-4 lg:py-4">
        <section>
          <h1 className="text-[32px] tracking-[-0.04em] text-white">connectors</h1>
          <p className="mt-2 max-w-[760px] text-[15px] leading-7 text-white">
            External systems and integration points should stay sparse, readable, and easy to audit.
          </p>
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          {connectorGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-[12px] border border-[#2d2d2d] bg-[#161616] px-4 py-4 transition-colors hover:border-[#3a3a3a] hover:bg-[#1d1d1d]"
            >
              <h2 className="text-[16px] text-white">{group.title}</h2>
              <p className="mt-2 text-[14px] leading-6 text-white">{group.detail}</p>
            </article>
          ))}
        </section>
      </div>
    </WorkspaceDesktopShell>
  )
}
