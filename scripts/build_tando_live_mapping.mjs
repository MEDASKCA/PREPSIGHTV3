import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/forda/orthopod";

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

function writeJson(relPath, value) {
  fs.writeFileSync(path.join(root, relPath), `${JSON.stringify(value, null, 2)}\n`);
}

const source = readJson("data/reference/trauma_and_orthopaedics/full_with_all_tier_suppliers.json");
const systems = readJson("data/systems/systems.json").filter((row) => row.status !== "inactive");
const suppliers = readJson("data/suppliers/suppliers.json").filter((row) => row.status !== "inactive");
const serviceLines = readJson("data/taxonomy/service_lines.json");
const anatomyNodes = readJson("data/taxonomy/anatomy.json");
const serviceLineAnatomyMap = readJson("data/taxonomy/service_line_anatomy_map.json");

const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
const supplierMasterByName = new Map(
  source.supplier_master_all_tiers.map((supplier) => [supplier.supplier_name, supplier]),
);
const anatomyById = new Map(anatomyNodes.map((node) => [node.id, node]));
const serviceLineByName = new Map(
  serviceLines
    .filter((row) => row.specialty_id === "SPEC_TRAUMA_ORTHOPAEDICS")
    .map((row) => [row.name, row]),
);

const traumaSystems = systems.filter(
  (system) =>
    system.specialty_id === "SPEC_TRAUMA_ORTHOPAEDICS" ||
    system.service_line_ids?.some((id) => id.startsWith("SL_")),
);

const DOMAIN_BY_SUBSPECIALTY = {
  Arthroplasty: ["arthroplasty"],
  "Revision Arthroplasty": ["revision_arthroplasty", "arthroplasty"],
  "Hip Preservation": ["hip_preservation", "sports_knee"],
  "Sports & Knee": ["sports_knee"],
  "Shoulder & Elbow": ["shoulder_elbow", "elbow", "extremities"],
  "Foot & Ankle": ["foot_ankle", "extremities"],
  "Hand & Wrist": ["hand_wrist", "extremities"],
  "Orthopaedic Trauma": ["trauma", "extremities", "foot_ankle"],
  "Orthopaedic Oncology": ["oncology", "limb_reconstruction"],
  "Paediatric Orthopaedics": ["paediatric_orthopaedics"],
  Spine: ["spine"],
  "Limb Reconstruction / Deformity": ["limb_reconstruction", "oncology"],
  "Orthopaedic Infection": ["revision_arthroplasty", "arthroplasty", "trauma"],
};

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function titleToId(value) {
  return value
    .toUpperCase()
    .replace(/&/g, "AND")
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function getAnatomyId(serviceLineId, anatomyName) {
  const mapped = serviceLineAnatomyMap.find((row) => {
    if (row.service_line_id !== serviceLineId) return false;
    const anatomy = anatomyById.get(row.anatomy_id);
    return anatomy?.name === anatomyName;
  });

  if (mapped) return mapped.anatomy_id;

  return (
    anatomyNodes.find(
      (row) =>
        row.specialty_id === "SPEC_TRAUMA_ORTHOPAEDICS" && row.name === anatomyName,
    )?.id ?? ""
  );
}

function inferProcedureClass({ subspecialty, anatomy, subanatomy, procedureName, variantName }) {
  const text = normalize(
    [subspecialty, anatomy, subanatomy, procedureName, variantName].filter(Boolean).join(" "),
  );

  if (/arthroscopy|scope|labral|anchor|instability|reconstruction|repair|tightrope|graft|menisc|decompression|bursectomy|acromioplasty|release/.test(text)) {
    return "sports_soft_tissue";
  }

  if (/latarjet|bankart|capsular shift|stabilisation|stabilization|mpfl|patellofemoral stabilisation/.test(text)) {
    return "sports_soft_tissue";
  }

  if (/developmental dysplasia|ddh|closed reduction|open reduction/.test(text) && !/fracture/.test(text)) {
    return "unknown";
  }

  if (/excision of bone tumou?r|intralesional curettage|wide resection/.test(text) && !/reconstruction|salvage|endoprosthetic/.test(text)) {
    return "unknown";
  }

  if (/fusion/.test(text) && /ankle|hindfoot|midfoot|forefoot|toe|mtp|pip|dip|wrist|finger|thumb/.test(text)) {
    return "ankle_fusion";
  }

  if (/hip/.test(text)) {
    if (/two[- ]stage|stage 1|stage 2|spacer|reimplant/.test(text)) return "two_stage_revision";
    if (/resurfacing/.test(text)) return "resurfacing";
    if (/hemi/.test(text)) return "hemiarthroplasty";
    if (/proximal femoral replacement/.test(text)) return "proximal_femoral_replacement";
    if (/acetabular|cup-cage|cup cage|reconstruction/.test(text)) return "acetabular_revision";
    if (/femoral revision|revision stem|femoral side/.test(text)) return "femoral_revision";
    if (/revision/.test(text)) return "revision_total_hip";
    return "primary_total_hip";
  }

  if (/knee/.test(text)) {
    if (/patellofemoral|pfj/.test(text)) return "patellofemoral";
    if (/uni|unicompartment|partial/.test(text)) return "unicompartmental_knee";
    if (/revision|hinge|constrained|ts /.test(text)) return "revision_total_knee";
    return "primary_total_knee";
  }

  if (/shoulder/.test(text)) {
    if (/reverse/.test(text)) return "reverse_shoulder";
    if (/stemless/.test(text)) return "stemless_shoulder";
    if (/hemi|proximal humerus/.test(text)) return "hemi_shoulder";
    return "anatomic_total_shoulder";
  }

  if (/elbow/.test(text)) {
    if (/radial head/.test(text)) return "radial_head";
    if (/hemi/.test(text)) return "hemi_elbow";
    return "total_elbow";
  }

  if (/ankle/.test(text)) {
    if (/fusion/.test(text)) return "ankle_fusion";
    return "total_ankle";
  }

  if (/spine|cervical|thoracic|lumbar|sacrum|vertebra/.test(text)) return "spine";
  if (/tumou?r|oncology|salvage|endoprosthetic/.test(text)) return "oncology";
  if (/fracture|orif|fixation|nail|plate|screw|external fix/.test(text)) return "trauma_fixation";
  if (/acl|pcl|menisc|mpfl|labral|instability|arthroscopy|anchor/.test(text)) return "sports_soft_tissue";
  if (/infection|debridement/.test(text)) return "infection";

  return "unknown";
}

function inferFixationClass({ procedureClass, procedureName, variantName }) {
  const text = normalize([procedureName, variantName].filter(Boolean).join(" "));

  if (/cemented/.test(text)) return "cemented";
  if (/cementless|uncemented/.test(text)) return "cementless";
  if (/hybrid/.test(text)) return "hybrid";
  if (/mobile/.test(text)) return "mobile_bearing";
  if (/fixed[- ]bearing|fixed bearing/.test(text)) return "fixed_bearing";
  if (/stemless/.test(text)) return "stemless";
  if (/stemmed/.test(text)) return "stemmed";
  if (/linked/.test(text)) return "linked";
  if (/unlinked/.test(text)) return "unlinked";
  if (/reverse/.test(text)) return "reverse";
  if (/hemi/.test(text) || procedureClass === "hemiarthroplasty") return "hemi";
  if (/resurfacing/.test(text) || procedureClass === "resurfacing") return "resurfacing";
  if (/tumou?r/.test(text) || procedureClass === "oncology") return "tumour";
  if (/salvage/.test(text)) return "salvage";
  if (/custom|psi|patient specific/.test(text)) return "custom";
  if (/revision/.test(text)) return "revision";
  return "unknown";
}

function buildKeywordSet({ subspecialty, anatomy, subanatomy, procedureName, variantName, procedureClass }) {
  const joined = normalize(
    [subspecialty, anatomy, subanatomy, procedureName, variantName, procedureClass]
      .filter(Boolean)
      .join(" "),
  );
  const keywords = new Set(
    joined
      .split(/[^a-z0-9+]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );

  const sourceText = joined;
  const add = (...values) => values.filter(Boolean).forEach((value) => keywords.add(value));

  if (/hip/.test(sourceText)) add("hip");
  if (/knee/.test(sourceText)) add("knee");
  if (/shoulder/.test(sourceText)) add("shoulder");
  if (/elbow/.test(sourceText)) add("elbow");
  if (/ankle/.test(sourceText)) add("ankle");
  if (/wrist|radius|ulna|carpal/.test(sourceText)) add("wrist", "radius", "ulna");
  if (/hand|digit|thumb|finger|mcp|pip|dip/.test(sourceText)) add("hand", "digit");
  if (/calcane|hindfoot/.test(sourceText)) add("calcaneus", "hindfoot");
  if (/forefoot|metatars|mtp|sesamoid/.test(sourceText)) add("forefoot", "metatarsal");
  if (/midfoot|lisfranc|navicular|cuboid|cuneiform/.test(sourceText)) add("midfoot", "lisfranc");
  if (/clavicle/.test(sourceText)) add("clavicle");
  if (/scapula|glenoid/.test(sourceText)) add("scapula", "glenoid");
  if (/femur|femoral/.test(sourceText)) add("femur", "femoral");
  if (/tibia|tibial|plafond/.test(sourceText)) add("tibia", "tibial");
  if (/fibula|fibular/.test(sourceText)) add("fibula", "fibular");
  if (/spine|cervical|thoracic|lumbar|sacrum/.test(sourceText)) add("spine", "cervical", "thoracic", "lumbar", "sacrum");
  if (/patella|patellar/.test(sourceText)) add("patella", "patellar");
  if (/menisc/.test(sourceText)) add("meniscus", "meniscal");
  if (/acl/.test(sourceText)) add("acl");
  if (/pcl/.test(sourceText)) add("pcl");
  if (/labrum|labral/.test(sourceText)) add("labrum", "labral");
  if (/rotator cuff/.test(sourceText)) add("rotator", "cuff");
  if (/arthroscopy|scope/.test(sourceText)) add("arthroscopy");
  if (/fracture|orif|fixation/.test(sourceText)) add("fracture", "orif", "fixation");
  if (/nail/.test(sourceText)) add("nail");
  if (/plate/.test(sourceText)) add("plate");
  if (/anchor/.test(sourceText)) add("anchor");
  if (/revision/.test(sourceText)) add("revision");
  if (/resurfacing/.test(sourceText)) add("resurfacing");
  if (/hemi/.test(sourceText)) add("hemi");
  if (/reverse/.test(sourceText)) add("reverse");
  if (/tumou?r|oncology/.test(sourceText)) add("tumour", "oncology", "endoprosthesis", "salvage");

  return keywords;
}

function scoreSystemMatch(system, context) {
  const keywordSet = context.keywordSet;
  const text = normalize([system.name, system.category, system.description, ...(system.aliases || [])].join(" "));
  let score = 0;

  const anatomyNames = (system.anatomy_ids || [])
    .map((id) => normalize(anatomyById.get(id)?.name))
    .filter(Boolean);
  const hasAnatomyName = (needle) => anatomyNames.some((name) => name.includes(needle));

  if (context.procedureClass.includes("hip")) {
    const hipLike =
      /hip|acetab|femoral|bipolar|resurfacing|trident|pinnacle|taperloc|exeter|corail|accolade|continuum|arcos|restoration/.test(text) ||
      hasAnatomyName("hip") ||
      hasAnatomyName("femur");
    if (!hipLike) return 0;
  }

  if (context.procedureClass.includes("knee") || context.procedureClass === "patellofemoral") {
    const kneeLike =
      /knee|patellofemoral|pfj|unicompartment|partial|persona|nexgen|legion|attune|triathlon|oxford|journey|vanguard/.test(text) ||
      hasAnatomyName("knee") ||
      hasAnatomyName("patella");
    if (!kneeLike) return 0;
  }

  if (context.procedureClass.includes("shoulder")) {
    const shoulderLike =
      /shoulder|glenoid|humeral|reverse|anatomic|stemless|equinoxe|delta|ascend|sidus|eclipse|comprehensive/.test(text) ||
      hasAnatomyName("shoulder") ||
      hasAnatomyName("humerus");
    if (!shoulderLike) return 0;
  }

  if (context.procedureClass.includes("elbow") || context.procedureClass === "radial_head") {
    const elbowLike =
      /elbow|radial head|coonrad|morrey|latitude|katalyst|humerus|ulna/.test(text) ||
      hasAnatomyName("elbow") ||
      hasAnatomyName("radius") ||
      hasAnatomyName("ulna");
    if (!elbowLike) return 0;
  }

  if (context.procedureClass.includes("ankle")) {
    const ankleLike =
      /ankle|talaris|infinity|star|zenith|vantage|salto|tibiotalar|talus|fibula/.test(text) ||
      hasAnatomyName("ankle") ||
      hasAnatomyName("foot") ||
      hasAnatomyName("hindfoot");
    if (!ankleLike) return 0;
  }

  if (context.procedureClass === "spine") {
    const spineLike =
      /spine|lumbar|thoracic|cervical|sacrum|sacroiliac|vertebr|kypho|pedicle/.test(text) ||
      hasAnatomyName("spine") ||
      hasAnatomyName("sacrum");
    if (!spineLike) return 0;
  }

  if (context.procedureClass === "sports_soft_tissue") {
    const softTissueLike =
      /anchor|tightrope|button|arthroscopy|repair|stabil|labral|menisc|graft|bankart|latarjet|swivelock|q-fix|fast-fix|endobutton|fibertak|fiberstitch/.test(text);
    if (!softTissueLike) return 0;
  }

  for (const keyword of keywordSet) {
    if (keyword.length < 3) continue;
    if (text.includes(keyword)) score += 2;
  }

  if (context.anatomyId && system.anatomy_ids?.includes(context.anatomyId)) score += 6;
  if (context.serviceLineId && system.service_line_ids?.includes(context.serviceLineId)) score += 5;

  if (context.procedureClass === "primary_total_hip" && /hip/.test(text) && !/revision|resurfacing|hemi|fracture/.test(text)) score += 6;
  if (context.procedureClass === "revision_total_hip" && /hip/.test(text) && /revision|modular|augment/.test(text)) score += 6;
  if (context.procedureClass === "acetabular_revision" && /acetab|augment|cup/.test(text)) score += 6;
  if (context.procedureClass === "femoral_revision" && /femoral|stem/.test(text) && /revision|modular/.test(text)) score += 6;
  if (context.procedureClass === "hemiarthroplasty" && /bipolar|hemi/.test(text)) score += 6;
  if (context.procedureClass === "resurfacing" && /resurfacing/.test(text)) score += 6;
  if (context.procedureClass === "primary_total_knee" && /knee/.test(text) && !/revision|uni|partial|pfj|patellofemoral/.test(text)) score += 6;
  if (context.procedureClass === "revision_total_knee" && /knee/.test(text) && /revision|ts|hinge|constrained/.test(text)) score += 6;
  if (context.procedureClass === "unicompartmental_knee" && /uni|partial/.test(text)) score += 6;
  if (context.procedureClass === "patellofemoral" && /pfj|patellofemoral/.test(text)) score += 6;
  if (context.procedureClass === "reverse_shoulder" && /reverse/.test(text)) score += 6;
  if (context.procedureClass === "anatomic_total_shoulder" && /shoulder/.test(text) && !/reverse|stemless|fracture/.test(text)) score += 6;
  if (context.procedureClass === "stemless_shoulder" && /stemless/.test(text)) score += 6;
  if (context.procedureClass === "hemi_shoulder" && /hemi|fracture|proximal humerus/.test(text)) score += 6;
  if (context.procedureClass === "total_elbow" && /total elbow|linked|unlinked/.test(text)) score += 6;
  if (context.procedureClass === "radial_head" && /radial head/.test(text)) score += 6;
  if (context.procedureClass === "total_ankle" && /ankle/.test(text) && !/plate|fibula|tibia/.test(text)) score += 6;
  if (context.procedureClass === "spine" && /spine|lumbar|cervical|thoracic|kypho|vertebro/.test(text)) score += 6;
  if (context.procedureClass === "trauma_fixation" && /fracture|plate|nail|fixation|external/.test(text)) score += 6;
  if (context.procedureClass === "sports_soft_tissue" && /anchor|tightrope|repair|arthroscopy|button|graft|menisc|labral|instability/.test(text)) score += 6;
  if (context.procedureClass === "oncology" && /oncology|tumou?r|gmrs|salvage|endoprosthesis/.test(text)) score += 6;

  if (context.procedureClass === "primary_total_hip" && /revision|resurfacing|hemi|bipolar|fracture|nail|plate/.test(text)) return 0;
  if (context.procedureClass === "revision_total_hip" && !/revision|modular|augment|reconstruction|proximal femoral/.test(text)) return 0;
  if (context.procedureClass === "acetabular_revision" && !/acetab|augment|cup|cage/.test(text)) return 0;
  if (context.procedureClass === "femoral_revision" && !/femoral|stem|modular/.test(text)) return 0;
  if (context.procedureClass === "hemiarthroplasty" && !/hemi|bipolar/.test(text)) return 0;
  if (context.procedureClass === "resurfacing" && !/resurfacing/.test(text)) return 0;
  if (context.procedureClass === "primary_total_knee" && /revision|uni|partial|pfj|patellofemoral/.test(text)) return 0;
  if (context.procedureClass === "revision_total_knee" && !/revision|hinge|constrained|ts/.test(text)) return 0;
  if (context.procedureClass === "unicompartmental_knee" && !/uni|partial/.test(text)) return 0;
  if (context.procedureClass === "patellofemoral" && !/pfj|patellofemoral/.test(text)) return 0;
  if (context.procedureClass === "anatomic_total_shoulder" && /reverse|stemless|anchor|plate|nail/.test(text)) return 0;
  if (context.procedureClass === "reverse_shoulder" && !/reverse/.test(text)) return 0;
  if (context.procedureClass === "stemless_shoulder" && !/stemless/.test(text)) return 0;
  if (context.procedureClass === "hemi_shoulder" && !/hemi|fracture|proximal humerus/.test(text)) return 0;
  if (context.procedureClass === "total_elbow" && /radial head|plate/.test(text)) return 0;
  if (context.procedureClass === "radial_head" && !/radial head/.test(text)) return 0;
  if (context.procedureClass === "total_ankle" && /plate|fibula|tibia fracture|fusion/.test(text)) return 0;
  if (context.procedureClass === "sports_soft_tissue" && /arthroplasty|replacement|revision|reverse|stemless|pfj/.test(text)) return 0;
  if (context.procedureClass === "unknown") return 0;

  return score;
}

function candidateSystemFromCatalog(system, context, confirmedIds) {
  const supplier = supplierById.get(system.supplier_id);
  const supplierMaster = supplier ? supplierMasterByName.get(supplier.name) : null;

  return {
    system_id: system.id,
    system_name: system.name,
    supplier_name: supplier?.name ?? system.supplier_id ?? "Unknown Supplier",
    supplier_tier: supplierMaster?.tier ?? "tier_unknown",
    fixation_class: inferFixationClass({
      procedureClass: context.procedureClass,
      procedureName: context.procedureName,
      variantName: context.variantName || system.category || system.name,
    }),
    procedure_class: context.procedureClass,
    mapping_status: confirmedIds.has(system.id) ? "confirmed" : "review_required",
    active_status: "active",
    notes: confirmedIds.has(system.id)
      ? "Mapped from existing live catalog."
      : "Catalog candidate added from anatomy/service-line match.",
    approach_compatibility: context.variantName ? [context.variantName] : [],
  };
}

function buildSyntheticSupplierCandidate(supplier, context) {
  return {
    system_id: `SYS_${titleToId(supplier.supplier_name)}_${titleToId(context.procedureClass)}_${titleToId(context.anatomy)}`,
    system_name: `${supplier.supplier_name} ${context.syntheticLabel}`,
    supplier_name: supplier.supplier_name,
    supplier_tier: supplier.tier,
    fixation_class: context.fixationClass,
    procedure_class: context.procedureClass,
    mapping_status: "review_required",
    active_status: supplier.status === "active" ? "active" : "legacy",
    notes: "Supplier-domain candidate added pending manual branch verification.",
    approach_compatibility: context.variantName ? [context.variantName] : [],
  };
}

function buildSyntheticLabel(context) {
  switch (context.procedureClass) {
    case "primary_total_hip":
      return "Hip Arthroplasty Portfolio";
    case "revision_total_hip":
      return "Revision Hip Arthroplasty Portfolio";
    case "acetabular_revision":
      return "Acetabular Revision Portfolio";
    case "femoral_revision":
      return "Femoral Revision Portfolio";
    case "hemiarthroplasty":
      return "Hip Hemiarthroplasty Portfolio";
    case "resurfacing":
      return "Hip Resurfacing Portfolio";
    case "primary_total_knee":
      return "Primary Knee Arthroplasty Portfolio";
    case "revision_total_knee":
      return "Revision Knee Arthroplasty Portfolio";
    case "unicompartmental_knee":
      return "Partial Knee Arthroplasty Portfolio";
    case "patellofemoral":
      return "Patellofemoral Arthroplasty Portfolio";
    case "reverse_shoulder":
      return "Reverse Shoulder Arthroplasty Portfolio";
    case "anatomic_total_shoulder":
      return "Shoulder Arthroplasty Portfolio";
    case "stemless_shoulder":
      return "Stemless Shoulder Arthroplasty Portfolio";
    case "hemi_shoulder":
      return "Shoulder Hemiarthroplasty Portfolio";
    case "total_elbow":
      return "Total Elbow Arthroplasty Portfolio";
    case "radial_head":
      return "Radial Head Arthroplasty Portfolio";
    case "total_ankle":
      return "Total Ankle Arthroplasty Portfolio";
    case "ankle_fusion":
      return "Fusion Fixation Portfolio";
    case "spine":
      return "Spine Instrumentation Portfolio";
    case "trauma_fixation":
      return "Trauma Fixation Portfolio";
    case "sports_soft_tissue":
      return "Sports Medicine Portfolio";
    case "oncology":
      return "Oncology Reconstruction Portfolio";
    default:
      return `${context.anatomy} Procedure Portfolio`;
  }
}

function getRelevantSuppliers(subspecialty) {
  const domains = DOMAIN_BY_SUBSPECIALTY[subspecialty] ?? [];
  return source.supplier_master_all_tiers.filter((supplier) =>
    supplier.domains?.some((domain) => domains.includes(domain)),
  );
}

function shouldGenerateSyntheticCandidates(context) {
  return new Set([
    "primary_total_hip",
    "revision_total_hip",
    "two_stage_revision",
    "acetabular_revision",
    "femoral_revision",
    "hemiarthroplasty",
    "resurfacing",
    "primary_total_knee",
    "revision_total_knee",
    "unicompartmental_knee",
    "patellofemoral",
    "anatomic_total_shoulder",
    "reverse_shoulder",
    "stemless_shoulder",
    "hemi_shoulder",
    "total_elbow",
    "radial_head",
    "total_ankle",
    "ankle_fusion",
    "spine",
    "trauma_fixation",
    "oncology",
  ]).has(context.procedureClass);
}

function getProcedureContexts(subspecialty, anatomy, anatomyId, serviceLineId, subanatomy, procedure, variant) {
  const procedureName = procedure.name;
  const variantName = variant?.name ?? "";
  const procedureClass = inferProcedureClass({
    subspecialty,
    anatomy,
    subanatomy,
    procedureName,
    variantName,
  });
  const fixationClass = inferFixationClass({
    procedureClass,
    procedureName,
    variantName,
  });
  const keywordSet = buildKeywordSet({
    subspecialty,
    anatomy,
    subanatomy,
    procedureName,
    variantName,
    procedureClass,
  });

  return {
    subspecialty,
    anatomy,
    anatomyId,
    serviceLineId,
    subanatomy,
    procedureName,
    variantName,
    procedureClass,
    fixationClass,
    keywordSet,
    syntheticLabel: "",
  };
}

const liveBranches = [];
const uncertainPlacements = [];

for (const subspecialty of source.clinical_product_ontology.subspecialties || []) {
  const serviceLineId = serviceLineByName.get(subspecialty.name)?.id ?? "";

  for (const anatomy of subspecialty.anatomy || []) {
    const anatomyId = getAnatomyId(serviceLineId, anatomy.name);
    const branch = {
      specialty: source.clinical_product_ontology.specialty ?? "Trauma and Orthopaedics",
      subspecialty: subspecialty.name,
      service_line_id: serviceLineId,
      anatomy: anatomy.name,
      anatomy_id: anatomyId,
      structure: "subspecialty -> anatomy -> subanatomy_group -> procedure -> variants -> systems",
      source_seed: "full_with_all_tier_suppliers.json",
      subanatomy_groups: [],
    };

    for (const subanatomy of anatomy.subanatomy_groups || []) {
      const subanatomyOutput = {
        name: subanatomy.name,
        procedures: [],
      };

      for (const procedure of subanatomy.procedures || []) {
        const procedureOutput = {
          procedure_id: procedure.id,
          procedure_name: procedure.name,
          variants: [],
        };

        for (const variant of procedure.variants || []) {
          const context = getProcedureContexts(
            subspecialty.name,
            anatomy.name,
            anatomyId,
            serviceLineId,
            subanatomy.name,
            procedure,
            variant,
          );
          context.syntheticLabel = buildSyntheticLabel(context);
          const confirmedIds = new Set((variant.systems || []).map((system) => system.id));

          const confirmedSystems = (variant.systems || []).map((system, index) => {
            const supplierName =
              system.supplier ||
              supplierById.get(system.supplier_id)?.name ||
              "Unknown Supplier";
            const supplierMaster = supplierMasterByName.get(supplierName);

            return {
              system_id: system.id,
              system_name: system.name,
              supplier_name: supplierName,
              supplier_tier: supplierMaster?.tier ?? "tier_unknown",
              fixation_class: inferFixationClass({
                procedureClass: context.procedureClass,
                procedureName: procedure.name,
                variantName: variant.name || system.category || system.name,
              }),
              procedure_class: context.procedureClass,
              mapping_status: index === 0 ? "confirmed" : "review_required",
              active_status: "active",
              notes: index === 0 ? "Mapped directly from current ontology." : "Mapped from current ontology; manual confirmation still advised.",
              approach_compatibility: [variant.name],
            };
          });

          const catalogMatches = traumaSystems
            .map((system) => ({ system, score: scoreSystemMatch(system, context) }))
            .filter((entry) => entry.score >= 10)
            .sort((a, b) => b.score - a.score)
            .slice(0, 18)
            .map((entry) => candidateSystemFromCatalog(entry.system, context, confirmedIds));

          const relevantSuppliers = getRelevantSuppliers(subspecialty.name);
          const representedSuppliers = new Set(
            [...confirmedSystems, ...catalogMatches].map((system) => normalize(system.supplier_name)),
          );

          const supplierCandidates = shouldGenerateSyntheticCandidates(context)
            ? relevantSuppliers
                .filter((supplier) => !representedSuppliers.has(normalize(supplier.supplier_name)))
                .map((supplier) => buildSyntheticSupplierCandidate(supplier, context))
                .slice(0, 18)
            : [];

          const mergedSystems = uniqueBy(
            [...confirmedSystems, ...catalogMatches, ...supplierCandidates],
            (system) => normalize(system.system_id || system.system_name),
          );

          if (supplierCandidates.length > 0) {
            uncertainPlacements.push({
              subspecialty: subspecialty.name,
              anatomy: anatomy.name,
              subanatomy_group: subanatomy.name,
              procedure_id: procedure.id,
              procedure_name: procedure.name,
              variant_id: variant.id,
              variant_name: variant.name,
              suggested_systems: supplierCandidates.map((system) => ({
                system_id: system.system_id,
                system_name: system.system_name,
                supplier_name: system.supplier_name,
                procedure_class: system.procedure_class,
                notes: system.notes,
              })),
            });
          }

          procedureOutput.variants.push({
            variant_id: variant.id,
            variant_name: variant.name,
            systems: mergedSystems,
          });
        }

        subanatomyOutput.procedures.push(procedureOutput);
      }

      branch.subanatomy_groups.push(subanatomyOutput);
    }

    liveBranches.push(branch);
  }
}

writeJson("data/systems/trauma_and_orthopaedics_full_live_mapping.json", liveBranches);
writeJson(
  "data/systems/trauma_and_orthopaedics_uncertain_system_placements.json",
  uncertainPlacements,
);

const summary = liveBranches.map((branch) => {
  let procedures = 0;
  let variants = 0;
  let systemsCount = 0;
  for (const sub of branch.subanatomy_groups) {
    for (const procedure of sub.procedures) {
      procedures += 1;
      for (const variant of procedure.variants) {
        variants += 1;
        systemsCount += variant.systems.length;
      }
    }
  }
  return {
    subspecialty: branch.subspecialty,
    anatomy: branch.anatomy,
    procedures,
    variants,
    systems: systemsCount,
  };
});

writeJson("data/systems/trauma_and_orthopaedics_live_mapping_summary.json", summary);

console.log(
  JSON.stringify(
    {
      branches: liveBranches.length,
      uncertainPlacements: uncertainPlacements.length,
      systems: summary.reduce((total, row) => total + row.systems, 0),
    },
    null,
    2,
  ),
);
