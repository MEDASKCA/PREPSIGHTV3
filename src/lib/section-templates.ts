"use client"

import type { ClinicalSetting, SectionType } from "./types"

const STORAGE_KEY = "prepsight_specialty_section_templates"
const EVENT_NAME = "prepsight:section-templates"
let cachedRaw: string | null | undefined
let cachedTemplates: SpecialtySectionTemplate[] = []

export interface SpecialtySectionTemplate {
  id: string
  setting: ClinicalSetting
  specialty: string
  sectionTypes: SectionType[]
  updatedAt: string
}

function keyFor(setting: ClinicalSetting, specialty: string) {
  return `${setting}__${specialty.trim().toLowerCase()}`
}

function readTemplates(): SpecialtySectionTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === cachedRaw) return cachedTemplates
    if (!raw) {
      cachedRaw = raw
      cachedTemplates = []
      return cachedTemplates
    }
    const parsed = JSON.parse(raw)
    cachedRaw = raw
    cachedTemplates = Array.isArray(parsed) ? parsed as SpecialtySectionTemplate[] : []
    return cachedTemplates
  } catch {
    return cachedTemplates
  }
}

function writeTemplates(templates: SpecialtySectionTemplate[]): void {
  if (typeof window === "undefined") return
  const raw = JSON.stringify(templates)
  cachedRaw = raw
  cachedTemplates = templates
  window.localStorage.setItem(STORAGE_KEY, raw)
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function subscribeSectionTemplates(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined
  const handler = () => listener()
  window.addEventListener(EVENT_NAME, handler)
  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
    window.removeEventListener("storage", handler)
  }
}

export function getSpecialtySectionTemplatesSnapshot(): SpecialtySectionTemplate[] {
  return readTemplates()
}

export function getTemplateForSpecialtySnapshot(
  setting: ClinicalSetting,
  specialty: string,
): SpecialtySectionTemplate | null {
  const id = keyFor(setting, specialty)
  return readTemplates().find((entry) => entry.id === id) ?? null
}

export function saveSpecialtySectionTemplate(input: {
  setting: ClinicalSetting
  specialty: string
  sectionTypes: SectionType[]
}): SpecialtySectionTemplate {
  const id = keyFor(input.setting, input.specialty)
  const next: SpecialtySectionTemplate = {
    id,
    setting: input.setting,
    specialty: input.specialty.trim(),
    sectionTypes: [...input.sectionTypes],
    updatedAt: new Date().toISOString(),
  }
  const current = readTemplates().filter((entry) => entry.id !== id)
  current.unshift(next)
  writeTemplates(current)
  return next
}
