import { Procedure } from "../types"

function sk(id: string, name: string, specialty: string, approach?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Intensive Care Unit",
    specialty,
    approach,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gloves",    name: "Sterile Gloves",   sku: "Biogel Eclipse",   defaultQty: 2 },
        { id: "gown",      name: "Sterile Gown",     sku: "Proxima OR",        defaultQty: 1 },
        { id: "mask",      name: "Surgical Mask",    sku: "ASTM Level 3",      defaultQty: 1 },
        { id: "eye-prot",  name: "Eye Protection",   sku: "Safety Goggles",    defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "ultrasound",  name: "Point-of-Care Ultrasound", sku: "SonoSite iViz",   description: "Guidance for vascular access", defaultQty: 1 },
        { id: "monitoring",  name: "Patient Monitor",          sku: "Philips IntelliVue", description: "Continuous ECG, SpO₂, NIBP", defaultQty: 1 },
        { id: "ventilator",  name: "Mechanical Ventilator",    sku: "Drager Evita",      defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Strict aseptic technique. ANTT / CRBSI bundle. Confirm indication and consent. Brief all staff before procedure.",
        items: [],
      },
    ],
  }
}

export const icu: Procedure[] = [
  sk("central-line",      "Central Venous Line (CVC) Insertion",     "General ICU", "Internal jugular / subclavian", "central-line-insertion",   "Ultrasound-guided CVC"),
  sk("arterial-line",     "Arterial Line Insertion",                  "General ICU", "Radial",                        "arterial-line-insertion",  "Radial artery — Seldinger"),
  sk("tracheostomy-perc", "Percutaneous Tracheostomy",               "General ICU", "Percutaneous dilational",        "tracheostomy",             "Percutaneous dilatational"),
  sk("bronchoscopy-icu",  "Bronchoscopy (ICU — therapeutic)",        "General ICU", "Flexible",                       "bronchoscopy",             "Flexible bronchoscopy — ICU"),
]
