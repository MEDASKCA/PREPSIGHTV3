import { Procedure } from "../types"

function sk(id: string, name: string, specialty: string, approach?: string, familyId?: string, variantLabel?: string): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Endoscopy Suite",
    specialty,
    approach,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "apron",  name: "Disposable Apron",   sku: "PE Apron",        defaultQty: 1 },
        { id: "gloves", name: "Non-Sterile Gloves", sku: "Nitrile Gloves",  defaultQty: 2 },
        { id: "visor",  name: "Face Shield",         sku: "Full Face Visor", defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "endoscope", name: "Endoscope",     sku: "Olympus GIF-H190", description: "Video endoscope — cleaned and checked", defaultQty: 1 },
        { id: "processor", name: "Processor Unit", sku: "Olympus EVIS CV-190", description: "Image processor and light source", defaultQty: 1 },
        { id: "suction",   name: "Suction",       sku: "Medical Suction",  defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Scope decontamination checked. Consent confirmed. Fasting status verified. Sedation pathway agreed with endoscopist.",
        items: [],
      },
    ],
  }
}

// ── OGD — SHOWCASE ────────────────────────────────────────────────────────
const ogd: Procedure = {
  id: "ogd",
  familyId: "upper-gi-endoscopy",
  variantLabel: "Diagnostic OGD",
  name: "OGD — Oesophago-gastro-duodenoscopy",
  setting: "Endoscopy Suite",
  specialty: "Upper GI",
  approach: "Oral",
  sections: [
    {
      id: "overview", title: "Overview", sectionType: "overview",
      summary: "Diagnostic and/or therapeutic upper GI endoscopy examining the oesophagus, stomach, and first/second part of the duodenum.",
      duration: "10–30 min",
      anaesthesiaType: "Conscious sedation (midazolam ± fentanyl) or throat spray only",
      items: [],
    },
    {
      id: "consent", title: "Consent & Documentation", sectionType: "consent_documentation",
      items: [
        { id: "consent-form", name: "Endoscopy Consent Form",   sku: "BSG Consent Form",      description: "Signed by patient — includes risk of perforation, bleeding, missed lesion", defaultQty: 1 },
        { id: "referral",     name: "Referral / Indication",    sku: "JAG / BSG Indication",   description: "Appropriate indication confirmed", defaultQty: 1 },
      ],
    },
    {
      id: "pre-assess", title: "Pre-procedure Assessment", sectionType: "pre_procedure_assessment",
      items: [
        { id: "fasting",   name: "Fasting Check",          sku: "Nil by mouth 6h solids / 2h clear fluids", defaultQty: 1 },
        { id: "allergy",   name: "Allergy Screen",          sku: "Latex / Medication allergy",               defaultQty: 1 },
        { id: "anticoag",  name: "Anticoagulation Review",  sku: "Warfarin / DOAC / Aspirin",                 defaultQty: 1 },
      ],
    },
    {
      id: "ppe", title: "PPE", sectionType: "ppe",
      items: [
        { id: "apron",  name: "Disposable Apron",     sku: "PE Apron",        description: "Splash protection",              defaultQty: 1 },
        { id: "gloves", name: "Non-Sterile Gloves",   sku: "Nitrile Gloves",  description: "Barrier protection",             defaultQty: 2 },
        { id: "visor",  name: "Face Shield / Visor",  sku: "Full Face Visor", description: "Splash to face and eyes",        defaultQty: 1 },
        { id: "mask",   name: "Surgical Mask",        sku: "ASTM Level 3",    description: "Droplet precautions",            defaultQty: 1 },
      ],
    },
    {
      id: "patient-prep", title: "Patient Preparation", sectionType: "patient_preparation",
      items: [
        { id: "iv-access",      name: "IV Cannula",         sku: "Venflon 20G",      description: "Sedation pathway — mandatory", defaultQty: 1 },
        { id: "throat-spray",   name: "Lidocaine Throat Spray", sku: "Xylocaine 10%", description: "Topical anaesthesia for comfort", defaultQty: 1 },
        { id: "mouthguard",     name: "Mouthguard",         sku: "Disposable Bite Block", description: "Scope protection and patient comfort", defaultQty: 1 },
        { id: "oxygen-probe",   name: "SpO₂ Probe",         sku: "Pulse Oximeter",  description: "Continuous monitoring during sedation", defaultQty: 1 },
      ],
    },
    {
      id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices",
      items: [
        { id: "video-gastroscope", name: "Video Gastroscope",      sku: "Olympus GIF-H190",    description: "9.9mm diameter, 103cm working length",                              product: "Olympus GIF-H190",    supplier: { name: "Olympus Medical", contact: "01702 616 333" }, defaultQty: 1 },
        { id: "processor",         name: "Endoscopy Processor",    sku: "Olympus EVIS CV-190", description: "HD imaging, NBI narrow band imaging",                               product: "EVIS EXERA III",      supplier: { name: "Olympus Medical" }, defaultQty: 1 },
        { id: "suction",           name: "Suction System",         sku: "Medical Suction",     description: "Connected to scope working channel",                                defaultQty: 1 },
        { id: "co2-insufflator",   name: "CO₂ Insufflator",        sku: "Olympus CO₂ Reg",    description: "CO₂ preferred over air — faster absorption, less distension pain",  defaultQty: 1 },
      ],
    },
    {
      id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
      items: [
        { id: "biopsy-forceps", name: "Biopsy Forceps",     sku: "Boston Scientific Radial Jaw 4", description: "Cold biopsy — standard for diagnostic sampling", product: "Radial Jaw 4", supplier: { name: "Boston Scientific" }, defaultQty: 2 },
        { id: "specimen-pots",  name: "Biopsy Specimen Pots", sku: "Formalin Pot 30ml",            description: "Labelled with site — antrum, corpus, duodenum etc", defaultQty: 4 },
        { id: "lubricant",      name: "Endoscopy Lubricant",  sku: "Lignocaine Gel 2%",            description: "Scope insertion gel", defaultQty: 1 },
      ],
    },
    {
      id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
      items: [
        { id: "midazolam",    name: "Midazolam",       sku: "Midazolam 2mg/ml", description: "Conscious sedation — titrate to effect (max 5mg)", defaultQty: 1 },
        { id: "fentanyl",     name: "Fentanyl 50mcg",  sku: "Fentanyl",         description: "Opioid adjunct — if therapeutic procedure", defaultQty: 1 },
        { id: "flumazenil",   name: "Flumazenil 0.2mg", sku: "Anexate",         description: "Benzodiazepine reversal — keep accessible", defaultQty: 1 },
        { id: "buscopan",     name: "Hyoscine (Buscopan) 20mg IV", sku: "Buscopan", description: "Reduces peristalsis — aids visualisation", defaultQty: 1 },
      ],
    },
    {
      id: "specimen", title: "Specimen Collection", sectionType: "specimen_collection",
      items: [
        { id: "antrum-bx",    name: "Antral Biopsy × 2",     sku: "Formalin Pot", description: "CLO test (H. pylori) + histology", defaultQty: 1 },
        { id: "corpus-bx",    name: "Corpus Biopsy × 2",     sku: "Formalin Pot", description: "Histology — assess metaplasia", defaultQty: 1 },
        { id: "duodenum-bx",  name: "Duodenal Biopsy × 4",  sku: "Formalin Pot", description: "Coeliac screen — D2 minimum 4 biopsies", defaultQty: 1 },
        { id: "clo-test",     name: "CLO Test",               sku: "CLO Test Kit", description: "Rapid H. pylori urease test — antral biopsy", product: "CLO Test", supplier: { name: "Kimberly-Clark" }, defaultQty: 1 },
      ],
    },
    {
      id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
      nurseNotes: "Check scope decontamination log. Confirm fasting >6h solids / >2h clear fluids. IV access confirmed BEFORE sedation. Sedation nurse dedicated — do not leave patient unattended. Monitor SpO₂ and HR throughout. Flumazenil immediately accessible. Document all specimens with site label. If upper GI bleed: have therapeutic equipment (clips, Adrenaline 1:10,000, heater probe) ready before starting.",
      items: [],
    },
    {
      id: "post-care", title: "Post-procedure Care", sectionType: "post_procedure_care",
      recoveryNotes: "Recovery in endoscopy unit until Aldrete score ≥9. Minimum 30 min observation post-sedation. No driving for 24h after sedation. Light diet when gag reflex returned if throat spray used.",
      items: [
        { id: "recovery-monitoring", name: "Recovery Monitoring Chart", sku: "Endoscopy Recovery Form", defaultQty: 1 },
      ],
    },
    {
      id: "discharge", title: "Discharge Criteria", sectionType: "discharge_criteria",
      dischargeCriteria: [
        "Aldrete score ≥9",
        "SpO₂ ≥95% on room air",
        "Pain / discomfort minimal",
        "Tolerating oral fluids",
        "Responsible adult escort if sedated",
        "Written procedure report and aftercare instructions given",
      ],
      items: [],
    },
    {
      id: "complications", title: "Complications & Escalation", sectionType: "complications_escalation",
      commonComplications: [
        "Perforation — senior review, surgical referral, CT confirmation",
        "Sedation over-sedation — flumazenil, oxygen, call anaesthetics",
        "Post-biopsy bleeding — repeat endoscopy if haemodynamically significant",
        "Aspiration — head-down position, suction, anaesthetic support",
        "Missed lesion — ensure adequate retroflexion and J-manoeuvre",
      ],
      items: [],
    },
  ],
}

// ── Colonoscopy — SHOWCASE (briefer than OGD) ─────────────────────────────
const colonoscopy: Procedure = {
  id: "colonoscopy",
  familyId: "colonoscopy",
  variantLabel: "Diagnostic / therapeutic",
  name: "Colonoscopy",
  setting: "Endoscopy Suite",
  specialty: "Lower GI",
  approach: "Anal",
  sections: [
    {
      id: "overview", title: "Overview", sectionType: "overview",
      summary: "Diagnostic and/or therapeutic lower GI endoscopy examining the rectum, colon, and terminal ileum. Requires bowel preparation.",
      duration: "20–45 min",
      anaesthesiaType: "Conscious sedation (midazolam ± fentanyl)",
      items: [],
    },
    {
      id: "pre-assess", title: "Pre-procedure Assessment", sectionType: "pre_procedure_assessment",
      items: [
        { id: "bowel-prep",  name: "Bowel Preparation Confirmation", sku: "Bristol Stool Scale 6–7", description: "Adequate if Bristol ≥6 — document result", defaultQty: 1 },
        { id: "anticoag",    name: "Anticoagulation Review",         sku: "DOAC / Warfarin bridging",  description: "Stop per local protocol — check INR if warfarin", defaultQty: 1 },
        { id: "iron",        name: "Iron Tablets Stopped",           sku: "Iron-free 5 days prior",    description: "Iron deposits impair mucosal visibility", defaultQty: 1 },
      ],
    },
    {
      id: "ppe", title: "PPE", sectionType: "ppe",
      items: [
        { id: "apron",   name: "Disposable Apron",   sku: "PE Apron",        defaultQty: 1 },
        { id: "gloves",  name: "Non-Sterile Gloves", sku: "Nitrile Gloves",  defaultQty: 2 },
        { id: "visor",   name: "Face Shield",         sku: "Full Face Visor", defaultQty: 1 },
      ],
    },
    {
      id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices",
      items: [
        { id: "colonoscope",  name: "Video Colonoscope",    sku: "Olympus CF-HQ190L",   description: "High-definition 1690mm colonoscope", product: "Olympus CF-HQ190L", supplier: { name: "Olympus Medical" }, defaultQty: 1 },
        { id: "processor",    name: "Endoscopy Processor",  sku: "Olympus EVIS CV-190", description: "HD + NBI imaging", defaultQty: 1 },
        { id: "co2-reg",      name: "CO₂ Insufflator",      sku: "Olympus CO₂ Reg",     description: "CO₂ preferred — patient comfort and safety", defaultQty: 1 },
      ],
    },
    {
      id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
      items: [
        { id: "snare",          name: "Polypectomy Snare",   sku: "Boston Scientific Captivator", description: "Cold snare for polyps <10mm; hot snare 10–20mm", defaultQty: 2 },
        { id: "biopsy-forceps", name: "Biopsy Forceps",      sku: "Radial Jaw 4",                 defaultQty: 2 },
        { id: "specimen-pots",  name: "Specimen Pots",       sku: "Formalin 30ml",               description: "Labelled per polyp site", defaultQty: 6 },
        { id: "clips",          name: "Haemostasis Clips",   sku: "Resolution 360",              description: "Post-polypectomy bleeding — have ready", defaultQty: 1 },
      ],
    },
    {
      id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
      items: [
        { id: "midazolam",  name: "Midazolam",     sku: "Midazolam 2mg/ml",  description: "Conscious sedation — titrate",     defaultQty: 1 },
        { id: "fentanyl",   name: "Fentanyl 50mcg", sku: "Fentanyl",         description: "Opioid adjunct",                   defaultQty: 1 },
        { id: "buscopan",   name: "Buscopan 20mg IV", sku: "Hyoscine",        description: "Reduces spasm",                    defaultQty: 1 },
        { id: "adrenaline", name: "Adrenaline 1:10,000", sku: "Adrenaline",   description: "Dilute injection for post-polypectomy bleeding", defaultQty: 1 },
      ],
    },
    {
      id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
      nurseNotes: "Confirm adequate bowel prep before starting — abandon if inadequate. Document all polyp sizes and sites. Retrieve all polypectomy specimens separately. If hot snare: check diathermy settings (endocut). Keep water irrigation primed. Have adrenaline and clips immediately accessible for any polypectomy.",
      items: [],
    },
    {
      id: "complications", title: "Complications & Escalation", sectionType: "complications_escalation",
      commonComplications: [
        "Perforation — immediate senior review, CT confirmation, surgical referral",
        "Post-polypectomy bleeding — clips/adrenaline injection, call GI registrar",
        "Inadequate bowel prep — abandon, repeat after further preparation",
        "Splenic flexure injury — rare, suspect with left shoulder pain post-procedure",
      ],
      items: [],
    },
  ],
}

export const endoscopy: Procedure[] = [
  ogd,
  colonoscopy,
  sk("ercp",                  "ERCP",                              "Hepatobiliary", "Fluoroscopic",  "ercp",                              "Diagnostic + therapeutic ERCP"),
  sk("eus",                   "Endoscopic Ultrasound (EUS)",       "Upper GI",      undefined,       "endoscopic-ultrasound",             "Radial / Linear EUS"),
  sk("capsule-endoscopy",     "Capsule Endoscopy",                  "Lower GI",      undefined,       "capsule-endoscopy",                 "Small bowel capsule"),
  sk("flexible-sigmoidoscopy", "Flexible Sigmoidoscopy",           "Lower GI",      undefined,       "flexible-sigmoidoscopy",            "Flexible sigmoidoscopy"),
  sk("push-enteroscopy",      "Push Enteroscopy",                   "Upper GI",      undefined,       "enteroscopy",                       "Push enteroscopy"),
  sk("argon-plasma-coag",     "Argon Plasma Coagulation (APC)",    "Upper GI",      undefined,       "argon-plasma-coagulation",          "APC haemostasis"),
  sk("band-ligation",         "Oesophageal Variceal Band Ligation", "Upper GI",     undefined,       "band-ligation",                     "Oesophageal variceal banding"),
  sk("bronchoscopy-rigid",    "Rigid Bronchoscopy",                 "Respiratory",   undefined,       "bronchoscopy",                      "Rigid bronchoscopy"),
  sk("bronchoscopy-flexible", "Flexible Bronchoscopy + BAL",       "Respiratory",   undefined,       "bronchoscopy",                      "Flexible bronchoscopy"),
  sk("endobronchial-biopsy",  "Endobronchial Ultrasound (EBUS)",   "Respiratory",   undefined,       "endobronchial-biopsy",              "EBUS-guided biopsy"),
  sk("esd",                   "Endoscopic Submucosal Dissection (ESD)", "Upper GI", undefined,       "endoscopic-submucosal-dissection",  "Gastric / colonic ESD"),
]
