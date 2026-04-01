import type { AssistantAction, AssistantReply } from "./assistant-contracts"

export function getProcedureSelectionPrompt(name: string): string {
  return name
}

export function getLauncherSelectionPrompt(title: string, label: string): string {
  if (title === "Specialties") return label
  return label
}

export function getTableRowPrompt(row: string[]): string {
  return row[0] ?? ""
}

export function getActionPrompt(action: AssistantAction, reply: AssistantReply): string {
  if (action.label === "Open full card") {
    return reply.compactCard?.title ?? reply.matchedProcedures?.[0]?.name ?? action.label
  }

  if (action.label.startsWith("Open ")) {
    return action.label.slice(5).trim()
  }

  return action.label
}
