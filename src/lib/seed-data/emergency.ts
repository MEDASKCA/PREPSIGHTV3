import { Procedure } from "../types"

// ── RSI — SHOWCASE ────────────────────────────────────────────────────────
const rsi: Procedure = {
  id: "rsi-intubation",
  familyId: "intubation",
  variantLabel: "RSI — video/direct laryngoscopy",
  name: "Rapid Sequence Induction (RSI) & Intubation",
  setting: "Emergency Department",
  specialty: "Resuscitation",
  sections: [
    {
      id: "overview", title: "Overview", sectionType: "overview",
      summary: "Emergency airway management using RSI to achieve rapid unconsciousness and neuromuscular blockade for tracheal intubation in patients at risk of aspiration or with compromised airways.",
      duration: "5–15 min",
      anaesthesiaType: "Induction agent + paralytic (ketamine / thiopentone + suxamethonium / rocuronium)",
      items: [],
    },
    {
      id: "pre-assess", title: "Pre-procedure Assessment", sectionType: "pre_procedure_assessment",
      items: [
        { id: "airway-assessment", name: "Airway Assessment", sku: "MOANS / LEMON / RODS", description: "Predict difficulty: Mallampati, thyromental, mouth opening, neck mobility", defaultQty: 1 },
        { id: "checklist",         name: "RSI Checklist",     sku: "Difficult Airway Checklist", description: "PREPARE: Patient, Room, Equipment, Personnel, Anaesthesia plan, Rescue plan, Equipment for failure", defaultQty: 1 },
      ],
    },
    {
      id: "ppe", title: "PPE", sectionType: "ppe",
      items: [
        { id: "gloves", name: "Non-Sterile Gloves", sku: "Nitrile Gloves",  defaultQty: 2 },
        { id: "apron",  name: "Disposable Apron",   sku: "PE Apron",        defaultQty: 1 },
        { id: "visor",  name: "Face Shield",         sku: "Full Face Visor", defaultQty: 1 },
      ],
    },
    {
      id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices",
      items: [
        { id: "video-laryngoscope", name: "Video Laryngoscope",  sku: "McGrath MAC",        description: "Primary device — always use in ED",                                product: "McGrath MAC",  supplier: { name: "Medtronic" }, defaultQty: 1 },
        { id: "direct-laryngoscope", name: "Direct Laryngoscope", sku: "Macintosh 3 + 4",   description: "Backup — size 3 and 4 blades available",                           defaultQty: 1 },
        { id: "bvm",                name: "BVM + PEEP Valve",    sku: "Laerdal Silicone BVM", description: "Pre-oxygenation and rescue ventilation",                          defaultQty: 1 },
        { id: "ett",                name: "ETT Sizes 7.0–8.0",   sku: "Portex cuffed ETT",  description: "Have sizes 6.0–8.5 available",                                     defaultQty: 3 },
        { id: "suction",            name: "Yankauer Suction",    sku: "Yankauer Rigid",     description: "Immediately accessible — at patient's right",                      defaultQty: 1 },
        { id: "capnography",        name: "Capnography",         sku: "EtCO₂ Monitor",      description: "Confirm intubation — continuous monitoring post-intubation",        defaultQty: 1 },
        { id: "stylet",             name: "Stylet / Bougie",     sku: "Eschmann Gum Elastic Bougie", description: "Grade 3–4 view rescue — have immediately accessible",    defaultQty: 1 },
      ],
    },
    {
      id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
      items: [
        { id: "ketamine",       name: "Ketamine 1–2 mg/kg IV",         sku: "Ketamine 200mg/2ml",   description: "Induction agent of choice in haemodynamic compromise", defaultQty: 1 },
        { id: "thiopentone",    name: "Thiopentone 3–5 mg/kg IV",     sku: "Pentothal",            description: "Induction — raised ICP (if SBP maintained)", defaultQty: 1 },
        { id: "suxamethonium",  name: "Suxamethonium 1.5 mg/kg IV",   sku: "Anectine",             description: "Depolarising NMB — rapid onset 60s, offset 8–10 min", defaultQty: 1 },
        { id: "rocuronium",     name: "Rocuronium 1.2 mg/kg IV",      sku: "Esmeron",              description: "Non-depolarising NMB if sux contraindicated — reverse with sugammadex", defaultQty: 1 },
        { id: "sugammadex",     name: "Sugammadex 16 mg/kg",          sku: "Bridion",              description: "Rocuronium reversal — MUST be immediately available if rocuronium used", defaultQty: 1 },
        { id: "fentanyl",       name: "Fentanyl 1–2 mcg/kg",         sku: "Fentanyl",             description: "Pre-treatment attenuation of laryngoscopy response", defaultQty: 1 },
      ],
    },
    {
      id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
      nurseNotes: "PREPARE before patient arrives: DAS difficult airway trolley checked, video laryngoscope charged and working, suction ON and at bedside, capnography ready, drugs drawn up and labelled.\n\nDRUG SEQUENCE: Pre-oxygenation (3 min 15L NRB or 8 breaths ETOM) → Pre-treatment → Induction agent → Paralytic → Sellick's manoeuvre (cricoid) → Intubate → Confirm with capnography.\n\nSugammadex MUST be drawn up and labelled if rocuronium used — Cannot-Intubate-Cannot-Oxygenate rescue.\n\nPost-intubation: secure ETT, CXR to confirm placement, commence ventilator settings.",
      items: [],
    },
    {
      id: "complications", title: "Complications & Escalation", sectionType: "complications_escalation",
      commonComplications: [
        "Failed intubation — back to BVM, call for senior airway help, DAS failed intubation algorithm",
        "Oesophageal intubation — no capnography waveform, immediate recognition and re-attempt",
        "Hypoxia on induction — optimise pre-oxygenation, BVM support",
        "Haemodynamic instability post-induction — ketamine preferred, push-dose adrenaline available",
        "Bradycardia with sux in children — atropine pre-treatment",
      ],
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
    setting: "Emergency Department",
    specialty,
    approach,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gloves", name: "Non-Sterile Gloves", sku: "Nitrile Gloves",  defaultQty: 2 },
        { id: "apron",  name: "Disposable Apron",   sku: "PE Apron",        defaultQty: 1 },
        { id: "visor",  name: "Face Shield",         sku: "Full Face Visor", defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "monitoring",  name: "Patient Monitor",       sku: "Philips IntelliVue",   defaultQty: 1 },
        { id: "ultrasound",  name: "Bedside Ultrasound",    sku: "SonoSite POCUS",       defaultQty: 1 },
        { id: "defibrillator", name: "Defibrillator",       sku: "Zoll R Series",        defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm indication and obtain consent where possible. Ensure monitoring in place throughout. Document time, indication, and result.",
        items: [],
      },
    ],
  }
}

export const emergency: Procedure[] = [
  rsi,
  sk("chest-drain-seldinger",    "Chest Drain Insertion (Seldinger)",  "Procedural", "Seldinger"),
  sk("dc-cardioversion",         "DC Cardioversion",                    "Procedural"),
  sk("lumbar-puncture-ed",       "Lumbar Puncture",                     "Procedural"),
]
