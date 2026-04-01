import { Procedure } from "../types"

function sk(id: string, name: string, approach?: string, implantSystem?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty: "Urology",
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight",      defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "diathermy",    name: "Diathermy Unit",       sku: "Valleylab FT10",  defaultQty: 1 },
        { id: "cystoscopy",   name: "Cystoscopy Tower",     sku: "Stryker Cystoscopy", description: "Rigid/flexible cystoscopy setup", defaultQty: 1 },
        { id: "irrigation",   name: "Irrigation Fluid",     sku: "Glycine 1.5%",    defaultQty: 3 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm procedure and laterality at WHO sign-in. Check irrigation fluid warming. Have catheter sizes available.",
        items: [],
      },
    ],
  }
}

export const theatreUrology: Procedure[] = [
  sk("turp",               "TURP (Transurethral Resection of Prostate)", "Endoscopic",          undefined,    "turp",                    "Monopolar / Bipolar TURP"),
  sk("pcnl",               "PCNL (Percutaneous Nephrolithotomy)",         "Percutaneous",        "Karl Storz", "pcnl",                    "Prone — access + stone clearance"),
  sk("nephrectomy-lap",    "Laparoscopic Nephrectomy",                   "Laparoscopic",        undefined,    "nephrectomy",             "Laparoscopic — radical"),
  sk("cystoscopy-bimanual", "Cystoscopy + Bimanual Examination",          "Endoscopic",          undefined,    "cystoscopy",              "Flexible / Rigid + bimanual examination"),
  sk("ureteroscopy-laser",  "Ureteroscopy + Laser Lithotripsy",           "Flexible ureteroscopy", undefined,  "ureteroscopy",            "Rigid / Semi-rigid — Holmium laser"),
  sk("radical-prostatectomy-robotic", "Robotic Radical Prostatectomy",   "Robotic / Da Vinci",  undefined,    "radical-prostatectomy",   "Robotic-assisted (RARP)"),
]
