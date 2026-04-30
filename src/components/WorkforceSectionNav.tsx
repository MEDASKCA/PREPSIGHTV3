"use client"

import Link from "next/link"

const ITEMS = [
  { key: "overview", label: "rota", href: "/resources/workforce" },
  { key: "shifts", label: "shifts", href: "/resources/workforce/shifts" },
  { key: "skills", label: "skills", href: "/resources/workforce/skills" },
  { key: "tasks", label: "tasks", href: "/resources/workforce/tasks" },
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
