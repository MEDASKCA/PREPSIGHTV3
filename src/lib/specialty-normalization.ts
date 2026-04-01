import { ClinicalSetting } from "./types"

function normalizeKey(value: string): string {
  return value.trim().toLowerCase()
}

const OPERATING_THEATRE_SPECIALTY_ALIASES: Record<string, string> = {
  "trauma and orthopaedic surgery": "Trauma and Orthopaedics",
  "trauma and orthopaedics": "Trauma and Orthopaedics",
  "trauma & orthopaedics": "Trauma and Orthopaedics",
  orthopaedics: "Trauma and Orthopaedics",
  orthopedics: "Trauma and Orthopaedics",
  "general surgery": "General Surgery",
  urology: "Urology",
  obstetrics: "Obstetrics",
  gynecology: "Gynecology",
  gynaecology: "Gynecology",
  "otolaryngology (ear, nose and throat surgery)": "Otolaryngology (Ear, Nose and Throat)",
  "otolaryngology (ear, nose and throat)": "Otolaryngology (Ear, Nose and Throat)",
  "otolaryngology (ent)": "Otolaryngology (Ear, Nose and Throat)",
  ent: "Otolaryngology (Ear, Nose and Throat)",
  "oral and maxillofacial surgery": "Oral and Maxillofacial",
  "oral and maxillofacial": "Oral and Maxillofacial",
  "oral & maxillofacial surgery (omfs)": "Oral and Maxillofacial",
  "oral & maxillofacial surgery": "Oral and Maxillofacial",
  omfs: "Oral and Maxillofacial",
  "dental and oral surgery": "Dental and Oral",
  "dental and oral": "Dental and Oral",
  "plastic and reconstructive surgery": "Plastic and Reconstructive",
  "plastic and reconstructive": "Plastic and Reconstructive",
  "plastics & reconstructive": "Plastic and Reconstructive",
  neurosurgery: "Neurosurgery",
  "cardiothoracic surgery": "Cardiothoracic",
  cardiothoracic: "Cardiothoracic",
  "vascular surgery": "Vascular",
  vascular: "Vascular",
  "paediatric surgery": "Paediatric",
  paediatric: "Paediatric",
  "ophthalmology": "Ophthalmology",
  "podiatric surgery": "Podiatric",
  podiatric: "Podiatric",
  anaesthesia: "Anaesthesia",
}

export function canonicalSpecialtyName(setting: ClinicalSetting, specialty: string): string {
  if (setting !== "Operating Theatre") return specialty
  const alias = OPERATING_THEATRE_SPECIALTY_ALIASES[normalizeKey(specialty)]
  return alias ?? specialty
}
