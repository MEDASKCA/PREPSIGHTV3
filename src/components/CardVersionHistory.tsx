"use client"

import { useEffect, useState } from "react"
import { getCardVersionsByCardId } from "@/lib/firestore"
import { CardVersion } from "@/lib/types"
import { formatVersionLabel, getVersionTimestamp, getVersionAuthor } from "@/lib/card-versioning"
import { ChevronDown, ChevronUp } from "lucide-react"

interface CardVersionHistoryProps {
  cardId: string
}

export function CardVersionHistory({ cardId }: CardVersionHistoryProps) {
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null)
  const [versions, setVersions] = useState<CardVersion[]>([])

  useEffect(() => {
    getCardVersionsByCardId(cardId).then(setVersions)
  }, [cardId])

  if (versions.length === 0) {
    return null
  }

  const statusColor: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    pending_review: "bg-blue-100 text-blue-800",
    published: "bg-green-100 text-green-800",
  }

  const changeTypeColor: Record<string, string> = {
    added: "text-green-700",
    modified: "text-blue-700",
    removed: "text-red-700",
  }

  return (
    <div className="mt-8 border-t border-black pt-6">
      <h3 className="text-lg font-semibold mb-4">Version History</h3>
      <div className="space-y-3">
        {versions.map((version) => (
          <div key={version.id} className="border border-black rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedVersionId(expandedVersionId === version.id ? null : version.id)}
              className="w-full px-4 py-3 bg-black text-white flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
            >
              <div className="flex items-center gap-3 text-left flex-1">
                <span className="font-medium">{formatVersionLabel(version)}</span>
                <span className={`inline-block text-[11px] font-semibold px-2 py-1 rounded ${statusColor[version.status]}`}>
                  {version.status}
                </span>
              </div>
              {expandedVersionId === version.id ? (
                <ChevronUp size={18} />
              ) : (
                <ChevronDown size={18} />
              )}
            </button>

            {expandedVersionId === version.id && (
              <div className="px-4 py-3 bg-white space-y-4">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-gray-600">By</span>
                    <p className="font-medium">{getVersionAuthor(version)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">At</span>
                    <p className="font-medium">{new Date(getVersionTimestamp(version)).toLocaleString()}</p>
                  </div>
                </div>

                {version.changes.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Changes:</p>
                    {version.changes.map((change, idx) => (
                      <div key={idx} className="border-l-2 border-gray-300 pl-3 py-1">
                        <p className="font-medium text-sm">{change.sectionTitle}</p>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${changeTypeColor[change.changeType]}`}>
                          {change.changeType}
                        </p>
                        {change.before.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Before ({change.before.length} items):</p>
                            <ul className="text-xs text-gray-700 ml-2 list-disc">
                              {change.before.slice(0, 3).map((item, i) => (
                                <li key={i}>{item.name}</li>
                              ))}
                              {change.before.length > 3 && <li className="text-gray-500">+{change.before.length - 3} more</li>}
                            </ul>
                          </div>
                        )}
                        {change.after.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">After ({change.after.length} items):</p>
                            <ul className="text-xs text-gray-700 ml-2 list-disc">
                              {change.after.slice(0, 3).map((item, i) => (
                                <li key={i}>{item.name}</li>
                              ))}
                              {change.after.length > 3 && <li className="text-gray-500">+{change.after.length - 3} more</li>}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No changes tracked for this version</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
