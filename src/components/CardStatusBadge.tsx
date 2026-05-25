import { type Procedure } from "@/lib/types"

export function CardStatusBadge({ card }: { card: Procedure }) {
  if (!card.status || card.status === "published") {
    return null
  }

  const statusConfig = {
    draft: {
      label: "Draft",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
    },
    pending_review: {
      label: "Pending Review",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
  }

  const config = statusConfig[card.status as keyof typeof statusConfig]
  if (!config) return null

  return (
    <span className={`inline-block ${config.bgColor} ${config.textColor} text-[11px] font-semibold px-2 py-1 rounded`}>
      {config.label}
    </span>
  )
}
