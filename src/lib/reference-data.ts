import type { Item, Section, WorkflowStep } from "./types"
import type {
  ReferenceProcedure,
  ReferenceProcedureSystemCard,
  ReferenceSupplier,
  ReferenceSystem,
  ReferenceVariant,
} from "./reference-schema"

function item(
  id: string,
  name: string,
  options: Partial<Item> = {},
): Item {
  return {
    id,
    name,
    ...options,
  }
}

function section(
  id: string,
  title: string,
  sectionType: Section["sectionType"],
  options: Omit<Section, "id" | "title" | "sectionType" | "items"> & { items?: Item[] } = {},
): Section {
  return {
    id,
    title,
    sectionType,
    items: options.items ?? [],
    ...options,
  }
}

function step(
  id: string,
  order: number,
  title: string,
  summary: string,
  options: Omit<WorkflowStep, "id" | "order" | "title" | "summary"> = {},
): WorkflowStep {
  return {
    id,
    order,
    title,
    summary,
    ...options,
  }
}

function cloneSections(sections: Section[]): Section[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.map((entry) => ({ ...entry })),
    externalLinks: section.externalLinks?.map((entry) => ({ ...entry })),
    alternatives: section.alternatives ? [...section.alternatives] : undefined,
    dischargeCriteria: section.dischargeCriteria ? [...section.dischargeCriteria] : undefined,
    commonComplications: section.commonComplications ? [...section.commonComplications] : undefined,
  }))
}

const hipSections: Section[] = [
  section("overview", "Overview", "overview", {
    summary:
      "Hybrid primary total hip replacement reference card for the posterior approach. Canonical build uses a cemented Exeter stem with an uncemented Trident II acetabular shell.",
    duration: "90-120 minutes",
    anaesthesiaType: "General or spinal with regional adjunct",
    primarySystem: "Exeter V40 / Trident II",
    alternatives: ["Backup shell sizes", "Backup head offsets", "Supplementary screw set"],
  }),
  section("ppe", "PPE", "ppe", {
    items: [
      item("hip-ppe-gown", "Reinforced sterile gown", { defaultQty: 3 }),
      item("hip-ppe-gloves", "Double-glove indicator system", { defaultQty: 4 }),
      item("hip-ppe-visor", "Eye and splash protection", { defaultQty: 2 }),
      item("hip-ppe-lead", "Lead protection for image intensifier use", { defaultQty: 2 }),
    ],
  }),
  section("patient-preparation", "Patient Preparation", "patient_preparation", {
    items: [
      item("hip-prep-who", "WHO sign-in and implant availability check", { defaultQty: 1 }),
      item("hip-prep-template", "Templating images and side confirmation visible in theatre", { defaultQty: 1 }),
      item("hip-prep-cement", "Cement mixing plan, gun, restrictor, and pulse lavage checked", { defaultQty: 1 }),
      item("hip-prep-blood", "Tranexamic acid and blood loss plan confirmed", { defaultQty: 1 }),
    ],
  }),
  section("anaesthesia", "Anaesthesia", "anaesthesia", {
    items: [
      item("hip-anaes-main", "General or spinal anaesthesia setup", { defaultQty: 1 }),
      item("hip-anaes-lia", "Local infiltration analgesia components", { defaultQty: 1 }),
      item("hip-anaes-prophylaxis", "Antibiotic prophylaxis and tranexamic acid", { defaultQty: 1 }),
    ],
  }),
  section("patient-positioning", "Patient Positioning", "patient_positioning", {
    patientPositionInstructions:
      "Lateral decubitus with the operative hip uppermost. Confirm the pelvis is square with anterior and posterior supports, pad pressure areas, protect the dependent axilla, and ensure the limb can be mobilised freely for broaching and reduction.",
  }),
  section("sterile-field", "Sterile Field & Draping", "sterile_field_draping", {
    items: [
      item("hip-drape-pack", "Hip arthroplasty drape pack", { defaultQty: 1 }),
      item("hip-incise", "Adhesive incise drape", { defaultQty: 1 }),
      item("hip-ii-cover", "Image intensifier sterile cover", { defaultQty: 1 }),
    ],
  }),
  section("operative-references", "Operative References", "procedure_reference", {
    externalLinks: [
      { label: "Posterior THR setup reference", url: "#" },
      { label: "Exeter V40 stem guide", url: "#" },
      { label: "Trident II acetabular system guide", url: "#" },
    ],
  }),
  section("trays", "Instrument Sets & Trays", "instrument_sets_trays", {
    items: [
      item("hip-tray-basic", "Primary hip arthroplasty basic tray", { defaultQty: 1 }),
      item("hip-tray-acetabular", "Acetabular reamer and shell tray", { defaultQty: 1 }),
      item("hip-tray-femoral", "Femoral broach and trial tray", { defaultQty: 1 }),
      item("hip-tray-cement", "Cementation accessories tray", { defaultQty: 1 }),
    ],
  }),
  section("equipment", "Equipment & Devices", "equipment_devices", {
    items: [
      item("hip-eq-table", "Orthopaedic operating table", { defaultQty: 1 }),
      item("hip-eq-diathermy", "Diathermy unit", { defaultQty: 1 }),
      item("hip-eq-suction", "Suction unit", { defaultQty: 1 }),
      item("hip-eq-lavage", "Pulse lavage device", { defaultQty: 1 }),
      item("hip-eq-ii", "Image intensifier", { defaultQty: 1 }),
    ],
  }),
  section("implants", "Implants & Prosthetics", "implants_prosthetics", {
    contentMode: "fixed",
    items: [
      item("hip-implant-stem", "Exeter V40 cemented femoral stem", { defaultQty: 1 }),
      item("hip-implant-shell", "Trident II acetabular shell", { defaultQty: 1 }),
      item("hip-implant-liner", "Trident polyethylene liner", { defaultQty: 1 }),
      item("hip-implant-head", "Femoral head and trial range", { defaultQty: 1 }),
      item("hip-implant-cement", "PMMA bone cement and restrictor", { defaultQty: 2 }),
    ],
  }),
  section("consumables", "Consumables & Supplies", "consumables_supplies", {
    items: [
      item("hip-consumable-swabs", "Radiopaque swabs and deep packs", { defaultQty: 20 }),
      item("hip-consumable-suction", "Suction tubing and Yankauer", { defaultQty: 1 }),
      item("hip-consumable-bone-wax", "Bone wax", { defaultQty: 1 }),
      item("hip-consumable-drain", "Drain if requested by surgeon", { defaultQty: 1 }),
    ],
  }),
  section("medications", "Medications & Fluids", "medications_fluids", {
    items: [
      item("hip-med-cef", "Antibiotic prophylaxis", { defaultQty: 1 }),
      item("hip-med-txa", "Tranexamic acid", { defaultQty: 1 }),
      item("hip-med-lia", "Local infiltration analgesia mix", { defaultQty: 1 }),
      item("hip-med-thromboprophylaxis", "Post-op thromboprophylaxis plan", { defaultQty: 1 }),
    ],
  }),
  section("specimen", "Specimen Collection", "specimen_collection", {
    items: [
      item("hip-specimen-none", "No routine specimen unless revision, infection concern, or unexpected tissue request", {
        defaultQty: 1,
      }),
    ],
  }),
  section("closure", "Wound Closure", "wound_closure", {
    items: [
      item("hip-closure-deep", "Deep fascial closure", { defaultQty: 1 }),
      item("hip-closure-skin", "Subcuticular or skin closure set", { defaultQty: 1 }),
    ],
  }),
  section("lia", "Local Infiltration", "local_infiltration", {
    items: [item("hip-lia-syringe", "LIA syringes and labelled bowl", { defaultQty: 1 })],
  }),
  section("dressings", "Dressings", "dressings", {
    items: [
      item("hip-dressing-main", "Occlusive arthroplasty dressing", { defaultQty: 1 }),
      item("hip-dressing-abduction", "Abduction pillow if requested", { defaultQty: 1 }),
    ],
  }),
  section("handover", "Handover Notes", "handover_notes", {
    nurseNotes:
      "Confirm final implant sizes, cement batch details, blood loss estimate, post-op weight-bearing status, and thromboprophylaxis plan during handover.",
  }),
]

const kneeSections: Section[] = [
  section("overview", "Overview", "overview", {
    summary:
      "Primary total knee replacement reference card for a medial parapatellar approach using the Triathlon knee system.",
    duration: "75-110 minutes",
    anaesthesiaType: "General or spinal with regional adjunct",
    primarySystem: "Triathlon Knee System",
    alternatives: ["CR or PS insert options", "Patellar resurfacing by surgeon preference"],
  }),
  section("ppe", "PPE", "ppe", {
    items: [
      item("knee-ppe-gown", "Reinforced sterile gown", { defaultQty: 3 }),
      item("knee-ppe-gloves", "Double-glove indicator system", { defaultQty: 4 }),
      item("knee-ppe-visor", "Eye and splash protection", { defaultQty: 2 }),
    ],
  }),
  section("patient-preparation", "Patient Preparation", "patient_preparation", {
    items: [
      item("knee-prep-who", "WHO sign-in with implant and tray confirmation", { defaultQty: 1 }),
      item("knee-prep-tourniquet", "Tourniquet plan and pressure confirmed", { defaultQty: 1 }),
      item("knee-prep-cement", "Cement, mixing system, and pulse lavage ready", { defaultQty: 1 }),
      item("knee-prep-sizing", "Backup femoral, tibial, insert, and patella sizes available", { defaultQty: 1 }),
    ],
  }),
  section("anaesthesia", "Anaesthesia", "anaesthesia", {
    items: [
      item("knee-anaes-main", "General or spinal anaesthesia setup", { defaultQty: 1 }),
      item("knee-anaes-block", "Adductor canal or regional adjunct if planned", { defaultQty: 1 }),
      item("knee-anaes-lia", "Local infiltration analgesia components", { defaultQty: 1 }),
    ],
  }),
  section("patient-positioning", "Patient Positioning", "patient_positioning", {
    patientPositionInstructions:
      "Supine with a thigh tourniquet, leg holder, and foot support configured to allow free flexion and extension. Check the knee can reach full flexion for femoral work and full extension for trial assessment before prepping.",
  }),
  section("sterile-field", "Sterile Field & Draping", "sterile_field_draping", {
    items: [
      item("knee-drape-pack", "Knee arthroplasty drape pack", { defaultQty: 1 }),
      item("knee-incise", "Adhesive incise drape", { defaultQty: 1 }),
      item("knee-tourniquet-cover", "Tourniquet and limb isolation setup", { defaultQty: 1 }),
    ],
  }),
  section("operative-references", "Operative References", "procedure_reference", {
    externalLinks: [
      { label: "Primary TKR setup reference", url: "#" },
      { label: "Triathlon knee system guide", url: "#" },
      { label: "Cementing checklist", url: "#" },
    ],
  }),
  section("trays", "Instrument Sets & Trays", "instrument_sets_trays", {
    items: [
      item("knee-tray-basic", "Primary knee arthroplasty tray", { defaultQty: 1 }),
      item("knee-tray-cuts", "Cutting block and alignment tray", { defaultQty: 1 }),
      item("knee-tray-trials", "Triathlon trial and insert tray", { defaultQty: 1 }),
      item("knee-tray-cement", "Cementation accessories tray", { defaultQty: 1 }),
    ],
  }),
  section("equipment", "Equipment & Devices", "equipment_devices", {
    items: [
      item("knee-eq-table", "Operating table", { defaultQty: 1 }),
      item("knee-eq-tourniquet", "Pneumatic tourniquet", { defaultQty: 1 }),
      item("knee-eq-diathermy", "Diathermy unit", { defaultQty: 1 }),
      item("knee-eq-suction", "Suction unit", { defaultQty: 1 }),
      item("knee-eq-lavage", "Pulse lavage device", { defaultQty: 1 }),
    ],
  }),
  section("implants", "Implants & Prosthetics", "implants_prosthetics", {
    contentMode: "fixed",
    items: [
      item("knee-implant-femur", "Triathlon femoral component", { defaultQty: 1 }),
      item("knee-implant-tibia", "Triathlon tibial baseplate", { defaultQty: 1 }),
      item("knee-implant-insert", "Triathlon tibial insert range", { defaultQty: 1 }),
      item("knee-implant-patella", "Triathlon patella button if resurfacing", { defaultQty: 1 }),
      item("knee-implant-cement", "Bone cement and mixing system", { defaultQty: 2 }),
    ],
  }),
  section("consumables", "Consumables & Supplies", "consumables_supplies", {
    items: [
      item("knee-consumable-swabs", "Radiopaque swabs and packs", { defaultQty: 20 }),
      item("knee-consumable-knife", "Skin knife and change blades", { defaultQty: 2 }),
      item("knee-consumable-marker", "Skin marker and drape tape", { defaultQty: 1 }),
    ],
  }),
  section("medications", "Medications & Fluids", "medications_fluids", {
    items: [
      item("knee-med-cef", "Antibiotic prophylaxis", { defaultQty: 1 }),
      item("knee-med-txa", "Tranexamic acid", { defaultQty: 1 }),
      item("knee-med-lia", "Local infiltration analgesia mix", { defaultQty: 1 }),
      item("knee-med-thromboprophylaxis", "Post-op thromboprophylaxis plan", { defaultQty: 1 }),
    ],
  }),
  section("specimen", "Specimen Collection", "specimen_collection", {
    items: [
      item("knee-specimen-none", "No routine specimen unless infection concern or specific request", {
        defaultQty: 1,
      }),
    ],
  }),
  section("closure", "Wound Closure", "wound_closure", {
    items: [
      item("knee-closure-deep", "Capsule and deep closure set", { defaultQty: 1 }),
      item("knee-closure-skin", "Skin closure set", { defaultQty: 1 }),
    ],
  }),
  section("lia", "Local Infiltration", "local_infiltration", {
    items: [item("knee-lia-syringe", "LIA syringes and labelled bowl", { defaultQty: 1 })],
  }),
  section("dressings", "Dressings", "dressings", {
    items: [
      item("knee-dressing-main", "Occlusive arthroplasty dressing", { defaultQty: 1 }),
      item("knee-dressing-bandage", "Compression bandage if requested", { defaultQty: 1 }),
    ],
  }),
  section("handover", "Handover Notes", "handover_notes", {
    nurseNotes:
      "Confirm component sizes, insert thickness, tourniquet time, blood loss estimate, patella resurfacing status, mobilisation plan, and thromboprophylaxis at handover.",
  }),
]

const attuneKneeSections: Section[] = cloneSections(kneeSections).map((entry) => {
  if (entry.sectionType !== "implants_prosthetics") return entry

  return {
    ...entry,
    items: [
      item("attune-implant-femur", "ATTUNE femoral component", { defaultQty: 1 }),
      item("attune-implant-tibia", "ATTUNE tibial baseplate", { defaultQty: 1 }),
      item("attune-implant-insert", "ATTUNE tibial insert range", { defaultQty: 1 }),
      item("attune-implant-patella", "ATTUNE patella button if resurfacing", { defaultQty: 1 }),
      item("attune-implant-cement", "Bone cement and mixing system", { defaultQty: 2 }),
    ],
  }
})

const hipWorkflow: WorkflowStep[] = [
  step("hip-setup", 1, "Room and implant setup", "Confirm the posterior THR tray stack, Exeter/Trident implants, cement kit, and backup sizes before patient entry.", {
    expectedInstruments: ["Primary hip tray", "Acetabular reamers", "Femoral broaches", "Cement gun"],
    reminders: ["Check backup head and liner sizes", "Confirm pulse lavage and restrictor are available"],
    rationale: "This prevents delays once femoral preparation and cement timing become critical.",
    relatedSectionIds: ["patient-preparation", "trays", "implants"],
  }),
  step("hip-position-drape", 2, "Position, prep, and drape", "Position in lateral decubitus, square the pelvis, complete prep, and establish the hip arthroplasty sterile field.", {
    expectedInstruments: ["Positioning supports", "Hip drape pack", "Image intensifier cover"],
    reminders: ["Protect pressure areas", "Check the pelvis remains square before draping"],
    rationale: "Accurate positioning supports exposure, leg-length assessment, and safe component orientation.",
    relatedSectionIds: ["patient-positioning", "sterile-field"],
  }),
  step("hip-exposure-neck-cut", 3, "Exposure and femoral neck cut", "Expose the posterior hip, dislocate, and complete the neck cut according to templating and surgeon preference.", {
    expectedInstruments: ["Retractors", "Oscillating saw", "Neck cut guide"],
    reminders: ["Keep trial and definitive head options ready", "Maintain clear communication around femoral head removal"],
    rationale: "A controlled exposure and neck cut define the rest of the reconstruction.",
    relatedSectionIds: ["trays"],
  }),
  step("hip-acetabulum", 4, "Acetabular preparation and cup insertion", "Ream sequentially, trial if required, and insert the Trident shell and liner.", {
    expectedInstruments: ["Acetabular reamers", "Cup impactor", "Liner inserter"],
    reminders: ["Open backup shell sizes before final insertion", "Have screw options ready if supplementary fixation is used"],
    rationale: "Cup orientation and stability are established here, so implant readiness matters before the shell is impacted.",
    relatedSectionIds: ["implants"],
  }),
  step("hip-femur", 5, "Femoral preparation and stem cementation", "Prepare the femur, trial offsets and head lengths, then cement and insert the Exeter stem.", {
    expectedInstruments: ["Femoral broaches", "Trial necks and heads", "Cement gun", "Canal restrictor"],
    reminders: ["Mix cement only when requested", "Keep suction and lavage ready for canal prep"],
    rationale: "This is the time-critical part of a hybrid THR and depends on the cement window being controlled.",
    relatedSectionIds: ["implants", "medications"],
  }),
  step("hip-reduction-closure", 6, "Reduction, checks, and closure", "Reduce the hip, confirm stability and leg parameters, then complete washout, closure, and dressing.", {
    expectedInstruments: ["Trial heads", "Definitive head", "Closure set", "Dressings"],
    reminders: ["Document final implant sizes", "Confirm post-op restrictions and weight-bearing plan"],
    rationale: "Final checks prevent avoidable instability and make the handover precise.",
    relatedSectionIds: ["closure", "dressings", "handover"],
  }),
]

const kneeWorkflow: WorkflowStep[] = [
  step("knee-setup", 1, "Room and implant setup", "Confirm the Triathlon tray stack, insert ladder, cement kit, and backup sizes before the patient enters theatre.", {
    expectedInstruments: ["Primary knee tray", "Cutting block tray", "Trial insert set", "Cement kit"],
    reminders: ["Check CR and PS options", "Confirm patella resurfacing instrumentation is present if needed"],
    rationale: "A clean implant ladder is essential because the insert and component plan can change after balancing.",
    relatedSectionIds: ["patient-preparation", "trays", "implants"],
  }),
  step("knee-position-drape", 2, "Position, prep, and drape", "Position supine with tourniquet and leg support, then prep and drape for a medial parapatellar exposure.", {
    expectedInstruments: ["Leg holder", "Tourniquet", "Knee drape pack"],
    reminders: ["Check full flexion and extension before draping", "Record tourniquet details"],
    rationale: "Correct setup is what allows accurate bone cuts, balancing, and efficient trialling.",
    relatedSectionIds: ["patient-positioning", "sterile-field"],
  }),
  step("knee-exposure", 3, "Exposure and initial bone preparation", "Perform the arthrotomy, expose the joint, and begin femoral and tibial preparation using the planned alignment strategy.", {
    expectedInstruments: ["Retractors", "Saw", "Alignment guides"],
    reminders: ["Keep suction and swab counts tight during exposure", "Have backup cutting blocks ready"],
    rationale: "Exposure quality directly affects the accuracy of the resections.",
    relatedSectionIds: ["trays", "equipment"],
  }),
  step("knee-cuts-balancing", 4, "Bone cuts, balancing, and trials", "Complete the resections, check gap balance, and trial femoral, tibial, and insert combinations.", {
    expectedInstruments: ["Femoral trials", "Tibial trials", "Insert ladder", "Gap checking tools"],
    reminders: ["Keep the insert ladder open and organised", "Confirm if patella resurfacing is going ahead before final components"],
    rationale: "Trialling is where the implant choice is finalised, so the next needed item is usually a specific trial or insert.",
    relatedSectionIds: ["implants"],
  }),
  step("knee-cementation", 5, "Implant insertion and cementation", "Mix cement on request, implant the definitive components, and seat the final insert.", {
    expectedInstruments: ["Cement mixing system", "Definitive femoral component", "Definitive tibial baseplate", "Final insert"],
    reminders: ["Open cement only when the surgeon calls", "Keep excess cement removal tools ready"],
    rationale: "The cement window is short, so the definitive build has to be staged in order before mixing starts.",
    relatedSectionIds: ["implants", "medications"],
  }),
  step("knee-closure", 6, "Final checks, washout, and closure", "Check tracking and range, complete washout, release or document tourniquet timing, then close and dress.", {
    expectedInstruments: ["Closure set", "Dressings", "Compression bandage if requested"],
    reminders: ["Document final sizes and tourniquet time", "Confirm mobilisation and thromboprophylaxis plan"],
    rationale: "The final step secures recovery information and ensures the operative record matches the implanted construct.",
    relatedSectionIds: ["closure", "dressings", "handover"],
  }),
]

export const referenceSuppliers: ReferenceSupplier[] = [
  { id: "SUP_STRYKER", name: "Stryker", aliases: ["Stryker UK"], status: "active" },
  { id: "SUP_DEPUY", name: "DePuy Synthes", aliases: ["ATTUNE", "DePuy"], status: "active" },
]

export const referenceSystems: ReferenceSystem[] = [
  {
    id: "SYS_EXETER_TRIDENT_HYBRID_THR",
    name: "Exeter V40 / Trident II Hybrid THR",
    supplier_id: "SUP_STRYKER",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_ids: ["SL_ARTHROPLASTY"],
    anatomy_ids: ["ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HIP"],
    system_type: "implant",
    category: "Hip arthroplasty",
    aliases: ["hybrid thr", "exeter trident", "stryker hybrid hip"],
    description:
      "Hybrid total hip construct with a cemented Exeter femoral stem and an uncemented Trident II acetabular shell.",
    status: "active",
  },
  {
    id: "SYS_TRIATHLON_KNEE",
    name: "Triathlon Knee System",
    supplier_id: "SUP_STRYKER",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_ids: ["SL_ARTHROPLASTY"],
    anatomy_ids: ["ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE"],
    system_type: "implant",
    category: "Knee arthroplasty",
    aliases: ["triathlon", "tkr triathlon", "stryker triathlon knee"],
    description:
      "Primary total knee arthroplasty system with femoral, tibial, insert, and optional patellar components.",
    status: "active",
  },
  {
    id: "SYS_ATTUNE_KNEE",
    name: "ATTUNE Knee System",
    supplier_id: "SUP_DEPUY",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_ids: ["SL_ARTHROPLASTY"],
    anatomy_ids: ["ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE"],
    system_type: "implant",
    category: "Knee arthroplasty",
    aliases: ["attune", "attune tkr", "depuy attune knee"],
    description:
      "Primary total knee arthroplasty system with femoral, tibial, insert, and patellar component options.",
    status: "active",
  },
]

export const referenceVariants: ReferenceVariant[] = [
  {
    id: "PV_HYBRID_THR_POSTERIOR",
    procedure_id: "PROC_PRIMARY_TOTAL_HIP_REPLACEMENT",
    setting: "operating_theatre",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_id: "SL_ARTHROPLASTY",
    anatomy_id: "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HIP",
    name: "Hybrid THR",
    variant_type: "approach",
    variant_value: "Posterior approach",
    approach: "Posterior",
    aliases: ["posterior thr", "hybrid total hip replacement"],
    description:
      "Posterior approach primary total hip replacement using a cemented stem with an uncemented acetabular component.",
    sort_order: 1,
    status: "active",
  },
  {
    id: "PV_TKR_TRIATHLON_MEDIAL_PARAPATELLAR",
    procedure_id: "PROC_PRIMARY_TOTAL_KNEE_REPLACEMENT",
    setting: "operating_theatre",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_id: "SL_ARTHROPLASTY",
    anatomy_id: "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE",
    name: "TKR (Triathlon)",
    variant_type: "approach",
    variant_value: "Medial parapatellar approach",
    approach: "Medial parapatellar",
    aliases: ["triathlon tkr", "primary tkr", "total knee replacement triathlon"],
    description:
      "Primary total knee replacement through a medial parapatellar exposure using the Triathlon system.",
    sort_order: 1,
    status: "active",
  },
  {
    id: "PV_CEMENTED_TKR_STANDARD",
    procedure_id: "PROC_CEMENTED_TOTAL_KNEE_REPLACEMENT",
    setting: "operating_theatre",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_id: "SL_ARTHROPLASTY",
    anatomy_id: "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE",
    name: "Cemented primary TKR",
    variant_type: "approach",
    variant_value: "Medial parapatellar approach",
    approach: "Medial parapatellar",
    aliases: ["cemented tkr", "cemented total knee replacement"],
    description:
      "Cemented primary total knee replacement through a medial parapatellar exposure.",
    sort_order: 1,
    status: "active",
  },
]

export const referenceProcedures: ReferenceProcedure[] = [
  {
    id: "PROC_PRIMARY_TOTAL_HIP_REPLACEMENT",
    familyId: "primary-total-hip-replacement",
    name: "Total Hip Replacement",
    setting: "Operating Theatre",
    specialty: "Trauma and Orthopaedics",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_id: "SL_ARTHROPLASTY",
    anatomy_id: "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HIP",
    subanatomy_group: "Whole Joint",
    aliases: ["thr", "tha", "hybrid thr", "total hip arthroplasty"],
    description:
      "Canonical arthroplasty reference card for primary hybrid total hip replacement.",
    implantSystem: "Exeter V40 / Trident II",
    sections: hipSections,
    workflowSteps: hipWorkflow,
    defaultVariantId: "PV_HYBRID_THR_POSTERIOR",
    defaultSystemId: "SYS_EXETER_TRIDENT_HYBRID_THR",
    status: "active",
    createdAt: "2026-03-27",
    updatedAt: "2026-03-27",
  },
  {
    id: "PROC_CEMENTED_TOTAL_KNEE_REPLACEMENT",
    familyId: "cemented-total-knee-replacement",
    name: "Cemented Total Knee Replacement",
    setting: "Operating Theatre",
    specialty: "Trauma and Orthopaedics",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_id: "SL_ARTHROPLASTY",
    anatomy_id: "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE",
    subanatomy_group: "Whole Joint",
    aliases: ["cemented tkr", "cemented tka", "triathlon tkr", "cemented total knee arthroplasty"],
    description:
      "Canonical arthroplasty reference card for cemented total knee replacement using the Triathlon system.",
    implantSystem: "Triathlon Knee System",
    sections: kneeSections,
    workflowSteps: kneeWorkflow,
    defaultVariantId: "PV_TKR_TRIATHLON_MEDIAL_PARAPATELLAR",
    defaultSystemId: "SYS_TRIATHLON_KNEE",
    status: "active",
    createdAt: "2026-03-27",
    updatedAt: "2026-03-31",
  },
  {
    id: "PROC_PRIMARY_TOTAL_KNEE_REPLACEMENT",
    familyId: "primary-total-knee-replacement",
    name: "Total Knee Replacement",
    setting: "Operating Theatre",
    specialty: "Trauma and Orthopaedics",
    specialty_id: "SPEC_TRAUMA_ORTHOPAEDICS",
    service_line_id: "SL_ARTHROPLASTY",
    anatomy_id: "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE",
    subanatomy_group: "Whole Joint",
    aliases: ["tkr", "tka", "triathlon tkr", "total knee arthroplasty"],
    description:
      "Canonical arthroplasty reference card for primary total knee replacement using the Triathlon system.",
    implantSystem: "Triathlon Knee System",
    sections: kneeSections,
    workflowSteps: kneeWorkflow,
    defaultVariantId: "PV_TKR_TRIATHLON_MEDIAL_PARAPATELLAR",
    defaultSystemId: "SYS_TRIATHLON_KNEE",
    status: "active",
    createdAt: "2026-03-27",
    updatedAt: "2026-03-27",
  },
]

export const referenceProcedureSystemCards: ReferenceProcedureSystemCard[] = [
  {
    id: "MAP_PV_HYBRID_THR_POSTERIOR_SYS_EXETER_TRIDENT_HYBRID_THR",
    procedure_variant_id: "PV_HYBRID_THR_POSTERIOR",
    system_id: "SYS_EXETER_TRIDENT_HYBRID_THR",
    is_default: true,
    status: "active",
    sections: hipSections,
    workflowSteps: hipWorkflow,
  },
  {
    id: "MAP_PV_TKR_TRIATHLON_MEDIAL_PARAPATELLAR_SYS_TRIATHLON_KNEE",
    procedure_variant_id: "PV_TKR_TRIATHLON_MEDIAL_PARAPATELLAR",
    system_id: "SYS_TRIATHLON_KNEE",
    is_default: true,
    status: "active",
    sections: kneeSections,
    workflowSteps: kneeWorkflow,
  },
  {
    id: "MAP_PV_CEMENTED_TKR_STANDARD_SYS_TRIATHLON_KNEE",
    procedure_variant_id: "PV_CEMENTED_TKR_STANDARD",
    system_id: "SYS_TRIATHLON_KNEE",
    is_default: true,
    status: "active",
    sections: kneeSections,
    workflowSteps: kneeWorkflow,
  },
  {
    id: "MAP_PV_CEMENTED_TKR_STANDARD_SYS_ATTUNE_KNEE",
    procedure_variant_id: "PV_CEMENTED_TKR_STANDARD",
    system_id: "SYS_ATTUNE_KNEE",
    is_default: false,
    status: "active",
    sections: attuneKneeSections,
    workflowSteps: kneeWorkflow,
  },
]
