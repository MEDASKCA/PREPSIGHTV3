import { Procedure } from "../types"

export const theatreOrtho: Procedure[] = [
  // ── Total Hip Replacement ─────────────────────────────────────────────────
  {
    id: "thr-posterior",
    familyId: "total-hip-replacement",
    variantLabel: "Posterior — Exeter / Trident",
    name: "Total Hip Replacement",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Posterior",
    implantSystem: "Exeter / Trident",
    sections: [
      {
        id: "ppe",
        title: "PPE",
        sectionType: "ppe",
        items: [
          { id: "surgical-gown",   name: "Surgical Gown",        location: "4th Floor/Storage A/Shelf A2", sku: "Proxima OR",         description: "Sterile barrier protection — fluid-resistant reinforced gown", product: "Proxima OR",     supplier: { name: "Medline",    contact: "0800 123 456" }, defaultQty: 3 },
          { id: "surgical-gloves", name: "Surgical Gloves",      location: "4th Floor/Storage A/Shelf A3", sku: "Biogel Eclipse",      description: "Double-gloving, indicator system",                            product: "Biogel Eclipse 7.0", supplier: { name: "Mölnlycke",  contact: "0800 222 111" }, defaultQty: 2 },
          { id: "face-shield",     name: "Face Shield / Visor",  location: "3rd Floor/PPE Store/Cabinet 3", sku: "Halyard SafeSight",   description: "Full-face splash protection",                                 product: "Halyard SafeSight", supplier: { name: "Halyard Health", contact: "0800 456 789" }, defaultQty: 1 },
        ],
      },
      {
        id: "procedure-ref",
        title: "Operative References",
        sectionType: "procedure_reference",
        operativeTechniqueUrl: "https://www.stryker.com/us/en/joint-replacement/systems/exeter-stem.html",
        implantGuideUrl: "https://www.stryker.com/us/en/joint-replacement/systems/trident-ii-acetabular-system.html",
        items: [],
      },
      {
        id: "nurse-notes",
        title: "Nurse Prep Notes",
        sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm implant sizes with surgeon on WHO checklist. Have trial components on back table before incision. Cement gun and mix ready before broaching complete. Confirm diathermy settings: cut 30W / coag 30W. Lavage set opened after trialling.",
        items: [],
      },
      {
        id: "devices",
        title: "Medical Devices & Theatre Equipment",
        sectionType: "equipment_devices",
        items: [
          { id: "op-table",          name: "Operating Table",    sku: "Alphastar",          description: "Motorised operating table for patient positioning", product: "Alphastar",         supplier: { name: "Getinge",        contact: "0800 987 654" }, defaultQty: 1 },
          { id: "diathermy",         name: "Diathermy Unit",     sku: "Valleylab FT10",     description: "Monopolar and bipolar electrosurgical unit",        product: "Valleylab FT10",   supplier: { name: "Medtronic",       contact: "01923 212 213" }, defaultQty: 1 },
          { id: "image-intensifier", name: "Image Intensifier",  sku: "Ziehm Vision RFD",   description: "Intraoperative fluoroscopy — component verification", product: "Ziehm Vision RFD", supplier: { name: "Ziehm Imaging",  contact: "01293 851 100" }, defaultQty: 1 },
          { id: "suction",           name: "Suction Unit",       sku: "Medela Dominant",    description: "High-flow wound field clearance",                   product: "Medela Dominant",  supplier: { name: "Medela",          contact: "0800 169 0100" }, defaultQty: 1 },
        ],
      },
      {
        id: "positioning",
        title: "Patient Positioning",
        sectionType: "patient_positioning",
        patientPositionInstructions: "Lateral decubitus with operative hip uppermost. Apply bean bag support and inflate. Fix anterior pelvic peg at ASIS and posterior peg at sacrum — pelvis must be perpendicular to floor. Confirm with image intensifier before draping. Protect dependent axilla with padding. Check peroneal nerve at fibular head. Pad all bony prominences. Lower limb in slight flexion with sandbag under ankle.",
        items: [
          { id: "hip-positioner", name: "Hip Positioner", sku: "Lateral Positioner", description: "Lateral decubitus support — anterior and posterior pegs", defaultQty: 1 },
          { id: "beanbag",        name: "Beanbag",        sku: "Vac-Loc",            description: "Vacuum bean bag for patient stabilisation", product: "Vac-Loc", supplier: { name: "Med-Tec", contact: "01293 229 400" }, defaultQty: 1 },
          { id: "sandbag",        name: "Sandbag Set",    sku: "Sandbag 5kg",        description: "Limb support and counter-traction", defaultQty: 2 },
        ],
      },
      {
        id: "draping",
        title: "Sterile Field & Draping",
        sectionType: "sterile_field_draping",
        items: [
          { id: "hip-drape",    name: "Hip Drape Set",         sku: "Barrier Hip Set", description: "Fenestrated sterile drape — large reinforced aperture", product: "Barrier Hip Set", supplier: { name: "Mölnlycke", contact: "0800 222 111" }, defaultQty: 1 },
          { id: "incise-drape", name: "Adhesive Incise Drape", sku: "Ioban 2",         description: "Iodophor-impregnated antimicrobial incise drape",      product: "Ioban 2",         supplier: { name: "3M",        contact: "0800 232 1000" }, defaultQty: 1 },
        ],
      },
      {
        id: "instrument-trays",
        title: "Instrument Sets & Trays",
        sectionType: "instrument_sets_trays",
        items: [
          { id: "total-hip-tray",  name: "Total Hip Primary Tray",  sku: "THR Instrument Set",    description: "Primary instrumentation — retractors, chisels, neck osteotomy guide", defaultQty: 1 },
          { id: "bone-prep-tray",  name: "Bone Preparation Tray",   sku: "Reamer & Broach Set",   description: "Acetabular reamers, femoral broaches, trial components", defaultQty: 1 },
          { id: "soft-tissue-tray", name: "Basic Soft Tissue Tray", sku: "General Ortho Tray",    description: "Retractors, forceps, needle holders, scissors", defaultQty: 1 },
        ],
      },
      {
        id: "implants",
        title: "Implants & Prosthetics",
        sectionType: "implants_prosthetics",
        contentMode: "fixed",
        items: [
          { id: "exeter-stem",     name: "Exeter V40 Femoral Stem",     sku: "STR-EXT-V40",    description: "Cemented polished tapered stem — size confirmed intraoperatively", supplier: { name: "Stryker", contact: "01628 668 800" }, defaultQty: 1 },
          { id: "trident-shell",   name: "Trident II Acetabular Shell", sku: "STR-TRI-ACE",    description: "Cementless press-fit cup — size matched to reamer", supplier: { name: "Stryker", contact: "01628 668 800" }, defaultQty: 1 },
          { id: "trident-liner",   name: "Trident Poly Liner",          sku: "STR-TRI-LNR",    description: "Highly cross-linked polyethylene insert", supplier: { name: "Stryker", contact: "01628 668 800" }, defaultQty: 1 },
          { id: "femoral-head",    name: "Femoral Head (28/32/36mm)",   sku: "STR-EXT-HEAD",   description: "Modular CoCr head — offset and size confirmed after trialling", supplier: { name: "Stryker", contact: "01628 668 800" }, defaultQty: 1 },
          { id: "bone-cement-thr", name: "Simplex P Bone Cement 40g",   sku: "STR-SPX-P-40G",  description: "PMMA cement for femoral stem fixation", supplier: { name: "Stryker", contact: "01628 668 800" }, defaultQty: 2 },
        ],
      },
      {
        id: "consumables",
        title: "Consumables & Supplies",
        sectionType: "consumables_supplies",
        items: [
          { id: "gauze",        name: "Gauze 10 × 10",    sku: "Gauze Swab",        description: "Absorption and field packing", defaultQty: 20 },
          { id: "tonsil-swabs", name: "Tonsil Swabs",     sku: "Tonsil Swab Pk/5", description: "Deep field use — radiopaque", defaultQty: 5 },
          { id: "bone-wax",     name: "Bone Wax",         sku: "Ethicon Bone Wax", description: "Haemostasis of bone surfaces", product: "Ethicon Bone Wax", supplier: { name: "J&J MedTech", contact: "01344 864 000" }, defaultQty: 2 },
          { id: "lavage",       name: "Pulse Lavage Set", sku: "Interpulse",        description: "High-pressure wound irrigation", product: "Interpulse", supplier: { name: "Stryker", contact: "01628 668 800" }, defaultQty: 1 },
        ],
      },
      {
        id: "medications",
        title: "Medications & Fluids",
        sectionType: "medications_fluids",
        items: [
          { id: "paracetamol", name: "IV Paracetamol 1g",   sku: "Perfalgan", description: "Multimodal analgesia — intraoperative", defaultQty: 1 },
          { id: "txa",         name: "Tranexamic Acid 1g",  sku: "TXA",       description: "Antifibrinolytic — reduce intraoperative blood loss", defaultQty: 1 },
          { id: "antibiotic",  name: "Cefuroxime 1.5g IV",  sku: "Zinacef",   description: "Antibiotic prophylaxis — given at induction", defaultQty: 1 },
        ],
      },
      {
        id: "prophylaxis",
        title: "Thromboprophylaxis",
        sectionType: "medications_fluids",
        items: [
          { id: "ted-stockings", name: "Compression Stockings", sku: "TED Stockings", description: "DVT prevention — measure patient preoperatively", product: "T.E.D. Anti-Embolism", supplier: { name: "Cardinal Health", contact: "01753 690 000" }, defaultQty: 1 },
          { id: "lmwh",          name: "Enoxaparin 40mg SC",    sku: "Clexane",       description: "Chemical thromboprophylaxis — prescribe for 35 days post-op", defaultQty: 1 },
        ],
      },
      {
        id: "local-infiltration",
        title: "Local Anaesthetic Infiltration",
        sectionType: "anaesthesia",
        items: [
          { id: "ropivacaine", name: "Ropivacaine 0.2%",       sku: "Naropin",    description: "Local anaesthetic — pericapsular infiltration (LIA)", defaultQty: 1 },
          { id: "adrenaline",  name: "Adrenaline 1:200,000",   sku: "Adrenaline", description: "Vasoconstriction — reduce local bleeding", defaultQty: 1 },
          { id: "ketorolac",   name: "Ketorolac 30mg",         sku: "Toradol",    description: "NSAID adjunct to LIA cocktail", defaultQty: 1 },
        ],
      },
      {
        id: "dressing",
        title: "Post-procedure Care & Dressing",
        sectionType: "post_procedure_care",
        items: [
          { id: "wound-dressing", name: "Waterproof Adhesive Dressing", sku: "Aquacel Ag+",  description: "Antimicrobial wound coverage — change at 5–7 days", product: "Aquacel Ag+", supplier: { name: "ConvaTec", contact: "0800 289 738" }, defaultQty: 1 },
          { id: "wound-drain",    name: "Wound Drain",                  sku: "RedVac 400ml", description: "Haematoma prevention — remove at 24–48 hours", product: "RedVac 400ml", supplier: { name: "LeMaitre Vascular", contact: "01344 784 444" }, defaultQty: 1 },
        ],
      },
    ],
  },

  // ── Total Knee Replacement ────────────────────────────────────────────────
  {
    id: "tkr",
    familyId: "total-knee-replacement",
    variantLabel: "Medial parapatellar — ATTUNE",
    name: "Total Knee Replacement",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Medial parapatellar",
    implantSystem: "ATTUNE",
    sections: [
      {
        id: "ppe", title: "PPE", sectionType: "ppe",
        items: [
          { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    description: "Fluid-resistant sterile gown",  product: "Proxima OR",      supplier: { name: "Medline",   contact: "0800 123 456" }, defaultQty: 3 },
          { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", description: "Double-gloving indicator system", product: "Biogel Eclipse 7.0", supplier: { name: "Mölnlycke", contact: "0800 222 111" }, defaultQty: 2 },
        ],
      },
      {
        id: "procedure-ref", title: "Operative References", sectionType: "procedure_reference",
        operativeTechniqueUrl: "https://www.jnjmedtech.com/en-US/product/attune-primary-knee-system",
        implantGuideUrl: "https://www.jnjmedtech.com/en-US/product/attune-primary-knee-system",
        items: [],
      },
      {
        id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm PCL-retaining vs substituting with surgeon. Tourniquet set 100mmHg above systolic — record time. Mix cement only when surgeon confirms trialling complete. Have knee immobiliser ready for post-op.",
        items: [],
      },
      {
        id: "devices", title: "Medical Devices & Theatre Equipment", sectionType: "equipment_devices",
        items: [
          { id: "tourniquet", name: "Pneumatic Tourniquet", sku: "ATS 3000",  description: "Upper thigh tourniquet — set 100mmHg above systolic", product: "ATS 3000", supplier: { name: "Zimmer Biomet", contact: "01793 835 600" }, defaultQty: 1 },
          { id: "op-table",   name: "Operating Table",      sku: "Alphastar", description: "Flat supine with leg holder attachment", defaultQty: 1 },
        ],
      },
      {
        id: "positioning", title: "Patient Positioning", sectionType: "patient_positioning",
        patientPositionInstructions: "Supine on flat table. Tourniquet to upper thigh before prep. Leg holder positioned at mid-thigh to allow 90° knee flexion. Heel supported on footrest. Confirm knee can fully flex and extend freely. Pad contralateral heel and sacrum.",
        items: [
          { id: "leg-holder", name: "Knee Leg Holder", sku: "Leg Holder",            description: "Maintains 90° knee flexion for exposure", defaultQty: 1 },
          { id: "footrest",   name: "Foot Rest",        sku: "Adjustable Footrest",   description: "Distal leg support", defaultQty: 1 },
        ],
      },
      {
        id: "draping", title: "Sterile Field & Draping", sectionType: "sterile_field_draping",
        items: [
          { id: "knee-drape",   name: "Knee Drape Set",        sku: "Barrier Knee Set", description: "Split-leg fenestrated sterile drape", product: "Barrier Knee Set", supplier: { name: "Mölnlycke" }, defaultQty: 1 },
          { id: "incise-drape", name: "Adhesive Incise Drape", sku: "Ioban 2",           description: "Antimicrobial iodophor drape",       product: "Ioban 2",         supplier: { name: "3M" },        defaultQty: 1 },
        ],
      },
      {
        id: "trays", title: "Instrument Sets & Trays", sectionType: "instrument_sets_trays",
        items: [
          { id: "tkr-tray",   name: "TKR Instrument Set",      sku: "ATTUNE Tray",      description: "Cutting guides, spacer blocks, trial components", defaultQty: 1 },
          { id: "basic-tray", name: "Basic Soft Tissue Tray",  sku: "General Ortho Tray", description: "Retractors, forceps, needle holders", defaultQty: 1 },
        ],
      },
      {
        id: "implants",
        title: "Implants & Prosthetics",
        sectionType: "implants_prosthetics",
        contentMode: "fixed",
        items: [
          { id: "attune-femoral",  name: "ATTUNE Femoral Component",    sku: "JJ-ATT-FEM",    description: "Size confirmed intraoperatively with trial", supplier: { name: "J&J MedTech", contact: "01344 864 000" }, defaultQty: 1 },
          { id: "attune-tibial",   name: "ATTUNE Tibial Baseplate",     sku: "JJ-ATT-TIB",    description: "Cementless or cemented — surgeon preference", supplier: { name: "J&J MedTech", contact: "01344 864 000" }, defaultQty: 1 },
          { id: "attune-insert",   name: "ATTUNE Tibial Insert",        sku: "JJ-ATT-INS",    description: "CR or PS poly insert — thickness confirmed at trial", supplier: { name: "J&J MedTech", contact: "01344 864 000" }, defaultQty: 1 },
          { id: "attune-patella",  name: "Patellar Resurfacing Button", sku: "JJ-ATT-PAT",    description: "Optional — surgeon discretion", supplier: { name: "J&J MedTech", contact: "01344 864 000" }, defaultQty: 1 },
          { id: "bone-cement-tkr", name: "Bone Cement (Palacos R+G)",  sku: "PAL-RG-40G",    description: "Gentamicin-loaded PMMA for tibial fixation", supplier: { name: "Heraeus" }, defaultQty: 2 },
        ],
      },
      {
        id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
        items: [
          { id: "gauze",  name: "Gauze 10 × 10", sku: "Gauze Swab",   defaultQty: 20 },
          { id: "cement", name: "Bone Cement",   sku: "Palacos R+G", description: "Gentamicin-loaded PMMA cement", product: "Palacos R+G", supplier: { name: "Heraeus" }, defaultQty: 2 },
          { id: "lavage", name: "Pulse Lavage Set", sku: "Interpulse", description: "Pre-cementation canal wash", defaultQty: 1 },
        ],
      },
      {
        id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
        items: [
          { id: "paracetamol", name: "IV Paracetamol 1g",  sku: "Perfalgan", defaultQty: 1 },
          { id: "txa",         name: "Tranexamic Acid 1g", sku: "TXA",       description: "IV and intra-articular", defaultQty: 2 },
          { id: "antibiotic",  name: "Cefuroxime 1.5g IV", sku: "Zinacef",   description: "Prophylactic antibiotic at induction", defaultQty: 1 },
        ],
      },
      {
        id: "prophylaxis", title: "Thromboprophylaxis", sectionType: "medications_fluids",
        items: [
          { id: "stockings", name: "Compression Stockings", sku: "TED Stockings", defaultQty: 1 },
          { id: "lmwh",      name: "Enoxaparin 40mg SC",    sku: "Clexane",       description: "35-day postoperative course", defaultQty: 1 },
        ],
      },
      {
        id: "local", title: "Local Infiltration", sectionType: "anaesthesia",
        items: [
          { id: "ropivacaine", name: "Ropivacaine 0.2%",  sku: "Naropin",  description: "Periarticular infiltration", defaultQty: 1 },
          { id: "morphine",    name: "Morphine Sulphate", sku: "Morphine", description: "Intra-articular — surgeon discretion", defaultQty: 1 },
        ],
      },
      {
        id: "dressing", title: "Post-procedure Care & Dressing", sectionType: "post_procedure_care",
        items: [
          { id: "wound-dressing", name: "Waterproof Dressing", sku: "Aquacel Ag+", description: "Primary wound dressing", product: "Aquacel Ag+", supplier: { name: "ConvaTec" }, defaultQty: 1 },
        ],
      },
    ],
  },

  // ── Total Shoulder Arthroplasty ───────────────────────────────────────────
  {
    id: "tsa",
    familyId: "total-shoulder-arthroplasty",
    variantLabel: "Deltopectoral — Aequalis / Simpliciti",
    name: "Total Shoulder Arthroplasty",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Deltopectoral",
    implantSystem: "Aequalis / Simpliciti",
    sections: [
      {
        id: "ppe", title: "PPE", sectionType: "ppe",
        items: [
          { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    description: "Fluid-resistant sterile gown", defaultQty: 3 },
          { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", description: "Double-gloving", defaultQty: 2 },
        ],
      },
      {
        id: "procedure-ref", title: "Operative References", sectionType: "procedure_reference",
        operativeTechniqueUrl: "https://www.stryker.com/us/en/joint-replacement/systems/shoulder-arthroplasty.html",
        implantGuideUrl: "https://www.stryker.com/us/en/joint-replacement/systems/shoulder-arthroplasty.html",
        items: [],
      },
      {
        id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Interscalene block performed by anaesthetics — confirm before positioning. Confirm anatomic vs reverse TSA with surgeon on checklist. Have both glenoid and humeral trial sets available.",
        items: [],
      },
      {
        id: "devices", title: "Medical Devices & Theatre Equipment", sectionType: "equipment_devices",
        items: [
          { id: "beach-chair",       name: "Beach Chair Positioner", sku: "Spider Beach Chair",        description: "Head and trunk support system", defaultQty: 1 },
          { id: "arthroscopy-tower", name: "Arthroscopy Tower",       sku: "Smith & Nephew Tower",      description: "Camera, fluid, shaver — if scopy first", defaultQty: 1 },
        ],
      },
      {
        id: "positioning", title: "Patient Positioning", sectionType: "patient_positioning",
        patientPositionInstructions: "Beach chair position at 60–70° trunk elevation. Head secured in neutral rotation — no lateral flexion. Operative shoulder at table edge to allow full arm movement. McConnell arm holder attached. Gel pad under sacrum and heels. Confirm arm can be adducted and externally rotated freely before draping.",
        items: [
          { id: "arm-holder", name: "Arm Holder", sku: "McConnell Arm Holder", description: "Free-floating arm positioning", defaultQty: 1 },
        ],
      },
      {
        id: "draping", title: "Sterile Field & Draping", sectionType: "sterile_field_draping",
        items: [
          { id: "shoulder-drape", name: "Shoulder Drape Set", sku: "Barrier Shoulder Set", description: "Upper extremity sterile field", defaultQty: 1 },
        ],
      },
      {
        id: "trays", title: "Instrument Sets & Trays", sectionType: "instrument_sets_trays",
        items: [
          { id: "shoulder-tray", name: "Shoulder Arthroplasty Tray", sku: "Aequalis Tray", description: "Reamers, trials, glenoid guides", defaultQty: 1 },
        ],
      },
      {
        id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
        items: [
          { id: "gauze",    name: "Gauze 10 × 10", sku: "Gauze Swab",      defaultQty: 20 },
          { id: "bone-wax", name: "Bone Wax",       sku: "Ethicon Bone Wax", defaultQty: 1 },
        ],
      },
      {
        id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
        items: [
          { id: "paracetamol", name: "IV Paracetamol 1g",  sku: "Perfalgan", defaultQty: 1 },
          { id: "antibiotic",  name: "Cefuroxime 1.5g IV", sku: "Zinacef",   defaultQty: 1 },
        ],
      },
      {
        id: "prophylaxis", title: "Thromboprophylaxis", sectionType: "medications_fluids",
        items: [
          { id: "stockings", name: "Compression Stockings", sku: "TED Stockings", defaultQty: 1 },
        ],
      },
      {
        id: "local", title: "Local Infiltration", sectionType: "anaesthesia",
        items: [
          { id: "ropivacaine", name: "Ropivacaine 0.75%", sku: "Naropin", description: "Interscalene block — anaesthetic team", defaultQty: 1 },
        ],
      },
      {
        id: "dressing", title: "Post-procedure Care & Dressing", sectionType: "post_procedure_care",
        items: [
          { id: "wound-dressing", name: "Waterproof Dressing", sku: "Aquacel Ag+", defaultQty: 1 },
          { id: "sling",          name: "Shoulder Sling",       sku: "Ultrasling", description: "Immobilisation — 4–6 weeks", defaultQty: 1 },
        ],
      },
    ],
  },

  // ── IM Nail — Femur ───────────────────────────────────────────────────────
  {
    id: "im-nail-femur",
    familyId: "im-nail-femur",
    variantLabel: "Piriformis / Trochanteric — Gamma3 / TFN",
    name: "IM Nail — Femur",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Piriformis / Trochanteric",
    implantSystem: "Stryker Gamma3 / TFN",
    sections: [
      {
        id: "ppe", title: "PPE", sectionType: "ppe",
        items: [
          { id: "gown",      name: "Surgical Gown", sku: "Proxima OR",           defaultQty: 3 },
          { id: "lead-apron", name: "Lead Apron",   sku: "Radiation Protection", description: "X-ray protection — fluoroscopy case", defaultQty: 4 },
        ],
      },
      {
        id: "procedure-ref", title: "Operative References", sectionType: "procedure_reference",
        operativeTechniqueUrl: "https://www.stryker.com/us/en/trauma-and-extremities/products/gamma3-trochanteric-nail.html",
        implantGuideUrl: "https://www.stryker.com/us/en/trauma-and-extremities/products/gamma3-trochanteric-nail.html",
        items: [],
      },
      {
        id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Lead aprons for all staff — II will be in use throughout. Confirm nail diameter and length pre-op. Have proximal and distal locking guides on table. Confirm distal locking technique with surgeon (freehand vs targeting arm).",
        items: [],
      },
      {
        id: "devices", title: "Medical Devices & Theatre Equipment", sectionType: "equipment_devices",
        items: [
          { id: "traction-table",    name: "Traction Table",    sku: "OSI Jackson Table",  description: "Longitudinal and rotational traction", defaultQty: 1 },
          { id: "image-intensifier", name: "Image Intensifier", sku: "Ziehm Vision RFD",   description: "AP and lateral views — essential", defaultQty: 1 },
          { id: "diathermy",         name: "Diathermy Unit",    sku: "Valleylab FT10",     defaultQty: 1 },
        ],
      },
      {
        id: "positioning", title: "Patient Positioning", sectionType: "patient_positioning",
        patientPositionInstructions: "Supine on traction table. Perineal post padded and positioned at groin. Traction boot applied to operative limb — confirm alignment before draping. Contralateral limb in traction or abducted on leg support. Confirm AP and lateral II views obtainable before prepping. Slightly flex and internally rotate operative hip to facilitate nail entry.",
        items: [
          { id: "perineal-post", name: "Perineal Post",  sku: "Traction Post",   description: "Counter-traction — padded", defaultQty: 1 },
          { id: "traction-boot", name: "Traction Boot",  sku: "Fracture Boot",   description: "Foot attachment for traction", defaultQty: 1 },
        ],
      },
      {
        id: "draping", title: "Sterile Field & Draping", sectionType: "sterile_field_draping",
        items: [
          { id: "lower-limb-drape", name: "Lower Limb Drape Set", sku: "Barrier Lower Limb", description: "Full limb access draping", defaultQty: 1 },
        ],
      },
      {
        id: "trays", title: "Instrument Sets & Trays", sectionType: "instrument_sets_trays",
        items: [
          { id: "nail-tray",   name: "IM Nail Insertion Tray", sku: "Gamma3 Tray",       description: "Targeting arm, insertion handle, locking guides", defaultQty: 1 },
          { id: "basic-tray",  name: "Basic Ortho Tray",        sku: "General Ortho Tray", defaultQty: 1 },
        ],
      },
      {
        id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
        items: [
          { id: "gauze",  name: "Gauze 10 × 10",   sku: "Gauze Swab",           defaultQty: 10 },
          { id: "k-wire", name: "Guide Wire Set",   sku: "Ball-tipped Guide Wire", description: "Nail passage guide", defaultQty: 1 },
        ],
      },
      {
        id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
        items: [
          { id: "paracetamol", name: "IV Paracetamol 1g",  sku: "Perfalgan", defaultQty: 1 },
          { id: "txa",         name: "Tranexamic Acid 1g", sku: "TXA",       defaultQty: 1 },
          { id: "antibiotic",  name: "Cefuroxime 1.5g IV", sku: "Zinacef",   defaultQty: 1 },
        ],
      },
      {
        id: "prophylaxis", title: "Thromboprophylaxis", sectionType: "medications_fluids",
        items: [
          { id: "stockings", name: "Compression Stockings", sku: "TED Stockings", defaultQty: 1 },
          { id: "lmwh",      name: "Enoxaparin 40mg SC",    sku: "Clexane",       defaultQty: 1 },
        ],
      },
      {
        id: "local", title: "Local Infiltration", sectionType: "anaesthesia",
        items: [
          { id: "ropivacaine", name: "Ropivacaine 0.5%", sku: "Naropin", description: "Portal site infiltration", defaultQty: 1 },
        ],
      },
      {
        id: "dressing", title: "Post-procedure Care & Dressing", sectionType: "post_procedure_care",
        items: [
          { id: "wound-dressing", name: "Waterproof Dressing", sku: "Aquacel Ag+", defaultQty: 1 },
        ],
      },
    ],
  },

  // ── Arthroscopic ACL Reconstruction (skeleton) ────────────────────────────
  {
    id: "acl-reconstruction",
    familyId: "acl-reconstruction",
    variantLabel: "Arthroscopic — Hamstring / BPTB graft",
    name: "ACL Reconstruction",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Arthroscopic",
    implantSystem: "Hamstring / BPTB graft",
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",     defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse",  defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight Visor", defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "arthroscopy-tower",  name: "Arthroscopy Tower",   sku: "Stryker 1488",     description: "Camera, light source, fluid management", defaultQty: 1 },
        { id: "shaver",             name: "Powered Shaver",      sku: "Stryker System 8", description: "Soft tissue debridement", defaultQty: 1 },
        { id: "tourniquet",         name: "Pneumatic Tourniquet", sku: "ATS 3000",          defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm graft choice with surgeon pre-list. Graft preparation table ready before harvest. Have tibial and femoral tunnel guides available. Confirm fixation device sizes.",
        items: [],
      },
    ],
  },

  // ── Spine — TLIF (skeleton) ───────────────────────────────────────────────
  {
    id: "tlif",
    familyId: "tlif",
    variantLabel: "Posterior — Pedicle screw + cage",
    name: "Transforaminal Lumbar Interbody Fusion (TLIF)",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Posterior",
    implantSystem: "Pedicle screw + cage",
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",      name: "Surgical Gown",   sku: "Proxima OR",           defaultQty: 3 },
        { id: "gloves",    name: "Surgical Gloves", sku: "Biogel Eclipse",        defaultQty: 2 },
        { id: "lead-apron", name: "Lead Apron",      sku: "Radiation Protection", defaultQty: 4 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "image-intensifier", name: "Image Intensifier", sku: "Ziehm Vision RFD", description: "AP and lateral views for screw placement", defaultQty: 1 },
        { id: "neuro-monitor",     name: "Neuromonitoring",   sku: "Intraoperative EMG", description: "Pedicle screw placement monitoring", defaultQty: 1 },
        { id: "spine-frame",       name: "Wilson Frame",      sku: "OSI Wilson Frame",   description: "Prone positioning frame", defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm implant sizes pre-list. Lead aprons for all staff — II throughout. Neuromonitoring team to set up before patient in. Check cell saver availability.",
        items: [],
      },
    ],
  },

  // ── Ankle Arthroplasty (skeleton) ─────────────────────────────────────────
  {
    id: "ankle-arthroplasty",
    familyId: "total-ankle-arthroplasty",
    variantLabel: "Anterior approach — STAR / Infinity",
    name: "Total Ankle Arthroplasty",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Anterior",
    implantSystem: "STAR / Infinity",
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight",      defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "tourniquet",         name: "Pneumatic Tourniquet",  sku: "ATS 3000",        defaultQty: 1 },
        { id: "image-intensifier",  name: "Image Intensifier",    sku: "Ziehm Vision RFD", description: "AP and lateral ankle views", defaultQty: 1 },
        { id: "diathermy",          name: "Diathermy Unit",        sku: "Valleylab FT10",  defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm implant system and sizes. Ensure II available and calibrated. Tourniquet high on thigh. Have bone grafting material if required.",
        items: [],
      },
    ],
  },

  // ── Dynamic Hip Screw (skeleton) ──────────────────────────────────────────
  {
    id: "dhs",
    familyId: "dynamic-hip-screw",
    variantLabel: "Lateral approach — Synthes DHS",
    name: "Dynamic Hip Screw (DHS)",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Lateral",
    implantSystem: "Synthes DHS",
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",      name: "Surgical Gown",   sku: "Proxima OR",           defaultQty: 3 },
        { id: "gloves",    name: "Surgical Gloves", sku: "Biogel Eclipse",        defaultQty: 2 },
        { id: "lead-apron", name: "Lead Apron",      sku: "Radiation Protection", defaultQty: 4 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "traction-table",    name: "Traction Table",    sku: "OSI Jackson Table",  defaultQty: 1 },
        { id: "image-intensifier", name: "Image Intensifier", sku: "Ziehm Vision RFD",   description: "AP and lateral hip views essential", defaultQty: 1 },
        { id: "power-tools",       name: "Power Drill",       sku: "Stryker System 6",   defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm fracture pattern and DHS size with surgeon. Lead aprons mandatory. Check sliding screw, barrel and plate sizes are available.",
        items: [],
      },
    ],
  },

  // ── Unicompartmental Knee Replacement (skeleton) ──────────────────────────
  {
    id: "ukr",
    familyId: "unicompartmental-knee",
    variantLabel: "Minimally invasive — Oxford / Repicci",
    name: "Unicompartmental Knee Replacement",
    setting: "Operating Theatre",
    specialty: "Orthopaedics",
    approach: "Minimally invasive",
    implantSystem: "Oxford / Repicci",
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",   sku: "Proxima OR",    defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves", sku: "Biogel Eclipse", defaultQty: 2 },
        { id: "visor",  name: "Face Visor",       sku: "SafeSight",      defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "tourniquet",         name: "Pneumatic Tourniquet", sku: "ATS 3000",        defaultQty: 1 },
        { id: "image-intensifier",  name: "Image Intensifier",   sku: "Ziehm Vision RFD", defaultQty: 1 },
        { id: "op-table",           name: "Operating Table",      sku: "Alphastar",        defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Oxford phase 3 requires specific instrumentation. Confirm medial vs lateral compartment. Have bearing sizes 3–5 available. Cement mixing on surgeon confirmation only.",
        items: [],
      },
    ],
  },
]
