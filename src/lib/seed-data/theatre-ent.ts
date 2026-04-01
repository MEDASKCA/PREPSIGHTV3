import { Procedure } from "../types"

function sk(id: string, name: string, approach?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty: "ENT",
    approach,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",     defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse",  defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight",       defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "headlight",    name: "Headlight",       sku: "Welch Allyn LED Headlight", defaultQty: 1 },
        { id: "microscope",   name: "Operating Microscope", sku: "Zeiss OPMI Vario",     defaultQty: 1 },
        { id: "diathermy",    name: "Diathermy Unit",  sku: "Valleylab FT10",            defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm side at WHO sign-in. Throat pack placement recorded. Microscope positioned and focused before draping. Local infiltration often used.",
        items: [],
      },
    ],
  }
}

export const theatreEnt: Procedure[] = [
  sk("tonsillectomy",          "Tonsillectomy",                              "Dissection / Coblation",  "tonsillectomy",                    "Cold steel / Diathermy"),
  sk("grommets",               "Grommet Insertion (Bilateral)",              "Myringotomy",             "grommets",                         "Bilateral grommet insertion"),
  sk("septoplasty",            "Septoplasty",                                "Endonasal",               "septoplasty",                      "Endoscopic — submucosal"),
  sk("functional-ess",         "Functional Endoscopic Sinus Surgery (FESS)", "Endoscopic",              "functional-endoscopic-sinus-surgery", "Bilateral FESS"),
  sk("pinnaplasty",            "Pinnaplasty / Otoplasty",                    "Posterior auricular",     "pinnaplasty",                      "Otoplasty — Mustardé sutures"),
  sk("submandibular-gland",    "Submandibular Gland Excision",               "Transcervical",           "submandibular-gland-excision",      "Extraoral approach"),
]
