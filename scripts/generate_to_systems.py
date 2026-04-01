"""
Generate comprehensive T&O systems + variant-system mappings.
Run from repo root: python scripts/generate_to_systems.py
"""
import json, os, uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load(path):
    full = os.path.join(ROOT, path)
    if not os.path.exists(full): return []
    with open(full, encoding="utf-8") as f: return json.load(f)

def save(path, data):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")

# ── Shorthand anatomy / service-line IDs ──────────────────────────────────
A = {
    "hip":       "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HIP",
    "knee":      "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_KNEE",
    "shoulder":  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_SHOULDER",
    "elbow":     "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_ELBOW",
    "ankle":     "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_ANKLE",
    "femur":     "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_FEMUR",
    "tibia":     "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_TIBIA",
    "fibula":    "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_FIBULA",
    "humerus":   "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HUMERUS",
    "wrist":     "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_WRIST",
    "hand":      "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HAND",
    "clavicle":  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_CLAVICLE",
    "foot":      "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_FOOT",
    "spine":     "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_SPINE",
    "pelvis":    "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_PELVIS",
    "acetabulum":"ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_ACETABULUM",
    "patella":   "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_PATELLA",
    "forearm":   "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_FOREARM",
    "hindfoot":  "ANAT_SPEC_TRAUMA_AND_ORTHOPAEDIC_SURGERY_HINDFOOT",
}
SL = {
    "arthroplasty":  "SL_ARTHROPLASTY",
    "trauma":        "SL_ORTHOPAEDIC_TRAUMA_SURGERY",
    "sports_knee":   "SL_SPORTS_AND_KNEE_SURGERY",
    "shoulder_elbow":"SL_SHOULDER_AND_ELBOW_SURGERY",
    "foot_ankle":    "SL_FOOT_AND_ANKLE_SURGERY",
    "hand_wrist":    "SL_HAND_AND_WRIST_SURGERY",
    "spine":         "SL_SPINE_SURGERY",
    "paeds":         "SL_PAEDIATRIC_ORTHOPAEDIC_SURGERY",
    "oncology":      "SL_ORTHOPAEDIC_ONCOLOGY",
}
SPEC = "SPEC_TRAUMA_ORTHOPAEDICS"
SUP = {
    "stryker":   "SUP_STRYKER",
    "depuy":     "SUP_DEPUY_SYNTHES",
    "zimmer":    "SUP_ZIMMER_BIOMET",
    "sn":        "SUP_SMITH_NEPHEW",
    "arthrex":   "SUP_ARTHREX",
    "exactech":  "SUP_EXACTECH",
    "integra":   "SUP_INTEGRA_LIFESCIENCES",
    "acumed":    "SUP_ACUMED",
    "corin":     "SUP_CORIN",
    "aesculap":  "SUP_AESCULAP",
    "medtronic": "SUP_MEDTRONIC",
    "globus":    "SUP_GLOBUS_MEDICAL",
    "nuvasive":  "SUP_NUVASIVE",
}

def sys_(id_, name, supplier, sl_keys, anat_keys, sys_type, category, description, aliases=None):
    return {
        "id": id_,
        "name": name,
        "supplier_id": SUP[supplier],
        "specialty_id": SPEC,
        "service_line_ids": [SL[k] for k in sl_keys],
        "anatomy_ids":      [A[k]  for k in anat_keys],
        "system_type": sys_type,
        "category": category,
        "aliases": aliases or [],
        "description": description,
        "status": "active",
    }

NEW_SYSTEMS = [
    # ── HIP ARTHROPLASTY ─────────────────────────────────────────────────────
    sys_("SYS_ACTIS_PINNACLE",       "ACTIS / Pinnacle",            "depuy",   ["arthroplasty"], ["hip"],
         "implant", "Hip Replacement — Cementless",
         "DePuy Synthes ACTIS tapered wedge stem paired with the Pinnacle acetabular cup system. Cementless primary total hip replacement."),
    sys_("SYS_ACCOLADE_TRIDENT",     "Accolade II / Trident II",    "stryker", ["arthroplasty"], ["hip"],
         "implant", "Hip Replacement — Cementless",
         "Stryker Accolade II tapered titanium stem with the Trident II acetabular shell. Fully cementless primary THR."),
    sys_("SYS_CSTEM_PINNACLE",       "C-stem AMT / Pinnacle",       "depuy",   ["arthroplasty"], ["hip"],
         "implant", "Hip Replacement — Cemented",
         "DePuy Synthes C-stem AMT polished triple-tapered cemented femoral stem with Pinnacle acetabular cup."),
    sys_("SYS_CPT_TRIDENT",          "CPT / Trident",               "zimmer",  ["arthroplasty"], ["hip"],
         "implant", "Hip Replacement — Hybrid",
         "Zimmer Biomet CPT cemented stem with Stryker Trident cementless acetabular shell. Common hybrid configuration."),
    sys_("SYS_CONTINUUM_TAPERLOC",   "Continuum / Taperloc",        "zimmer",  ["arthroplasty"], ["hip"],
         "implant", "Hip Replacement — Cementless",
         "Zimmer Biomet Continuum acetabular system with Taperloc stem. Trabecular metal cup technology."),
    sys_("SYS_BHR",                  "Birmingham Hip Resurfacing",  "sn",      ["arthroplasty"], ["hip"],
         "implant", "Hip Resurfacing",
         "Smith & Nephew Birmingham Hip Resurfacing (BHR). Metal-on-metal resurfacing arthroplasty for active patients with good bone stock."),
    sys_("SYS_CONSERVE_PLUS",        "Conserve Plus",               "stryker", ["arthroplasty"], ["hip"],
         "implant", "Hip Resurfacing",
         "Stryker Conserve Plus metal-on-metal hip resurfacing system."),
    sys_("SYS_EXETER_BIPOLAR",       "Exeter / Bipolar Head",       "stryker", ["arthroplasty"], ["hip"],
         "implant", "Hip Hemiarthroplasty — Cemented",
         "Stryker Exeter polished cemented stem with large bipolar head. Standard cemented hemiarthroplasty for femoral neck fractures."),
    sys_("SYS_CPT_BIPOLAR",          "CPT / Bipolar Head",          "zimmer",  ["arthroplasty"], ["hip"],
         "implant", "Hip Hemiarthroplasty — Cemented",
         "Zimmer Biomet CPT cemented stem with bipolar head. Alternative cemented hemiarthroplasty system."),
    sys_("SYS_CORAIL_BIPOLAR",       "Corail / Bipolar Head",       "depuy",   ["arthroplasty"], ["hip"],
         "implant", "Hip Hemiarthroplasty — Cementless",
         "DePuy Synthes Corail cementless stem with bipolar head for uncemented hemiarthroplasty."),
    sys_("SYS_EXETER_REVISION",      "Exeter Revision Stem",        "stryker", ["arthroplasty"], ["hip"],
         "implant", "Hip Revision — Cemented",
         "Stryker Exeter long-stem cemented revision femoral component. Used in femoral revision with cemented technique."),
    sys_("SYS_RESTORATION_MODULAR",  "Restoration Modular",         "stryker", ["arthroplasty"], ["hip"],
         "implant", "Hip Revision — Cementless Modular",
         "Stryker Restoration Modular revision system. Tapered-fluted modular titanium stem for complex femoral revisions with significant bone loss."),
    sys_("SYS_ARCOS_REVISION",       "ARCOS Modular",               "zimmer",  ["arthroplasty"], ["hip"],
         "implant", "Hip Revision — Cementless Modular",
         "Zimmer Biomet ARCOS modular femoral revision system. Conical fluted stem for poor proximal bone stock."),
    sys_("SYS_PINNACLE_SECTOR",      "Pinnacle / Sector Augments",  "depuy",   ["arthroplasty"], ["hip", "acetabulum"],
         "implant", "Hip Revision — Acetabular",
         "DePuy Synthes Pinnacle acetabular revision system with Sector augments for acetabular bone deficiency."),

    # ── KNEE ARTHROPLASTY ────────────────────────────────────────────────────
    sys_("SYS_PERSONA_KNEE",         "Persona Knee System",         "zimmer",  ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Replacement — Primary CR/PS",
         "Zimmer Biomet Persona total knee system. Cruciate-retaining and posterior-stabilised options with gender-specific sizing."),
    sys_("SYS_NEXGEN_KNEE",          "NexGen Knee System",          "zimmer",  ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Replacement — Primary CR/PS",
         "Zimmer Biomet NexGen Complete Knee Solution. Established primary TKR platform with extensive long-term data."),
    sys_("SYS_LEGION_KNEE",          "LEGION Total Knee System",    "sn",      ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Replacement — Primary CR/PS",
         "Smith & Nephew LEGION total knee system. Cruciate-retaining and posterior-stabilised options with VERILAST bearing technology."),
    sys_("SYS_OXFORD_UKR",           "Oxford Unicompartmental",     "zimmer",  ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Unicompartmental Knee Replacement",
         "Zimmer Biomet Oxford Phase 3 unicompartmental knee. Mobile-bearing medial or lateral UKR. Most implanted UKR globally."),
    sys_("SYS_JOURNEY_UNI",          "Journey Uni",                 "sn",      ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Unicompartmental Knee Replacement",
         "Smith & Nephew Journey Uni unicompartmental knee. Fixed-bearing medial UKR with kinematic design."),
    sys_("SYS_VANGUARD_M_UKR",       "Vanguard M / Microplasty",    "zimmer",  ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Unicompartmental Knee Replacement",
         "Zimmer Biomet Vanguard M knee system for fixed-bearing medial unicompartmental replacement."),
    sys_("SYS_JOURNEY_PFJ",          "Journey PFJ System",          "sn",      ["arthroplasty", "sports_knee"], ["knee", "patella"],
         "implant", "Patellofemoral Joint Replacement",
         "Smith & Nephew Journey PFJ patellofemoral joint replacement system."),
    sys_("SYS_TC3_REVISION_KNEE",    "TC3 Revision Knee System",    "depuy",   ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Revision — Constrained/Modular",
         "DePuy Synthes TC3 total condylar III revision knee system. Constrained condylar option for moderate to severe instability."),
    sys_("SYS_TRIATHLON_TS",         "Triathlon TS",                "stryker", ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Revision — Constrained/Modular",
         "Stryker Triathlon Total Stabiliser (TS) revision knee system. Rotating hinge option for severe bone loss and instability."),
    sys_("SYS_VANGUARD_360",         "Vanguard 360 Revision",       "zimmer",  ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Revision — Constrained/Modular",
         "Zimmer Biomet Vanguard 360 rotating hinge knee for complex revision with significant bone loss."),
    sys_("SYS_LEGION_REVISION",      "LEGION Revision Knee",        "sn",      ["arthroplasty", "sports_knee"], ["knee"],
         "implant", "Knee Revision — Constrained/Modular",
         "Smith & Nephew LEGION revision knee system with constrained condylar and rotating hinge options."),

    # ── SHOULDER ARTHROPLASTY ────────────────────────────────────────────────
    sys_("SYS_GLOBAL_ADVANTAGE",     "Global Advantage / Delta XTEND", "depuy", ["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Anatomic TSA",
         "DePuy Synthes Global Advantage stemmed anatomic total shoulder arthroplasty system."),
    sys_("SYS_DELTA_XTEND",          "Delta XTEND Reverse Shoulder","depuy",   ["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Reverse TSA",
         "DePuy Synthes Delta XTEND reverse shoulder system. One of the most widely used reverse TSA platforms globally."),
    sys_("SYS_ASCEND_FLEX",          "Ascend Flex",                 "stryker", ["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Anatomic & Reverse",
         "Stryker/Tornier Ascend Flex total shoulder system. Can be configured as anatomic or reverse TSA using same stem."),
    sys_("SYS_EQUINOXE",             "Equinoxe Shoulder System",    "exactech",["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Anatomic & Reverse",
         "Exactech Equinoxe shoulder platform. Convertible anatomic and reverse total shoulder arthroplasty."),
    sys_("SYS_COMPREHENSIVE_SHOULDER","Comprehensive Shoulder",     "zimmer",  ["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Anatomic & Reverse",
         "Zimmer Biomet Comprehensive shoulder system for anatomic and reverse total shoulder arthroplasty."),
    sys_("SYS_ECLIPSE_STEMLESS",     "Eclipse Stemless Shoulder",   "arthrex", ["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Stemless",
         "Arthrex Eclipse stemless shoulder arthroplasty. Press-fit metaphyseal fixation without a stem, preserving humeral bone."),
    sys_("SYS_SIDUS_STEMLESS",       "Sidus Stem-Free Shoulder",    "zimmer",  ["arthroplasty", "shoulder_elbow"], ["shoulder"],
         "implant", "Shoulder Replacement — Stemless",
         "Zimmer Biomet Sidus stem-free shoulder arthroplasty system."),
    sys_("SYS_GLOBAL_FX",            "Global FX Fracture System",   "depuy",   ["arthroplasty", "shoulder_elbow", "trauma"], ["shoulder", "humerus"],
         "implant", "Shoulder Hemiarthroplasty — Fracture",
         "DePuy Synthes Global FX fracture hemiarthroplasty system. Modular calcar collar for proximal humerus fracture reconstruction."),

    # ── ELBOW ARTHROPLASTY ───────────────────────────────────────────────────
    sys_("SYS_COONRAD_MORREY",       "Coonrad-Morrey Total Elbow",  "zimmer",  ["arthroplasty", "shoulder_elbow"], ["elbow"],
         "implant", "Total Elbow Replacement — Linked",
         "Zimmer Biomet Coonrad-Morrey total elbow replacement. Semi-constrained linked implant; most widely used total elbow system."),
    sys_("SYS_LATITUDE_ELBOW",       "Latitude EV Total Elbow",     "integra", ["arthroplasty", "shoulder_elbow"], ["elbow"],
         "implant", "Total Elbow Replacement — Unlinked",
         "Integra Latitude EV total elbow. Unlinked / convertible design allowing anatomic motion with option of linked stability."),

    # ── RADIAL HEAD ──────────────────────────────────────────────────────────
    sys_("SYS_RADIAL_HEAD_MODULAR",  "Acumed Modular Radial Head",  "acumed",  ["trauma", "shoulder_elbow"], ["elbow"],
         "implant", "Radial Head Replacement",
         "Acumed modular radial head arthroplasty system. Modular head and neck for accurate sizing."),
    sys_("SYS_KATALYST_RH",          "Katalyst Radial Head",        "stryker", ["trauma", "shoulder_elbow"], ["elbow"],
         "implant", "Radial Head Replacement",
         "Stryker Katalyst radial head arthroplasty system."),

    # ── ANKLE ARTHROPLASTY ───────────────────────────────────────────────────
    sys_("SYS_INFINITY_ANKLE",       "INFINITY Total Ankle",        "stryker", ["arthroplasty", "foot_ankle"], ["ankle"],
         "implant", "Total Ankle Replacement — Fixed Bearing",
         "Stryker INFINITY total ankle system (evolved from Wright INFINITY). Two-component fixed-bearing design."),
    sys_("SYS_STAR_ANKLE",           "STAR Total Ankle",            "stryker", ["arthroplasty", "foot_ankle"], ["ankle"],
         "implant", "Total Ankle Replacement — Mobile Bearing",
         "Scandinavian Total Ankle Replacement (STAR). Three-component mobile-bearing total ankle system."),
    sys_("SYS_ZENITH_ANKLE",         "Zenith Total Ankle",          "corin",   ["arthroplasty", "foot_ankle"], ["ankle"],
         "implant", "Total Ankle Replacement — Mobile Bearing",
         "Corin Zenith total ankle replacement. Three-component mobile-bearing design."),
    sys_("SYS_VANTAGE_ANKLE",        "Vantage Total Ankle",         "exactech",["arthroplasty", "foot_ankle"], ["ankle"],
         "implant", "Total Ankle Replacement — Fixed Bearing",
         "Exactech Vantage total ankle system. Two-component fixed-bearing design with improved sizing range."),
    sys_("SYS_SALTO_TALARIS",        "SALTO Talaris",               "stryker", ["arthroplasty", "foot_ankle"], ["ankle"],
         "implant", "Total Ankle Replacement — Fixed Bearing",
         "Tornier/Stryker SALTO Talaris anatomic total ankle prosthesis. Fixed-bearing two-component design."),

    # ── TRAUMA: PROXIMAL FEMUR / HIP FRACTURE ────────────────────────────────
    sys_("SYS_TFNA",                 "TFN-ADVANCED Nail System",    "depuy",   ["trauma"], ["hip", "femur"],
         "implant", "Cephalomedullary Nail — Proximal Femur",
         "DePuy Synthes TFN-ADVANCED Proximal Femoral Nailing System. Next-generation cephalomedullary nail with helical blade or lag screw options."),
    sys_("SYS_INTERTAN",             "InterTAN Nail System",        "sn",      ["trauma"], ["hip", "femur"],
         "implant", "Cephalomedullary Nail — Proximal Femur",
         "Smith & Nephew InterTAN cephalomedullary nail. Integrated tandem interlocking screws for rotational stability in pertrochanteric fractures."),
    sys_("SYS_DHS_SYSTEM",           "DHS — Dynamic Hip Screw",     "depuy",   ["trauma"], ["hip", "femur"],
         "implant", "Dynamic Hip Screw",
         "DePuy Synthes Dynamic Hip Screw (DHS) system. Extramedullary sliding hip screw for stable intertrochanteric fractures."),
    sys_("SYS_TRIGEN_META_NAIL",     "TRIGEN META-NAIL",            "sn",      ["trauma"], ["hip", "femur"],
         "implant", "Cephalomedullary Nail — Proximal Femur",
         "Smith & Nephew TRIGEN META-NAIL for proximal femoral and subtrochanteric fractures."),
    sys_("SYS_TARGON_PF",            "TARGON PF Nail",              "aesculap",["trauma"], ["hip", "femur"],
         "implant", "Cephalomedullary Nail — Proximal Femur",
         "Aesculap/B.Braun TARGON PF proximal femoral nail system."),

    # ── TRAUMA: FEMORAL SHAFT ─────────────────────────────────────────────────
    sys_("SYS_EXPERT_FEMORAL_NAIL",  "Expert Femoral Nail (EFN)",   "depuy",   ["trauma"], ["femur"],
         "implant", "Intramedullary Nail — Femoral Shaft",
         "DePuy Synthes Expert Femoral Nail (EFN). Antegrade and retrograde nailing for femoral shaft fractures."),
    sys_("SYS_T2_FEMORAL_NAIL",      "T2 Femoral Nail",             "stryker", ["trauma"], ["femur"],
         "implant", "Intramedullary Nail — Femoral Shaft",
         "Stryker T2 femoral nailing system. Antegrade and retrograde options for femoral shaft fractures."),
    sys_("SYS_TRIGEN_FEMORAL",       "TRIGEN Femoral Nail",         "sn",      ["trauma"], ["femur"],
         "implant", "Intramedullary Nail — Femoral Shaft",
         "Smith & Nephew TRIGEN antegrade/retrograde femoral nail for femoral shaft fractures."),

    # ── TRAUMA: DISTAL FEMUR ──────────────────────────────────────────────────
    sys_("SYS_LCP_DISTAL_FEMUR",     "LCP Distal Femoral Plate",    "depuy",   ["trauma"], ["femur", "knee"],
         "implant", "Locking Plate — Distal Femur",
         "DePuy Synthes LCP Distal Femoral Plate. Laterally placed locked plating for distal femur fractures."),
    sys_("SYS_NCB_DISTAL_FEMUR",     "NCB Distal Femoral Plate",    "zimmer",  ["trauma"], ["femur", "knee"],
         "implant", "Locking Plate — Distal Femur",
         "Zimmer Biomet Non-Contact Bridging (NCB) Distal Femur plating system. Variable-angle locking."),

    # ── TRAUMA: TIBIAL PLATEAU ────────────────────────────────────────────────
    sys_("SYS_LCP_TIBIAL_PLATEAU",   "LCP Tibial Plateau Plate",    "depuy",   ["trauma"], ["tibia", "knee"],
         "implant", "Locking Plate — Tibial Plateau",
         "DePuy Synthes LCP Tibial Plateau Plating System for lateral and medial tibial plateau fractures."),
    sys_("SYS_NCB_TIBIAL_PLATEAU",   "NCB Tibial Plateau Plate",    "zimmer",  ["trauma"], ["tibia", "knee"],
         "implant", "Locking Plate — Tibial Plateau",
         "Zimmer Biomet NCB Tibial Plateau plating system. Variable-angle locked plating."),

    # ── TRAUMA: TIBIAL SHAFT ──────────────────────────────────────────────────
    sys_("SYS_EXPERT_TIBIAL_NAIL",   "Expert Tibial Nail (ETN)",    "depuy",   ["trauma"], ["tibia"],
         "implant", "Intramedullary Nail — Tibial Shaft",
         "DePuy Synthes Expert Tibial Nail (ETN). Suprapatellar and infrapatellar insertion options for tibial shaft fractures."),
    sys_("SYS_T2_TIBIAL_NAIL",       "T2 Tibial Nail",              "stryker", ["trauma"], ["tibia"],
         "implant", "Intramedullary Nail — Tibial Shaft",
         "Stryker T2 tibial nailing system. Suprapatellar or infrapatellar approach for tibial shaft fractures."),

    # ── TRAUMA: DISTAL TIBIA / PILON ─────────────────────────────────────────
    sys_("SYS_LCP_DISTAL_TIBIA",     "LCP Distal Tibia Plate",      "depuy",   ["trauma"], ["tibia", "ankle"],
         "implant", "Locking Plate — Distal Tibia",
         "DePuy Synthes LCP Distal Tibia plate system for distal tibia and pilon fractures."),

    # ── TRAUMA: ANKLE ─────────────────────────────────────────────────────────
    sys_("SYS_LCP_FIBULA",           "LCP Fibula / Distal Fibula",  "depuy",   ["trauma"], ["fibula", "ankle"],
         "implant", "Locking Plate — Fibula",
         "DePuy Synthes LCP Distal Fibula Plate for lateral malleolus and distal fibula fracture fixation."),

    # ── TRAUMA: CALCANEUM ─────────────────────────────────────────────────────
    sys_("SYS_LCP_CALCANEUM",        "LCP Calcaneal Plate",         "depuy",   ["trauma"], ["hindfoot", "foot"],
         "implant", "Locking Plate — Calcaneum",
         "DePuy Synthes LCP Calcaneal Plate for displaced intra-articular calcaneal fractures."),
    sys_("SYS_PERI_LOC_CALCANEUM",   "PerilLoc Calcaneal Plate",    "zimmer",  ["trauma"], ["hindfoot", "foot"],
         "implant", "Locking Plate — Calcaneum",
         "Zimmer Biomet PerilLoc calcaneal plating system."),

    # ── TRAUMA: PROXIMAL HUMERUS ──────────────────────────────────────────────
    sys_("SYS_PHILOS_PLATE",         "PHILOS Proximal Humeral Plate","depuy",   ["trauma", "shoulder_elbow"], ["humerus", "shoulder"],
         "implant", "Locking Plate — Proximal Humerus",
         "DePuy Synthes PHILOS plate (Proximal Humerus Internal Locking System). Most widely used plate for proximal humerus fractures."),
    sys_("SYS_NCB_PROX_HUMERUS",     "NCB Proximal Humerus Plate",  "zimmer",  ["trauma", "shoulder_elbow"], ["humerus", "shoulder"],
         "implant", "Locking Plate — Proximal Humerus",
         "Zimmer Biomet NCB Proximal Humerus plating system with variable-angle locked screws."),
    sys_("SYS_MULTILOC_NAIL",        "MultiLoc Proximal Humeral Nail","depuy",  ["trauma", "shoulder_elbow"], ["humerus", "shoulder"],
         "implant", "Intramedullary Nail — Proximal Humerus",
         "DePuy Synthes MultiLoc proximal humeral nailing system. Intramedullary alternative to plate fixation for proximal humerus fractures."),

    # ── TRAUMA: HUMERAL SHAFT ─────────────────────────────────────────────────
    sys_("SYS_EXPERT_HUMERAL_NAIL",  "Expert Humeral Nail (EHN)",   "depuy",   ["trauma", "shoulder_elbow"], ["humerus"],
         "implant", "Intramedullary Nail — Humeral Shaft",
         "DePuy Synthes Expert Humeral Nail for antegrade/retrograde nailing of humeral shaft fractures."),
    sys_("SYS_T2_HUMERAL_NAIL",      "T2 Humeral Nail",             "stryker", ["trauma", "shoulder_elbow"], ["humerus"],
         "implant", "Intramedullary Nail — Humeral Shaft",
         "Stryker T2 humeral nailing system for humeral shaft fractures."),
    sys_("SYS_LCP_HUMERAL_SHAFT",    "LCP Humeral Shaft Plate",     "depuy",   ["trauma", "shoulder_elbow"], ["humerus"],
         "implant", "Locking Plate — Humeral Shaft",
         "DePuy Synthes LCP Humeral Shaft plate for open reduction and plate fixation of humeral shaft fractures."),

    # ── TRAUMA: DISTAL HUMERUS ────────────────────────────────────────────────
    sys_("SYS_LCP_DISTAL_HUMERUS",   "LCP Distal Humerus Plate",    "depuy",   ["trauma", "shoulder_elbow"], ["humerus", "elbow"],
         "implant", "Locking Plate — Distal Humerus",
         "DePuy Synthes LCP Distal Humerus parallel or perpendicular plating system for distal humerus fractures."),

    # ── TRAUMA: CLAVICLE ──────────────────────────────────────────────────────
    sys_("SYS_LCP_CLAVICLE",         "LCP Clavicle Plate",          "depuy",   ["trauma"], ["clavicle"],
         "implant", "Locking Plate — Clavicle",
         "DePuy Synthes LCP superior and anteroinferior clavicle plate system."),

    # ── TRAUMA: FOREARM ───────────────────────────────────────────────────────
    sys_("SYS_LCP_FOREARM",          "LCP Radius / Ulna Plates",    "depuy",   ["trauma", "hand_wrist"], ["forearm"],
         "implant", "Locking Plate — Forearm",
         "DePuy Synthes LCP radius and ulna plating system for both-bone forearm fractures."),

    # ── TRAUMA: DISTAL RADIUS ─────────────────────────────────────────────────
    sys_("SYS_LCP_DISTAL_RADIUS",    "LCP Distal Radius Plate",     "depuy",   ["trauma", "hand_wrist"], ["wrist"],
         "implant", "Volar Locking Plate — Distal Radius",
         "DePuy Synthes LCP Volar Distal Radius Plate. Standard volar locked plate for distal radius fractures."),
    sys_("SYS_VARIAX_DISTAL_RADIUS", "VariAx Distal Radius Plate",  "stryker", ["trauma", "hand_wrist"], ["wrist"],
         "implant", "Volar Locking Plate — Distal Radius",
         "Stryker VariAx volar locking plate system for distal radius fractures."),

    # ── SPORTS: ACL RECONSTRUCTION ────────────────────────────────────────────
    sys_("SYS_ENDOBUTTON_ACL",       "Endobutton CL",               "sn",      ["sports_knee"], ["knee", "femur", "tibia"],
         "implant", "ACL Fixation — Suspensory",
         "Smith & Nephew Endobutton CL cortical suspension fixation for ACL reconstruction. Used with hamstring and BTB grafts."),
    sys_("SYS_TIGHT_ROPE_ACL",       "TightRope ACL / AC System",   "arthrex", ["sports_knee", "shoulder_elbow"], ["knee", "clavicle"],
         "implant", "ACL & AC Fixation — Suspensory",
         "Arthrex TightRope cortical button fixation system. Used for ACL reconstruction (femoral fixation) and AC joint reconstruction."),
    sys_("SYS_RIGIDFIX",             "RigidFix Cross-Pin System",   "depuy",   ["sports_knee"], ["knee", "femur"],
         "implant", "ACL Fixation — Cross-Pin",
         "DePuy Mitek RigidFix cross-pin fixation system for hamstring graft ACL reconstruction. Transverse pin femoral fixation."),

    # ── SPORTS: ROTATOR CUFF / SHOULDER ───────────────────────────────────────
    sys_("SYS_SWIVELOCK",            "SwiveLock Anchor",            "arthrex", ["sports_knee", "shoulder_elbow"], ["shoulder", "knee"],
         "implant", "Suture Anchor — Knotless",
         "Arthrex SwiveLock knotless suture anchor. Used in rotator cuff repair, Bankart repair, and other soft tissue fixation."),
    sys_("SYS_HEALIX_ADVANCE",       "Healix Advance Anchor",       "depuy",   ["shoulder_elbow", "sports_knee"], ["shoulder", "knee"],
         "implant", "Suture Anchor",
         "DePuy Mitek Healix Advance PEEK suture anchor for rotator cuff repair, labral repair and soft tissue fixation."),
    sys_("SYS_Q_FIX",                "Q-FIX Suture Anchor",         "sn",      ["shoulder_elbow", "sports_knee"], ["shoulder", "knee"],
         "implant", "Suture Anchor — All-Suture",
         "Smith & Nephew Q-FIX all-suture anchor system for rotator cuff and soft tissue repair."),

    # ── SPORTS: MENISCAL ─────────────────────────────────────────────────────
    sys_("SYS_FASTFIX_MENISCAL",     "FastFix 360 Meniscal Repair", "sn",      ["sports_knee"], ["knee"],
         "implant", "Meniscal Repair — All-Inside",
         "Smith & Nephew FastFix 360 all-inside meniscal repair system with pre-tied sliding knots."),
    sys_("SYS_MENISCAL_CINCH",       "Meniscal Cinch Repair",       "arthrex", ["sports_knee"], ["knee"],
         "implant", "Meniscal Repair — All-Inside",
         "Arthrex Meniscal Cinch all-inside meniscal repair system. Knotless implant option."),

    # ── SPINE ─────────────────────────────────────────────────────────────────
    sys_("SYS_EXPEDIUM_SPINE",       "Expedium Spine System",       "depuy",   ["spine"], ["spine"],
         "implant", "Pedicle Screw-Rod — Spine",
         "DePuy Synthes Expedium posterior spinal fixation system. Pedicle screw and rod construct for thoracolumbar fusion."),
    sys_("SYS_CD_HORIZON",           "CD HORIZON LEGACY Spine",     "medtronic",["spine"], ["spine"],
         "implant", "Pedicle Screw-Rod — Spine",
         "Medtronic CD HORIZON LEGACY spinal system. Widely used pedicle screw-rod system for posterior spinal fusion."),
    sys_("SYS_SOLERA_SPINE",         "Solera Spine System",         "stryker", ["spine"], ["spine"],
         "implant", "Pedicle Screw-Rod — Spine",
         "Stryker Solera spinal fixation system for posterior thoracolumbar fusion."),
    sys_("SYS_SEQUOIA_SPINE",        "Sequoia Spine System",        "zimmer",  ["spine"], ["spine"],
         "implant", "Pedicle Screw-Rod — Spine",
         "Zimmer Biomet Sequoia spinal fixation system for posterior spinal instrumentation."),
    sys_("SYS_ARMADA_SPINE",         "Armada Spine System",         "nuvasive",["spine"], ["spine"],
         "implant", "Pedicle Screw-Rod — Spine",
         "NuVasive Armada spinal fixation system. Designed for MIS and open posterior spinal fusion."),
    sys_("SYS_STRYKER_KYPHOPLASTY",  "Stryker Kyphon Balloon",      "stryker", ["spine"], ["spine"],
         "implant", "Vertebral Augmentation",
         "Stryker Kyphon balloon kyphoplasty system for vertebral compression fractures."),

    # ── ONCOLOGY ─────────────────────────────────────────────────────────────
    sys_("SYS_GMRS_ENDOPROSTHETIC",  "GMRS Modular Endoprosthesis", "stryker", ["oncology"], ["femur", "tibia", "humerus"],
         "implant", "Endoprosthetic Reconstruction",
         "Stryker Global Modular Replacement System (GMRS). Modular oncology endoprosthesis for limb-salvage reconstruction after tumour resection."),
    sys_("SYS_MUTARS_ENDOPROSTHETIC","MUTARS Endoprosthesis",       "zimmer",  ["oncology"], ["femur", "tibia", "humerus"],
         "implant", "Endoprosthetic Reconstruction",
         "Zimmer Biomet Modular Universal Tumour And Revision System (MUTARS) for limb-salvage oncology surgery."),
]

# ── Variant → System mappings ─────────────────────────────────────────────
# Format: (variant_id, system_id, is_default)
# First system listed per variant is marked as default=False (user configures per hospital)
MAPPINGS_RAW = [
    # PRIMARY THR ─────────────────────────────────────────────────────────────
    *[(v, s, False) for v in ["PV_PRIMARY_THR_POSTERIOR","PV_PRIMARY_THR_LATERAL"]
      for s in ["SYS_CORAIL_PINNACLE","SYS_EXETER_TRIDENT","SYS_POLAR_R3","SYS_TAPERLOC_G7",
                "SYS_ACTIS_PINNACLE","SYS_ACCOLADE_TRIDENT","SYS_CSTEM_PINNACLE",
                "SYS_CPT_TRIDENT","SYS_CONTINUUM_TAPERLOC"]],
    *[(v, s, False) for v in ["PV_PRIMARY_THR_ANTERIOR"]
      for s in ["SYS_CORAIL_PINNACLE","SYS_POLAR_R3","SYS_TAPERLOC_G7",
                "SYS_ACTIS_PINNACLE","SYS_ACCOLADE_TRIDENT","SYS_CONTINUUM_TAPERLOC"]],

    # HIP RESURFACING
    *[(v, s, False) for v in ["PV_HIP_RESURFACING_POSTERIOR","PV_HIP_RESURFACING_LATERAL"]
      for s in ["SYS_BHR","SYS_CONSERVE_PLUS"]],

    # HIP HEMI
    *[("PV_HIP_HEMI_CEMENTED",   s, False) for s in ["SYS_EXETER_BIPOLAR","SYS_CPT_BIPOLAR"]],
    *[("PV_HIP_HEMI_UNCEMENTED", s, False) for s in ["SYS_CORAIL_BIPOLAR","SYS_ACCOLADE_TRIDENT"]],

    # REVISION THR
    *[(v, s, False) for v in ["PV_REVISION_THR_POSTERIOR","PV_REVISION_THR_ETO"]
      for s in ["SYS_EXETER_REVISION","SYS_RESTORATION_MODULAR","SYS_ARCOS_REVISION"]],
    *[(v, s, False) for v in ["PV_ACETABULAR_REVISION_ISOLATED_CUP","PV_ACETABULAR_REVISION_CUP_CAGE"]
      for s in ["SYS_PINNACLE_SECTOR","SYS_CONTINUUM_TAPERLOC"]],
    *[("PV_FEMORAL_REVISION_CEMENTED",       s, False) for s in ["SYS_EXETER_REVISION"]],
    *[("PV_FEMORAL_REVISION_TAPERED_FLUTED", s, False) for s in ["SYS_RESTORATION_MODULAR","SYS_ARCOS_REVISION"]],
    *[(v, s, False) for v in ["PV_TWO_STAGE_REVISION_THR_STAGE_ONE","PV_TWO_STAGE_REVISION_THR_STAGE_TWO"]
      for s in ["SYS_EXETER_REVISION","SYS_RESTORATION_MODULAR","SYS_ARCOS_REVISION"]],

    # PRIMARY TKR
    *[(v, s, False) for v in ["PV_PRIMARY_TKR_MEDIAL_PARAPATELLAR","PV_PRIMARY_TKR_SUBVASTUS","PV_PRIMARY_TKR_MIDVASTUS"]
      for s in ["SYS_ATTUNE_KNEE","SYS_TRIATHLON_KNEE","SYS_PERSONA_KNEE","SYS_NEXGEN_KNEE","SYS_LEGION_KNEE"]],

    # UKR
    *[("PV_UKR_MEDIAL_MOBILE", s, False) for s in ["SYS_OXFORD_UKR"]],
    *[("PV_UKR_MEDIAL_FIXED",  s, False) for s in ["SYS_JOURNEY_UNI","SYS_VANGUARD_M_UKR"]],
    *[("PV_UKR_LATERAL",       s, False) for s in ["SYS_OXFORD_UKR"]],

    # PFJ
    *[(v, s, False) for v in ["PV_PFJR_ISOLATED","PV_PFJR_WITH_REALIGNMENT"]
      for s in ["SYS_JOURNEY_PFJ"]],

    # REVISION TKR
    *[(v, s, False) for v in ["PV_REVISION_TKR_TWO_COMPONENT"]
      for s in ["SYS_TC3_REVISION_KNEE","SYS_TRIATHLON_TS","SYS_VANGUARD_360","SYS_LEGION_REVISION"]],
    *[(v, s, False) for v in ["PV_REVISION_TKR_CONSTRAINED_HINGE"]
      for s in ["SYS_TRIATHLON_TS","SYS_VANGUARD_360","SYS_LEGION_REVISION"]],

    # SHOULDER TSA
    *[("PV_PRIMARY_TSR_STEMMED", s, False) for s in ["SYS_GLOBAL_ADVANTAGE","SYS_ASCEND_FLEX","SYS_EQUINOXE","SYS_COMPREHENSIVE_SHOULDER"]],
    *[("PV_PRIMARY_TSR_STEMLESS",s, False) for s in ["SYS_ECLIPSE_STEMLESS","SYS_SIDUS_STEMLESS"]],

    # RTSA
    *[(v, s, False) for v in ["PV_RTSA_DELTOPECTORAL","PV_RTSA_SUPEROLATERAL"]
      for s in ["SYS_DELTA_XTEND","SYS_ASCEND_FLEX","SYS_EQUINOXE","SYS_COMPREHENSIVE_SHOULDER"]],

    # SHOULDER HEMI
    *[("PV_SHOULDER_HEMI_FRACTURE", s, False) for s in ["SYS_GLOBAL_FX","SYS_ASCEND_FLEX"]],
    *[("PV_SHOULDER_HEMI_ELECTIVE", s, False) for s in ["SYS_GLOBAL_ADVANTAGE","SYS_ASCEND_FLEX"]],

    # TOTAL ELBOW
    *[("PV_PRIMARY_TER_LINKED",   s, False) for s in ["SYS_COONRAD_MORREY"]],
    *[("PV_PRIMARY_TER_UNLINKED", s, False) for s in ["SYS_LATITUDE_ELBOW"]],

    # RADIAL HEAD
    *[(v, s, False) for v in ["PV_RADIAL_HEAD_REPLACEMENT_MONOPOLAR","PV_RADIAL_HEAD_REPLACEMENT_BIPOLAR"]
      for s in ["SYS_RADIAL_HEAD_MODULAR","SYS_KATALYST_RH"]],

    # TOTAL ANKLE
    *[("PV_PRIMARY_TAR_FIXED",  s, False) for s in ["SYS_INFINITY_ANKLE","SYS_VANTAGE_ANKLE","SYS_SALTO_TALARIS"]],
    *[("PV_PRIMARY_TAR_MOBILE", s, False) for s in ["SYS_STAR_ANKLE","SYS_ZENITH_ANKLE"]],

    # CEPHALOMEDULLARY NAILING (intertrochanteric & subtrochanteric)
    *[(v, s, False) for v in ["PV_CMN_SHORT","PV_CMN_LONG",
                               "PV_SUBTROCH_IM_NAIL_LONG_CMN"]
      for s in ["SYS_GAMMA_NAIL","SYS_PFNA","SYS_TFNA","SYS_INTERTAN","SYS_TRIGEN_META_NAIL"]],
    *[(v, s, False) for v in ["PV_SUBTROCH_IM_RECON"]
      for s in ["SYS_EXPERT_FEMORAL_NAIL","SYS_T2_FEMORAL_NAIL"]],

    # DHS
    *[("PV_DHS_STANDARD",  s, False) for s in ["SYS_DHS_SYSTEM"]],
    *[("PV_DHS_WITH_TSP",  s, False) for s in ["SYS_DHS_SYSTEM"]],

    # FEMORAL SHAFT NAILING
    *[(v, s, False) for v in ["PV_FEMORAL_SHAFT_IM_ANTEGRADE","PV_FEMORAL_SHAFT_IM_RETROGRADE"]
      for s in ["SYS_EXPERT_FEMORAL_NAIL","SYS_T2_FEMORAL_NAIL","SYS_TRIGEN_FEMORAL"]],

    # DISTAL FEMUR PLATING
    *[(v, s, False) for v in ["PV_DISTAL_FEMUR_ORIF_LATERAL_LOCKED","PV_DISTAL_FEMUR_ORIF_DUAL_PLATE"]
      for s in ["SYS_LCP_DISTAL_FEMUR","SYS_NCB_DISTAL_FEMUR"]],

    # TIBIAL PLATEAU PLATING
    *[(v, s, False) for v in ["PV_TIBIAL_PLATEAU_ORIF_LATERAL","PV_TIBIAL_PLATEAU_ORIF_BICONDYLAR"]
      for s in ["SYS_LCP_TIBIAL_PLATEAU","SYS_NCB_TIBIAL_PLATEAU"]],

    # TIBIAL SHAFT NAILING
    *[(v, s, False) for v in ["PV_TIBIAL_SHAFT_IM_SUPRAPATELLAR","PV_TIBIAL_SHAFT_IM_INFRAPATELLAR"]
      for s in ["SYS_EXPERT_TIBIAL_NAIL","SYS_T2_TIBIAL_NAIL"]],

    # DISTAL TIBIA / PILON
    *[(v, s, False) for v in ["PV_DISTAL_TIBIA_ORIF_MEDIAL","PV_DISTAL_TIBIA_ORIF_ANTEROLATERAL",
                               "PV_PILON_ORIF_STAGED","PV_PILON_ORIF_LIMITED_OPEN"]
      for s in ["SYS_LCP_DISTAL_TIBIA"]],

    # ANKLE FRACTURE FIXATION
    *[(v, s, False) for v in ["PV_ANKLE_ORIF_BIMALLEOLAR","PV_ANKLE_ORIF_WITH_SYNDESMOSIS"]
      for s in ["SYS_LCP_FIBULA"]],

    # CALCANEUM
    *[(v, s, False) for v in ["PV_CALCANEUS_ORIF_EXTENSILE","PV_CALCANEUS_ORIF_SINUS_TARSI"]
      for s in ["SYS_LCP_CALCANEUM","SYS_PERI_LOC_CALCANEUM"]],

    # CLAVICLE
    *[(v, s, False) for v in ["PV_CLAVICLE_ORIF_SUPERIOR","PV_CLAVICLE_ORIF_ANTEROINFERIOR"]
      for s in ["SYS_LCP_CLAVICLE"]],

    # PROXIMAL HUMERUS
    *[(v, s, False) for v in ["PV_PROX_HUMERUS_ORIF_DELTOPECTORAL","PV_PROX_HUMERUS_ORIF_DELTOID_SPLIT"]
      for s in ["SYS_PHILOS_PLATE","SYS_NCB_PROX_HUMERUS","SYS_MULTILOC_NAIL"]],

    # HUMERAL SHAFT
    *[(v, s, False) for v in ["PV_HUMERAL_SHAFT_ORIF_ANTEROLATERAL","PV_HUMERAL_SHAFT_ORIF_POSTERIOR"]
      for s in ["SYS_EXPERT_HUMERAL_NAIL","SYS_T2_HUMERAL_NAIL","SYS_LCP_HUMERAL_SHAFT"]],

    # DISTAL HUMERUS
    *[(v, s, False) for v in ["PV_DISTAL_HUMERUS_ORIF_OSTEOTOMY","PV_DISTAL_HUMERUS_ORIF_TRICEPS_SPARING"]
      for s in ["SYS_LCP_DISTAL_HUMERUS"]],

    # FOREARM
    *[(v, s, False) for v in ["PV_FOREARM_SHAFT_ORIF_VOLAR_HENRY","PV_FOREARM_SHAFT_ORIF_DORSAL_THOMPSON"]
      for s in ["SYS_LCP_FOREARM"]],

    # DISTAL RADIUS
    *[("PV_DISTAL_RADIUS_ORIF_VOLAR", s, False) for s in ["SYS_LCP_DISTAL_RADIUS","SYS_VARIAX_DISTAL_RADIUS"]],
    *[("PV_DISTAL_RADIUS_ORIF_DORSAL",s, False) for s in ["SYS_LCP_DISTAL_RADIUS"]],

    # ACL RECONSTRUCTION
    *[(v, s, False) for v in ["PV_ACL_HAMSTRING"]
      for s in ["SYS_ENDOBUTTON_ACL","SYS_TIGHT_ROPE_ACL","SYS_RIGIDFIX"]],
    *[(v, s, False) for v in ["PV_ACL_BTB","PV_ACL_QUADRICEPS"]
      for s in ["SYS_ENDOBUTTON_ACL","SYS_TIGHT_ROPE_ACL"]],

    # ROTATOR CUFF REPAIR
    *[(v, s, False) for v in ["PV_RCR_SINGLE_ROW","PV_RCR_DOUBLE_ROW","PV_RCR_SUTURE_BRIDGE"]
      for s in ["SYS_FIBERTAK","SYS_SWIVELOCK","SYS_HEALIX_ADVANCE","SYS_Q_FIX"]],

    # SHOULDER STABILISATION
    *[(v, s, False) for v in ["PV_SHOULDER_STAB_ARTHROSCOPIC_BANKART","PV_SHOULDER_STAB_OPEN_BANKART"]
      for s in ["SYS_FIBERTAK","SYS_SWIVELOCK","SYS_HEALIX_ADVANCE"]],

    # AC JOINT RECONSTRUCTION
    *[("PV_ACJ_RECON_SUSPENSORY", s, False) for s in ["SYS_TIGHT_ROPE_ACL"]],

    # MENISCAL REPAIR
    *[(v, s, False) for v in ["PV_MENISCAL_REPAIR_ALL_INSIDE","PV_MENISCAL_REPAIR_ROOT"]
      for s in ["SYS_FASTFIX_MENISCAL","SYS_MENISCAL_CINCH"]],

    # SPINE FUSION
    *[(v, s, False) for v in ["PV_LUMBAR_FUSION_POSTEROLATERAL","PV_LUMBAR_FUSION_TLIF","PV_LUMBAR_FUSION_ALIF",
                               "PV_ACDF_SINGLE","PV_ACDF_MULTI",
                               "PV_THORACOLUMBAR_FUSION_OPEN","PV_THORACOLUMBAR_FUSION_MIS",
                               "PV_SCOLIOSIS_POSTERIOR_ONLY","PV_SCOLIOSIS_COMBINED"]
      for s in ["SYS_EXPEDIUM_SPINE","SYS_CD_HORIZON","SYS_SOLERA_SPINE","SYS_SEQUOIA_SPINE","SYS_ARMADA_SPINE"]],

    # KYPHOPLASTY / VERTEBROPLASTY
    *[(v, s, False) for v in ["PV_KYPHOPLASTY_UNIPEDICULAR","PV_KYPHOPLASTY_BIPEDICULAR"]
      for s in ["SYS_STRYKER_KYPHOPLASTY"]],

    # ONCOLOGY
    *[(v, s, False) for v in ["PV_LIMB_SALVAGE_ENDOPROSTHETIC",
                               "PV_ENDOPROSTHETIC_STANDARD","PV_ENDOPROSTHETIC_EXPANDABLE"]
      for s in ["SYS_GMRS_ENDOPROSTHETIC","SYS_MUTARS_ENDOPROSTHETIC"]],
]

def main():
    # ── Load existing ──────────────────────────────────────────────────────
    existing_systems  = load("data/systems/systems.json")
    existing_vsmap    = load("data/systems/procedure_variant_system_map.json")

    # ── Merge systems ──────────────────────────────────────────────────────
    sys_map = {s["id"]: s for s in existing_systems}
    added_sys = 0
    for s in NEW_SYSTEMS:
        if s["id"] not in sys_map:
            sys_map[s["id"]] = s
            added_sys += 1
        else:
            sys_map[s["id"]] = s  # overwrite with updated info

    merged_systems = list(sys_map.values())

    # ── Merge variant-system map ──────────────────────────────────────────
    # Key by (variant_id, system_id) to avoid duplicates
    vsmap_keys = {(r["procedure_variant_id"], r["system_id"]) for r in existing_vsmap}
    new_mappings = []
    for (vid, sid, is_default) in MAPPINGS_RAW:
        key = (vid, sid)
        if key not in vsmap_keys:
            new_mappings.append({
                "id": f"VSM_{vid[3:]}_{sid[4:]}",
                "procedure_variant_id": vid,
                "system_id": sid,
                "is_default": is_default,
                "status": "active",
            })
            vsmap_keys.add(key)

    merged_vsmap = existing_vsmap + new_mappings

    # ── Write ──────────────────────────────────────────────────────────────
    save("data/systems/systems.json",                          merged_systems)
    save("data/systems/procedure_variant_system_map.json",     merged_vsmap)

    print(f"Systems:  {len(existing_systems)} existing + {added_sys} new = {len(merged_systems)} total")
    print(f"Mappings: {len(existing_vsmap)} existing + {len(new_mappings)} new = {len(merged_vsmap)} total")
    print("Done.")

if __name__ == "__main__":
    main()
