import { Procedure } from "../types"

// ── Urinary Catheterisation (Male) — SHOWCASE ─────────────────────────────
const urinaryCathMale: Procedure = {
  id: "urinary-cath-male",
  familyId: "urinary-catheterisation",
  variantLabel: "Male — Foley catheter",
  name: "Urinary Catheterisation — Male",
  setting: "Ward",
  specialty: "General Ward",
  sections: [
    {
      id: "overview", title: "Overview", sectionType: "overview",
      summary: "Aseptic insertion of a urethral catheter into the male bladder for urinary drainage, urine sampling, or post-operative monitoring.",
      duration: "10–20 min",
      anaesthesiaType: "Instillagel (local anaesthetic + lubricant gel) — no sedation required",
      items: [],
    },
    {
      id: "consent", title: "Consent & Documentation", sectionType: "consent_documentation",
      items: [
        { id: "consent-form",  name: "Verbal Consent",           sku: "Documented in notes", description: "Document consent obtained and indication in nursing notes", defaultQty: 1 },
        { id: "catheter-care", name: "Catheter Passport / SOP",  sku: "Local Trust SOP",     description: "Local policy for catheter care and documentation", defaultQty: 1 },
      ],
    },
    {
      id: "ppe", title: "PPE", sectionType: "ppe",
      items: [
        { id: "sterile-gloves", name: "Sterile Gloves",    sku: "Biogel 7.5",     description: "Strict aseptic technique — size checked", defaultQty: 2 },
        { id: "apron",          name: "Disposable Apron",  sku: "PE Apron",       description: "Personal protection",                     defaultQty: 1 },
        { id: "mask",           name: "Surgical Mask",     sku: "ASTM Level 3",   description: "If high risk / splatter risk",             defaultQty: 1 },
      ],
    },
    {
      id: "patient-prep", title: "Patient Preparation", sectionType: "patient_preparation",
      items: [
        { id: "position",     name: "Patient Positioning",  sku: "Supine flat",    description: "Supine, legs extended, abdomen exposed", defaultQty: 1 },
        { id: "light",        name: "Good Light Source",    sku: "Procedure Light", description: "Adequate illumination", defaultQty: 1 },
        { id: "waste-sheet",  name: "Sterile Drape / Sheet", sku: "Sterile Drape", description: "Protect sterile field", defaultQty: 1 },
      ],
    },
    {
      id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
      items: [
        { id: "catheter",         name: "Foley Catheter 14Fr",       sku: "Bard Biocath 14Fr",         description: "Hydrophilic coated — start with 14Fr, have 16Fr available", product: "Bard Biocath", supplier: { name: "BD Bard", contact: "01293 527 888" }, defaultQty: 1 },
        { id: "catheter-bag",     name: "Urinary Drainage Bag",      sku: "2L Drainage Bag with tap",  description: "Standard 2L bag — or night bag as appropriate", defaultQty: 1 },
        { id: "instillagel",      name: "Instillagel 11ml",          sku: "Instillagel",               description: "Lidocaine + chlorhexidine lubricant gel — instil 3–5 min before insertion", product: "Instillagel", supplier: { name: "Farco-Pharma" }, defaultQty: 1 },
        { id: "cleansing-swabs",  name: "Cleansing Swabs (×5)",      sku: "Non-linting Swabs",        description: "Sterile swabs for meatal cleansing with saline/antiseptic", defaultQty: 1 },
        { id: "water-10ml",       name: "Sterile Water 10ml",        sku: "Sterile Water for Injection", description: "Balloon inflation — use water not saline", defaultQty: 1 },
        { id: "sterile-drape",    name: "Fenestrated Sterile Drape", sku: "Fenestrated Catheter Drape", description: "Sterile field around meatus", defaultQty: 1 },
        { id: "kidney-dish",      name: "Sterile Kidney Dish",       sku: "Stainless Steel Kidney Dish", description: "Receive urine drainage", defaultQty: 1 },
      ],
    },
    {
      id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
      nurseNotes: "ANTT (Aseptic Non-Touch Technique) throughout — do not contaminate key parts.\n\nINSTILLAGEL: Instil full 11ml syringe into meatus and wait 3–5 minutes before insertion — essential for comfort and tract preparation.\n\nINSERTION: Hold penis at 90° to abdomen to straighten urethra. Advance catheter gently — do not force. If resistance at external sphincter, ask patient to breathe out and try again. Advance fully to Y-junction before inflating balloon.\n\nBALLOON: Inflate with 10ml sterile water (NOT saline — crystallises). Patient should feel no pain on inflation — if pain, deflate immediately and advance further.\n\nDOCUMENT: Date, time, indication, catheter size/type/batch number, balloon volume, residual on insertion, urine colour.",
      items: [],
    },
    {
      id: "post-care", title: "Post-procedure Care", sectionType: "post_procedure_care",
      recoveryNotes: "Secure catheter to leg with catheter strap — prevent traction. Bag below bladder at all times — gravity drainage. Daily meatal hygiene with soap and water. Document urine output and characteristics.",
      items: [
        { id: "cath-strap",   name: "Catheter Leg Strap",   sku: "Bard StatLock",       description: "Secure catheter to upper thigh", defaultQty: 1 },
        { id: "cath-stand",   name: "Catheter Bag Stand",   sku: "IV Pole / Floor Stand", description: "Keep bag below bladder", defaultQty: 1 },
      ],
    },
    {
      id: "complications", title: "Complications & Escalation", sectionType: "complications_escalation",
      commonComplications: [
        "Failed catheterisation — try 16Fr, consider Coudé tip catheter, refer to urology if second attempt fails",
        "Haematuria — reassure if mild, monitor, senior review if haematuria with clots",
        "False passage — stop immediately, urgent urology review",
        "CAUTI (catheter-associated UTI) — remove/change catheter at 5–7 days per policy, MSU sample",
        "Bypassing — check catheter not blocked, consider smaller catheter, bladder spasm treatment",
      ],
      items: [],
    },
  ],
}

// ── Urinary Catheterisation (Female) — SHOWCASE ───────────────────────────
const urinaryCathFemale: Procedure = {
  id: "urinary-cath-female",
  familyId: "urinary-catheterisation",
  variantLabel: "Female — Foley catheter",
  name: "Urinary Catheterisation — Female",
  setting: "Ward",
  specialty: "General Ward",
  sections: [
    {
      id: "overview", title: "Overview", sectionType: "overview",
      summary: "Aseptic insertion of a urethral catheter into the female bladder. Shorter urethra than male — technique varies.",
      duration: "5–15 min",
      anaesthesiaType: "Lubricant gel — no local anaesthetic usually required for female catheterisation",
      items: [],
    },
    {
      id: "ppe", title: "PPE", sectionType: "ppe",
      items: [
        { id: "sterile-gloves", name: "Sterile Gloves",   sku: "Biogel 7.0",   defaultQty: 2 },
        { id: "apron",          name: "Disposable Apron", sku: "PE Apron",     defaultQty: 1 },
      ],
    },
    {
      id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
      items: [
        { id: "catheter",       name: "Foley Catheter 12Fr",        sku: "Bard Biocath 12Fr",           description: "Standard female — 12Fr or 14Fr", defaultQty: 1 },
        { id: "catheter-bag",   name: "Urinary Drainage Bag",       sku: "2L Drainage Bag",             defaultQty: 1 },
        { id: "lubricant",      name: "Lubricating Gel",            sku: "KY Jelly / Lubricating Gel",  description: "Non-local anaesthetic lubricant is adequate for females", defaultQty: 1 },
        { id: "swabs",          name: "Cleansing Swabs (×5)",       sku: "Non-linting Swabs",           defaultQty: 1 },
        { id: "water-10ml",     name: "Sterile Water 10ml",         sku: "Sterile Water for Injection", defaultQty: 1 },
      ],
    },
    {
      id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
      nurseNotes: "Patient in supine position, knees bent and apart. Good lighting essential — procedure light positioned at perineum. If difficulty locating meatus in obese patient: lateral Sims position may help. Female urethra 4cm — catheter only needs to advance 5–6cm before urine flows. Do not inflate balloon until urine drains freely.",
      items: [],
    },
  ],
}

function sk(id: string, name: string, specialty: string, approach?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Ward",
    specialty,
    approach,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gloves", name: "Sterile Gloves",   sku: "Biogel 7.0",   defaultQty: 2 },
        { id: "apron",  name: "Disposable Apron", sku: "PE Apron",     defaultQty: 1 },
        { id: "mask",   name: "Surgical Mask",    sku: "ASTM Level 3", defaultQty: 1 },
      ]},
      { id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies", items: [
        { id: "pack",    name: "Procedure Pack",      sku: "Minor Procedure Pack",  description: "Sterile field, drapes, swabs, kidney dish", defaultQty: 1 },
        { id: "gauze",   name: "Sterile Gauze",       sku: "Gauze Swab 10×10",      defaultQty: 5 },
        { id: "saline",  name: "Normal Saline 20ml",  sku: "0.9% NaCl",             defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "ANTT throughout. Confirm indication and consent. Document procedure time, findings, and any complications.",
        items: [],
      },
    ],
  }
}

export const ward: Procedure[] = [
  urinaryCathMale,
  urinaryCathFemale,
  sk("wound-drain-removal",     "Wound Drain Removal",                    "Surgical Ward", undefined, "wound-drain-removal",        "Vacuum drain removal"),
  sk("staple-removal",          "Surgical Staple Removal",                "Surgical Ward", undefined, "wound-closure-removal",       "Surgical staple removal"),
  sk("wound-dehiscence-care",   "Wound Dehiscence Management",            "Surgical Ward", undefined, "wound-care",                  "Dehiscence assessment and management"),
  sk("ng-tube-insertion",       "Nasogastric Tube Insertion",             "Medical Ward",  undefined, "ng-tube-insertion",           "NG tube — pH confirmation"),
  sk("blood-transfusion-admin", "Blood Transfusion Administration",       "Medical Ward",  undefined, "blood-product-administration", "Red cell transfusion"),
  sk("subcutaneous-infusion",   "Subcutaneous Infusion (Hypodermoclysis)","Medical Ward",  undefined, "subcutaneous-infusion",       "Hypodermoclysis / SC infusion"),
  sk("syringe-driver-setup",    "Syringe Driver Setup",                   "Medical Ward",  undefined, "subcutaneous-infusion",       "Syringe driver setup"),
]
