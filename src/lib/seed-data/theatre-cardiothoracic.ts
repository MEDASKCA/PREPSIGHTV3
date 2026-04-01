import { Procedure } from "../types"

function sk(id: string, name: string, approach?: string, implantSystem?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty: "Cardiothoracic",
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight",      defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "cpb",       name: "Cardiopulmonary Bypass Machine", sku: "Terumo Advanced Perfusion System", description: "Heart-lung machine", defaultQty: 1 },
        { id: "diathermy", name: "Diathermy Unit",  sku: "Valleylab FT10", defaultQty: 1 },
        { id: "sternal-saw", name: "Sternal Saw",   sku: "Aesculap GM633", description: "Oscillating sternal saw", defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Perfusionist to be present and primed before patient in. Cell saver set up. Confirm heparin protocol. Have defibrillator ready.",
        items: [],
      },
    ],
  }
}

export const theatreCardiothoracic: Procedure[] = [
  sk("cabg",               "Coronary Artery Bypass Grafting (CABG)",     "Median sternotomy",            undefined,                      "coronary-artery-bypass",      "On-pump — LIMA + SVG"),
  sk("avr",                "Aortic Valve Replacement",                    "Median sternotomy",            "Edwards SAPIEN / Mechanical",  "aortic-valve-replacement",    "Median sternotomy — tissue valve"),
  sk("lobectomy-vats",     "VATS Lobectomy",                              "Video-assisted thoracoscopic", undefined,                      "lobectomy",                   "VATS — video-assisted"),
  sk("pneumonectomy",      "Pneumonectomy",                               "Posterolateral thoracotomy",   undefined,                      "pneumonectomy",               "Open thoracotomy"),
  sk("thoracic-drainage",  "Thoracic Drain Insertion (Open)",             "Intercostal",                  undefined,                      "thoracic-drainage",           "Surgical drain — empyema / effusion"),
]
