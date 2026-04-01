import { Procedure } from "../types"

function skeleton(
  id: string, name: string, specialty: string,
  approach?: string, implantSystem?: string,
  familyId?: string, variantLabel?: string
): Procedure {
  return {
    id,
    familyId: familyId ?? id,
    variantLabel,
    name,
    setting: "Operating Theatre",
    specialty,
    approach,
    implantSystem,
    sections: [
      { id: "ppe", title: "PPE", sectionType: "ppe", items: [
        { id: "gown",   name: "Surgical Gown",    sku: "Proxima OR",     defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves",  sku: "Biogel Eclipse",  defaultQty: 2 },
        { id: "visor",  name: "Face Visor",         sku: "SafeSight",       defaultQty: 1 },
      ]},
      { id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices", items: [
        { id: "diathermy",  name: "Diathermy Unit",  sku: "Valleylab FT10", defaultQty: 1 },
        { id: "suction",    name: "Suction Unit",     sku: "Medela",          defaultQty: 1 },
        { id: "laparoscopy", name: "Laparoscopy Tower", sku: "Stryker 1488",  defaultQty: 1 },
      ]},
      { id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
        nurseNotes: "Confirm approach and equipment with surgeon at WHO sign-in. Check all instruments counted and accounted for.",
        items: [],
      },
    ],
  }
}

// ── Laparoscopic Cholecystectomy — SHOWCASE ───────────────────────────────
const lapChole: Procedure = {
  id: "lap-chole",
  familyId: "cholecystectomy",
  variantLabel: "Laparoscopic (4-port)",
  name: "Laparoscopic Cholecystectomy",
  setting: "Operating Theatre",
  specialty: "General Surgery",
  approach: "Laparoscopic",
  sections: [
    {
      id: "overview", title: "Overview", sectionType: "overview",
      summary: "Laparoscopic removal of the gallbladder for symptomatic gallstone disease or cholecystitis. Standard four-port technique with critical view of safety.",
      duration: "45–90 min",
      anaesthesiaType: "General anaesthesia",
      items: [],
    },
    {
      id: "ppe", title: "PPE", sectionType: "ppe",
      items: [
        { id: "gown",   name: "Surgical Gown",    sku: "Proxima OR",      description: "Fluid-resistant sterile gown",         product: "Proxima OR",       supplier: { name: "Medline",    contact: "0800 123 456" }, defaultQty: 3 },
        { id: "gloves", name: "Surgical Gloves",  sku: "Biogel Eclipse",  description: "Double-gloving indicator system",       product: "Biogel Eclipse 7.0", supplier: { name: "Mölnlycke", contact: "0800 222 111" }, defaultQty: 2 },
        { id: "visor",  name: "Face Visor",         sku: "SafeSight Visor", description: "Splash protection",                    product: "Halyard SafeSight", supplier: { name: "Halyard Health" }, defaultQty: 1 },
      ],
    },
    {
      id: "nurse-notes", title: "Nurse Prep Notes", sectionType: "nurse_prep_notes",
      nurseNotes: "Set up laparoscopy stack BEFORE patient arrives — white balance camera and check CO₂. Confirm 5mm and 10mm ports plus 30° scope. Have open tray available for conversion. Clip applicers (Hem-o-Lok and metal clips) on back table before start. Patient in reverse Trendelenburg + left lateral tilt for exposure. Confirm irrigation available.",
      items: [],
    },
    {
      id: "devices", title: "Equipment & Devices", sectionType: "equipment_devices",
      items: [
        { id: "laparoscopy-stack", name: "Laparoscopy Stack",           sku: "Stryker 1588",     description: "Camera, light source, CO₂ insufflator, monitor", product: "Stryker 1588", supplier: { name: "Stryker",    contact: "01628 668 800" }, defaultQty: 1 },
        { id: "diathermy",         name: "Diathermy Unit",              sku: "Valleylab FT10",   description: "Monopolar hook + bipolar",                        product: "Valleylab FT10", supplier: { name: "Medtronic" },                          defaultQty: 1 },
        { id: "co2-tank",          name: "CO₂ Insufflation Gas",        sku: "CO₂ Medical Grade", description: "Pneumoperitoneum — set pressure 12mmHg",          defaultQty: 1 },
        { id: "suction-irrigator", name: "Suction/Irrigation System",  sku: "Nezhat-Dorsey",    description: "Lavage and field clearance",                      defaultQty: 1 },
      ],
    },
    {
      id: "positioning", title: "Patient Positioning", sectionType: "patient_positioning",
      patientPositionInstructions: "Supine. Reverse Trendelenburg 20–30° and left lateral tilt once pneumoperitoneum achieved. Both arms out. Gel pad under lumbar spine. Ensure patient is secured with shoulder supports and hip straps — position changes during case. Surgeon stands to patient's left. Monitor at patient's right shoulder.",
      items: [
        { id: "shoulder-support", name: "Shoulder Support",  sku: "Padded Shoulder Bar", description: "Prevents cephalad migration during tilt", defaultQty: 2 },
        { id: "gel-pad",          name: "Gel Positioning Pad", sku: "Viscoelastic Pad",  description: "Lumbar support",                           defaultQty: 1 },
      ],
    },
    {
      id: "draping", title: "Sterile Field & Draping", sectionType: "sterile_field_draping",
      items: [
        { id: "laparoscopy-drape", name: "Laparoscopy Drape Set", sku: "Barrier Laparoscopy", description: "Large aperture fenestrated drape", product: "Barrier Laparoscopy Set", supplier: { name: "Mölnlycke" }, defaultQty: 1 },
        { id: "camera-cover",      name: "Camera Drape / Cover",  sku: "Camera Drape",         description: "Sterile scope cover",                                                  defaultQty: 1 },
      ],
    },
    {
      id: "trays", title: "Instrument Sets & Trays", sectionType: "instrument_sets_trays",
      items: [
        { id: "laparoscopy-tray",  name: "Laparoscopy Tray",         sku: "Lap Basic Set",      description: "Ports (5mm ×3, 10mm ×1), graspers, scissors, clip applicers", defaultQty: 1 },
        { id: "open-tray",         name: "General Surgery Open Tray", sku: "Lap Conversion Set", description: "Available at all times for conversion",                         defaultQty: 1 },
      ],
    },
    {
      id: "consumables", title: "Consumables & Supplies", sectionType: "consumables_supplies",
      items: [
        { id: "gauze",          name: "Gauze 10 × 10",         sku: "Gauze Swab",           defaultQty: 10 },
        { id: "veress",         name: "Veress Needle",         sku: "Veress 150mm",         description: "Initial pneumoperitoneum access", defaultQty: 1 },
        { id: "hem-o-lok",      name: "Hem-o-Lok Clips (S/M)", sku: "Hem-o-Lok 5mm Clip",  description: "Cystic duct and artery ligation",  product: "Hem-o-Lok", supplier: { name: "Teleflex", contact: "01480 485 000" }, defaultQty: 1 },
        { id: "metal-clips",    name: "Metal Clips",           sku: "Ligaclip ERCA",         description: "Backup clip application",          product: "Ligaclip", supplier: { name: "Ethicon" }, defaultQty: 1 },
        { id: "specimen-bag",   name: "Specimen Retrieval Bag", sku: "Endobag",              description: "Gallbladder removal through port",  defaultQty: 1 },
      ],
    },
    {
      id: "meds", title: "Medications & Fluids", sectionType: "medications_fluids",
      items: [
        { id: "paracetamol",  name: "IV Paracetamol 1g",   sku: "Perfalgan",   description: "Multimodal analgesia", defaultQty: 1 },
        { id: "antibiotic",   name: "Co-Amoxiclav 1.2g IV", sku: "Augmentin",   description: "Antibiotic prophylaxis at induction", defaultQty: 1 },
        { id: "ondansetron",  name: "Ondansetron 4mg IV",   sku: "Zofran",      description: "PONV prophylaxis", defaultQty: 1 },
        { id: "dexamethasone", name: "Dexamethasone 8mg",  sku: "Dexamethasone", description: "PONV + anti-inflammatory", defaultQty: 1 },
      ],
    },
    {
      id: "procedure-ref", title: "Operative References", sectionType: "procedure_reference",
      operativeTechniqueUrl: "https://www.websurg.com/doi-ot02en001.htm",
      externalLinks: [
        { label: "Critical View of Safety (SAGES)", url: "https://www.sages.org/critical-view-of-safety/" },
      ],
      items: [],
    },
    {
      id: "post-care", title: "Post-procedure Care", sectionType: "post_procedure_care",
      recoveryNotes: "Routine recovery. Monitor for shoulder tip pain (referred diaphragmatic irritation from CO₂ — reassure patient). Ensure adequate analgesia before discharge. Day case for elective; overnight if complex.",
      items: [
        { id: "wound-dressing", name: "Port Site Dressing", sku: "Mepore", description: "Small adhesive dressings to each port site", defaultQty: 4 },
      ],
    },
    {
      id: "discharge", title: "Discharge Criteria", sectionType: "discharge_criteria",
      dischargeCriteria: [
        "Tolerating oral fluids and light diet",
        "Pain controlled on oral analgesia",
        "Passed urine",
        "No signs of haemorrhage or bile leak",
        "Responsible adult to take home",
        "Written discharge instructions given",
      ],
      items: [],
    },
    {
      id: "complications", title: "Complications & Escalation", sectionType: "complications_escalation",
      commonComplications: [
        "Bile duct injury — refer to HPB surgeon",
        "Port site bleeding — apply pressure, consider closure stitch",
        "Conversion to open — alert team early, open tray immediately",
        "Bile leak post-op — USS guided drainage if significant",
        "Port site hernia — late complication, fascial closure on 10mm ports",
      ],
      items: [],
    },
  ],
}

export const theatreGeneral: Procedure[] = [
  lapChole,
  skeleton("appendicectomy-lap",       "Laparoscopic Appendicectomy",        "General Surgery", "Laparoscopic",    undefined,       "appendicectomy",       "Laparoscopic"),
  skeleton("open-appendicectomy",       "Open Appendicectomy",                "General Surgery", "Gridiron / Lanz", undefined,       "appendicectomy",       "Open (Gridiron incision)"),
  skeleton("inguinal-hernia-lap",       "Laparoscopic Inguinal Hernia Repair", "General Surgery", "TEP / TAPP",     undefined,       "inguinal-hernia-repair", "Laparoscopic (TEP / TAPP)"),
  skeleton("inguinal-hernia-open",      "Open Inguinal Hernia Repair",        "General Surgery", "Lichtenstein",    "Prolene mesh",  "inguinal-hernia-repair", "Open (Lichtenstein)"),
  skeleton("hartmanns",                 "Hartmann's Procedure",               "General Surgery", "Midline laparotomy", undefined,    "hartmanns-procedure",  "Open — end colostomy"),
  skeleton("right-hemicolectomy",       "Right Hemicolectomy",                "General Surgery", "Laparoscopic / Open", undefined,  "right-hemicolectomy",  "Laparoscopic — right colon resection"),
  skeleton("anterior-resection",        "Anterior Resection",                 "General Surgery", "Laparoscopic / Open", undefined,  "anterior-resection",   "Laparoscopic — stapled anastomosis"),
  skeleton("thyroidectomy",             "Thyroidectomy",                      "General Surgery", "Collar incision", undefined,       "thyroidectomy",        "Total thyroidectomy"),
]
