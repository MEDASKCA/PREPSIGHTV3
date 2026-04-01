"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function SettingsPageShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <main className="settings-page-bg min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="settings-text inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
        >
          <ArrowLeft size={16} />
          Back to workspace
        </Link>

        <section className="mt-5">
          <div className="settings-border border-b pb-4">
            <p className="settings-accent text-[11px] font-medium uppercase tracking-[0.18em]">Settings</p>
            <h1 className="settings-text mt-2 text-[22px] font-medium">{title}</h1>
          </div>
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </main>
  )
}
