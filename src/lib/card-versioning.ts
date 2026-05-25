"use client"

import { CardChange, CardVersion, Procedure } from "./types"

export function computeCardDiff(before: Procedure, after: Procedure): CardChange[] {
  const changes: CardChange[] = []

  const beforeSections = new Map(before.sections.map((s) => [s.id, s]))
  const afterSections = new Map(after.sections.map((s) => [s.id, s]))

  // Check for modified and removed sections
  for (const [sectionId, beforeSection] of beforeSections) {
    const afterSection = afterSections.get(sectionId)

    if (!afterSection) {
      changes.push({
        sectionId,
        sectionTitle: beforeSection.title,
        before: beforeSection.items,
        after: [],
        changeType: "removed",
      })
    } else if (JSON.stringify(beforeSection.items) !== JSON.stringify(afterSection.items)) {
      changes.push({
        sectionId,
        sectionTitle: afterSection.title,
        before: beforeSection.items,
        after: afterSection.items,
        changeType: "modified",
      })
    }
  }

  // Check for added sections
  for (const [sectionId, afterSection] of afterSections) {
    if (!beforeSections.has(sectionId)) {
      changes.push({
        sectionId,
        sectionTitle: afterSection.title,
        before: [],
        after: afterSection.items,
        changeType: "added",
      })
    }
  }

  return changes
}

export function createCardVersion(
  cardId: string,
  versionNumber: number,
  before: Procedure | null,
  after: Procedure,
  status: "draft" | "pending_review" | "published",
  createdBy: string,
  createdByName?: string,
): CardVersion {
  const changes = before ? computeCardDiff(before, after) : []

  return {
    id: `${cardId}:v${versionNumber}`,
    cardId,
    versionNumber,
    status,
    createdAt: new Date().toISOString(),
    createdBy,
    createdByName,
    updatedAt: new Date().toISOString(),
    changes,
    snapshot: after,
  }
}

export function formatVersionLabel(version: CardVersion): string {
  const statusLabel = {
    draft: "Draft",
    pending_review: "Pending Review",
    published: "Published",
  }

  return `v${version.versionNumber} · ${statusLabel[version.status]}`
}

export function getVersionTimestamp(version: CardVersion): string {
  return version.approvedAt || version.updatedAt || version.createdAt
}

export function getVersionAuthor(version: CardVersion): string {
  return version.createdByName || version.createdBy || "Unknown"
}

export function hasVersionChanges(version: CardVersion): boolean {
  return version.changes.length > 0
}
