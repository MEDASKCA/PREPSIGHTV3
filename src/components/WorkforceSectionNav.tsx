"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getProfile } from "@/lib/profile"

type WorkforceNavItem = {
  key: "builder" | "overview" | "shifts" | "skills" | "tasks"
  label: string
  href: string
  managerOnly?: boolean
}

const ITEMS: WorkforceNavItem[] = [
  { key: "builder", label: "Builder", href: "/resources/workforce/builder", managerOnly: true },
  { key: "overview", label: "Allocation", href: "/resources/workforce" },
  { key: "shifts", label: "Shifts", href: "/resources/workforce/shifts" },
  { key: "skills", label: "Skills", href: "/resources/workforce/skills" },
  { key: "tasks", label: "Tasks", href: "/resources/workforce/tasks" },
] as const

export default function WorkforceSectionNav({
  current,
}: {
  current: WorkforceNavItem["key"]
}) {
  const [showManagerItems, setShowManagerItems] = useState(false)

  useEffect(() => {
    const profile = getProfile()
    setShowManagerItems(profile?.role === "manager" || profile?.role === "senior_manager")
  }, [])

  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {ITEMS.filter((item) => !item.managerOnly || showManagerItems).map((item) => {
        const active = item.key === current
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-full px-4 py-2 text-[13px] transition ${
              active
                ? "border border-white bg-white text-black"
                : "border border-[#2d2d2d] bg-[#161616] text-[#8f8f8f] hover:border-[#3a3a3a] hover:bg-[#1d1d1d] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
