import { Procedure } from "../types"

function sk(id: string, name: string, approach?: string, implantSystem?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty: "Neurosurgery",
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight",      defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "microscope",   name: "Operating Microscope",    sku: "Zeiss OPMI Pentero",      description: "Magnification and illumination", defaultQty: 1 },
        { id: "head-clamp",   name: "Mayfield Head Clamp",     sku: "Integra Mayfield",         description: "Rigid head fixation", defaultQty: 1 },
        { id: "neuro-drill",  name: "High-Speed Cranial Drill", sku: "Stryker System 7",        description: "Craniotomy and burr holes", defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Strict sterility. Position and head fixation confirmed before draping. Neuromonitoring team set up pre-op. Bone wax, Surgicel, haemostatic agents on table.",
        items: [],
      },
    ],
  }
}

export const theatreNeuro: Procedure[] = [
  sk("craniotomy-tumour",       "Craniotomy for Tumour Resection",    "Pterional / frontal",    undefined,             "craniotomy",         "Tumour resection — awake / GA"),
  sk("burr-hole-haematoma",     "Burr Hole Evacuation (CSDH)",         "Twist drill / burr hole", undefined,            "burr-hole-drainage", "Chronic subdural haematoma drainage"),
  sk("vp-shunt",                "Ventriculo-Peritoneal Shunt",          "Frontal / parietal",     "Medtronic PS Medical", "vp-shunt",          "Ventriculoperitoneal shunt insertion"),
  sk("lumbar-discectomy",       "Lumbar Discectomy",                    "Posterior",              undefined,             "lumbar-discectomy",  "Microdiscectomy — posterior approach"),
]
