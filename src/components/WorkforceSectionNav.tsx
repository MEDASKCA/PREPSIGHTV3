"use client"

import Link from "next/link"

const ITEMS = [
  { key: "overview", label: "Rota", href: "/resources/workforce" },
  { key: "shifts", label: "Shifts", href: "/resources/workforce/shifts" },
  { key: "skills", label: "Skills", href: "/resources/workforce/skills" },
  { key: "tasks", label: "Tasks", href: "/resources/workforce/tasks" },
] as const

export default function WorkforceSectionNav({
  current,
}: {
  current: (typeof ITEMS)[number]["key"]
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {ITEMS.map((item) => {
        const active = item.key === current
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-full px-4 py-2 text-[13px] transition ${
              active
                ? "bg-[#0096C7] text-white shadow-[0_10px_24px_rgba(0,150,199,0.22)]"
                : "border border-[#D6E7EE] bg-white/88 text-[#486579] hover:bg-[#F5FBFD]"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}
