import { Procedure } from "../types"

function sk(id: string, name: string, specialty: string, approach?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Outpatient / Clinic",
    specialty,
    approach,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gloves", name: "Non-Sterile Gloves", sku: "Nitrile Gloves",  defaultQty: 2 },
        { id: "apron",  name: "Disposable Apron",   sku: "PE Apron",        defaultQty: 1 },
        { id: "mask",   name: "Surgical Mask",      sku: "ASTM Level 3",    defaultQty: 1 },
      ]},
      { id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies", items: [
        { id: "pack",      name: "Minor Ops Pack",    sku: "Minor Procedure Pack", defaultQty: 1 },
        { id: "local",     name: "Lidocaine 1% 10ml", sku: "Lidocaine",            description: "Local anaesthesia", defaultQty: 1 },
        { id: "dressing",  name: "Dressing",          sku: "Mepore / Mepilex",      defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm consent and allergy to local anaesthetic. Prepare minor ops trolley. Document procedure in outpatient notes.",
        items: [],
      },
    ],
  }
}

export const clinic: Procedure[] = [
  sk("skin-excision-clinic",      "Skin Lesion Excision",          "Minor Procedures"),
  sk("joint-injection-clinic",    "Joint Injection (Corticosteroid)", "Specialist Clinic", "Direct / ultrasound guided"),
  sk("cryotherapy-clinic",        "Cryotherapy",                    "Minor Procedures"),
  sk("incision-drainage-abscess", "Incision & Drainage (Abscess)",  "Minor Procedures"),
  sk("coil-insertion",            "Intrauterine Device Insertion",   "Specialist Clinic"),
  sk("colposcopy-punch-biopsy",   "Colposcopy + Punch Biopsy",      "Specialist Clinic"),
]
