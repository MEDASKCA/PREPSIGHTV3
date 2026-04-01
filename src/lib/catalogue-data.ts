// ─────────────────────────────────────────────────────────────────────────────
// PrepSight Catalogue — Single Source of Truth
//
// DUPLICATE SAFEGUARD
//   SKU is the primary key. A runtime check at module load will throw if any
//   duplicate SKUs are found, catching the error during `next dev` or `next build`
//   before it ever reaches production.
//
// SPECIALTY TAGGING
//   specialty: ["T&O"]                  → Trauma & Orthopaedics only
//   specialty: ["All"]                  → Universal (appears in every specialty)
//   specialty: ["T&O", "General Surgery"] → Multi-specialty
//
// HOW TO ADD NEW PRODUCTS
//   1. Append to the CATALOGUE array below.
//   2. Use a unique SKU (manufacturer catalogue number preferred).
//   3. Assign the correct specialty[] tag.
//   4. `next dev` will throw on startup if you introduced a duplicate SKU.
// ─────────────────────────────────────────────────────────────────────────────

export type ProductCategory =
  | "Implants"
  | "Consumables"
  | "Equipment"
  | "Instruments"
  | "Sterilisation"

export type ProductStatus =
  | "In Stock"
  | "Low Stock"
  | "Out of Stock"
  | "Available"

export interface CatalogueProduct {
  /** Internal slug — generated from SKU, never shown in UI */
  id: string
  /** Product display name */
  name: string
  /**
   * PRIMARY KEY — manufacturer catalogue / SKU number.
   * Must be unique across the entire CATALOGUE array.
   * Module load will throw if duplicates are detected.
   */
  sku: string
  supplier: string
  category: ProductCategory
  subcategory: string
  /**
   * Specialty applicability.
   * Use ["All"] for universal consumables (gauze, gloves, sutures, etc.)
   * Use ["T&O"] for Trauma & Orthopaedics-specific items.
   * Use ["T&O", "General Surgery"] for multi-specialty items.
   */
  specialty: string[]
  /**
   * Whether the product is on NHS Supply Chain framework contract.
   * true  = framework / contracted price
   * false = off-contract / direct tender
   */
  nhsContract?: boolean
  description?: string
  unitOfIssue?: string
  /**
   * Storage location — placeholder until wired to Stockroom module.
   * e.g. "Theatre Store A", "Cold Store", "Consumables Room"
   */
  location?: string
  /**
   * Supplier contact number — placeholder until wired to Directory module.
   * Shown as tappable link in the detail drawer.
   */
  supplierPhone?: string
  /**
   * Where this record comes from in the library layer.
   * - seeded_product: hand-authored catalogue/product bank
   * - extracted_system: normalized fixed-data system/family entry
   * - extracted_component: normalized fixed-data component-family entry
   */
  sourceModel?: "seeded_product" | "extracted_system" | "extracted_component"
  entityKind?: "product" | "system" | "component"
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue data
// ─────────────────────────────────────────────────────────────────────────────

const RAW_CATALOGUE: Omit<CatalogueProduct, "id">[] = [

  // ── HIP IMPLANTS ──────────────────────────────────────────────────────────

  {
    name: "Exeter V40 Polished Tapered Stem",
    sku: "STR-EXT-V40-C",
    supplier: "Stryker",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    nhsContract: true,
    unitOfIssue: "ea",
    location: "Theatre Store A — Implant Rack 1",
    supplierPhone: "0800 783 4422",
    description: "Polished double-tapered cemented stem. Generates fluid film at cement–stem interface for controlled subsidence. Available in offset 37.5 and 44mm.",
  },
  {
    name: "Corail Cementless Hip Stem Standard",
    sku: "DS-COR-STD-001",
    supplier: "DePuy Synthes",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    location: "Theatre Store A — Implant Rack 1",
    supplierPhone: "0800 917 5511",
    description: "Hydroxyapatite-coated cementless primary stem. Fully coated for metaphyseal and diaphyseal fixation. 25+ year clinical follow-up.",
  },
  {
    name: "Corail Cementless Hip Stem KHO (High Offset)",
    sku: "DS-COR-KHO-001",
    supplier: "DePuy Synthes",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "High-offset variant of the Corail stem. Restores femoral offset in patients with wider pelvis or varus anatomy.",
  },
  {
    name: "Furlong Evolution Cementless Stem",
    sku: "JRI-FEV-STD-001",
    supplier: "JRI Orthopaedics",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Rectangular cross-section cementless stem with hydroxyapatite coating. Widely used in NHS due to excellent long-term registry data.",
  },
  {
    name: "G7 Acetabular Shell 52mm",
    sku: "ZB-G7-ACE-052",
    supplier: "Zimmer Biomet",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "52mm porous titanium acetabular shell for the G7 Hip System. Multilayer titanium plasma spray with HAp coating. Compatible with multiple liner options.",
  },
  {
    name: "G7 Acetabular Shell 56mm",
    sku: "ZB-G7-ACE-056",
    supplier: "Zimmer Biomet",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "56mm variant of the G7 acetabular shell. Recommended for patients with larger acetabular diameter.",
  },
  {
    name: "Pinnacle Acetabular Cup 54mm",
    sku: "DS-PIN-54-001",
    supplier: "DePuy Synthes",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "54mm Pinnacle porous titanium cup. Sector engineering for mechanical stability. Compatible with Marathon, Ultamet and ceramic liners.",
  },
  {
    name: "Trident II Hemispherical Shell 54mm",
    sku: "STR-TR2-054-001",
    supplier: "Stryker",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Next-generation Trident shell with Stiktite porous coating for enhanced primary fixation. Compatible with all Trident liners.",
  },
  {
    name: "Biolox Delta Ceramic Femoral Head 36mm +0",
    sku: "CER-BDL-36-P0",
    supplier: "CeramTec",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "36mm Biolox delta (alumina composite) ceramic head. +0 neck length. Hardest bearing surface available; scratch-resistant with low wear.",
  },
  {
    name: "Biolox Delta Ceramic Femoral Head 36mm +4",
    sku: "CER-BDL-36-P4",
    supplier: "CeramTec",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "36mm Biolox delta ceramic head. +4 neck length for leg length adjustment.",
  },
  {
    name: "Oxinium Femoral Head 36mm +0",
    sku: "SN-OXI-36-P0",
    supplier: "Smith+Nephew",
    category: "Implants", subcategory: "Hip",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Oxidised zirconium femoral head. Offers ceramic-like surface hardness on a metal substrate — ideal for patients at risk of ceramic fracture.",
  },

  // ── KNEE IMPLANTS ─────────────────────────────────────────────────────────

  {
    name: "Triathlon CR Femoral Component",
    sku: "STR-TRI-CR-FEM",
    supplier: "Stryker",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Cruciate-retaining femoral component for the Triathlon Total Knee System. Asymmetric condyles for improved roll-back. Available in sizes 1–8.",
  },
  {
    name: "Triathlon PS Femoral Component",
    sku: "STR-TRI-PS-FEM",
    supplier: "Stryker",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Posterior-stabilised femoral component. Deep intercondylar box for PS post engagement. Suitable when PCL is sacrificed.",
  },
  {
    name: "Triathlon Tibial Baseplate Standard",
    sku: "STR-TRI-TIB-STD",
    supplier: "Stryker",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Symmetric tibial tray for Triathlon system. Trabecular Metal optional. Four-peg fixation with central keel.",
  },
  {
    name: "Triathlon Poly Insert CR 8mm",
    sku: "STR-TRI-INS-CR8",
    supplier: "Stryker",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "8mm CR polyethylene insert. Highly cross-linked UHMWPE. Locking mechanism for tray compatibility.",
  },
  {
    name: "Triathlon Poly Insert CR 10mm",
    sku: "STR-TRI-INS-CR10",
    supplier: "Stryker",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "10mm CR polyethylene insert for Triathlon tibial tray.",
  },
  {
    name: "Persona TKA Femoral Component",
    sku: "ZB-PER-FEM-001",
    supplier: "Zimmer Biomet",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Persona Knee System femoral component. Personalised sagittal and coronal geometry across 10 sizes for improved native kinematics.",
  },
  {
    name: "Persona TKA Tibial Baseplate",
    sku: "ZB-PER-TIB-001",
    supplier: "Zimmer Biomet",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Asymmetric tibial baseplate with anatomically contoured perimeter for improved tibial coverage.",
  },
  {
    name: "Attune Knee Femoral CR",
    sku: "DS-ATT-CR-FEM",
    supplier: "DePuy Synthes",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "ATTUNE Knee CR femoral component. Gradually reducing radius of curvature for controlled, consistent roll-back and reduced loosening.",
  },
  {
    name: "Attune Tibial Baseplate Cementless",
    sku: "DS-ATT-TIB-CL",
    supplier: "DePuy Synthes",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Cementless tibial baseplate for ATTUNE system. Porous titanium coating with grit-blasted titanium underpinning.",
  },
  {
    name: "Oxford Phase 3 Medial Bearing",
    sku: "ZB-OXF-P3-MED",
    supplier: "Zimmer Biomet",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Mobile bearing for Oxford Unicompartmental Knee System. Medial compartment resurfacing. Ultra-high molecular weight polyethylene.",
  },
  {
    name: "Cemented Patella Button 29mm",
    sku: "STR-PAT-29-001",
    supplier: "Stryker",
    category: "Implants", subcategory: "Knee",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "29mm all-polyethylene patella button for cemented fixation. Dome design for multi-radius track compatibility.",
  },

  // ── SHOULDER IMPLANTS ─────────────────────────────────────────────────────

  {
    name: "Aequalis Pressfit Humeral Stem",
    sku: "STR-AEQ-PF-STM",
    supplier: "Stryker",
    category: "Implants", subcategory: "Shoulder",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Cementless humeral stem for anatomical total shoulder arthroplasty. Fin-anchored metaphyseal fixation with hydroxyapatite coating.",
  },
  {
    name: "Comprehensive Reverse Shoulder Humeral Component",
    sku: "ZB-CRS-HUM-001",
    supplier: "Zimmer Biomet",
    category: "Implants", subcategory: "Shoulder",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Humeral component for the Comprehensive Reverse Shoulder system. 135° neck-shaft angle. Compatible with standard and offset glenospheres.",
  },
  {
    name: "Global Icon Glenoid Component",
    sku: "DS-GI-GLEN-001",
    supplier: "DePuy Synthes",
    category: "Implants", subcategory: "Shoulder",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Pegged all-polyethylene glenoid for Global ICON total shoulder. Central compression peg for rotational stability.",
  },

  // ── TRAUMA IMPLANTS ───────────────────────────────────────────────────────

  {
    name: "Gamma3 Long Intramedullary Nail 11mm",
    sku: "STR-GM3-LN-11",
    supplier: "Stryker",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "11mm long Gamma3 nail for peritrochanteric and subtrochanteric femoral fractures. Titanium alloy. 6° proximal lateral bow.",
  },
  {
    name: "TFNA Proximal Femoral Nail 10mm",
    sku: "SYN-TFNA-10-001",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Trochanteric Fixation Nail Advanced. Single lag screw with anti-rotation blade. Suitable for AO/OTA 31-A1 to A3 fractures.",
  },
  {
    name: "DHS Dynamic Hip Screw Plate 135° 4-hole",
    sku: "SYN-DHS-135-4H",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "4-hole DHS barrel plate at 135°. Stainless steel. For stable intertrochanteric fractures. Paired with 135° lag screw.",
  },
  {
    name: "LCP Locking Compression Plate 4.5mm 8-hole",
    sku: "SYN-LCP-45-8H",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "8-hole LCP plate, 4.5mm screw diameter. Stainless steel. Combination holes accept locking and cortical screws.",
  },
  {
    name: "Cortical Screw 3.5mm × 24mm",
    sku: "SYN-CS-35-024",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Standard AO cortical screw. Full thread. 3.5mm diameter × 24mm length. Self-tapping stainless steel.",
  },
  {
    name: "Cortical Screw 3.5mm × 30mm",
    sku: "SYN-CS-35-030",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Standard AO cortical screw. Full thread. 3.5mm × 30mm. Self-tapping stainless steel.",
  },
  {
    name: "K-Wire 1.6mm × 150mm Trocar Tip",
    sku: "SYN-KW-16-150T",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "1.6mm diameter Kirschner wire with trocar tip. 150mm length. Stainless steel. Single use.",
  },
  {
    name: "TEN Titanium Elastic Nail 2.0mm",
    sku: "SYN-TEN-20-001",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "2.0mm titanium elastic nail for paediatric long bone fractures. Retrograde or antegrade insertion. Available 2.0–4.0mm diameter.",
  },

  // ── BONE CEMENT ───────────────────────────────────────────────────────────

  {
    name: "Simplex P Bone Cement 40g",
    sku: "STR-SPX-P-40G",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Bone Cement",
    specialty: ["T&O"],
    unitOfIssue: "kit",
    location: "Cold Store — Bay 2",
    supplierPhone: "0800 783 4422",
    description: "Low-viscosity PMMA bone cement for total joint fixation. 40g powder + 20ml liquid. Mixing time ~1 min. Working time ~4 min at 22°C.",
  },
  {
    name: "PALACOS R Bone Cement High Viscosity Kit",
    sku: "ZB-PAL-R-HV-KIT",
    supplier: "Zimmer Biomet",
    category: "Consumables", subcategory: "Bone Cement",
    specialty: ["T&O"],
    unitOfIssue: "kit",
    description: "High-viscosity gentamicin-loaded PMMA bone cement. Iconic green colour for surgical orientation. Ready to use from first mix.",
  },
  {
    name: "CMW 1 Bone Cement 40g",
    sku: "ZB-CMW1-40G",
    supplier: "Zimmer Biomet",
    category: "Consumables", subcategory: "Bone Cement",
    specialty: ["T&O"],
    unitOfIssue: "kit",
    description: "Medium-viscosity CMW 1 cement. Radiopaque. Extended working time for complex reconstructions.",
  },
  {
    name: "Cobalt HV Bone Cement",
    sku: "SN-COB-HV-KIT",
    supplier: "Smith+Nephew",
    category: "Consumables", subcategory: "Bone Cement",
    specialty: ["T&O"],
    unitOfIssue: "kit",
    description: "High-viscosity PMMA cement. No gentamicin. For use in patients with known aminoglycoside sensitivity.",
  },

  // ── CONSUMABLES — SUTURES (Universal) ────────────────────────────────────

  {
    name: "VICRYL 0 Suture 70cm Undyed",
    sku: "ET-VIC-0-W9984",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Sutures",
    specialty: ["All"],
    unitOfIssue: "box/36",
    description: "Polyglactin 910 braided absorbable suture. 0 gauge, 70cm, undyed. Blunt-taper CT-1 needle. Tensile strength retained ~3 weeks.",
  },
  {
    name: "VICRYL 1 Suture 90cm",
    sku: "ET-VIC-1-W9422",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Sutures",
    specialty: ["All"],
    unitOfIssue: "box/36",
    description: "Polyglactin 910 braided absorbable. 1 gauge, 90cm. CT needle. Commonly used for deep tissue closure.",
  },
  {
    name: "PDS II 1 Suture 90cm",
    sku: "ET-PDS-1-Z340E",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Sutures",
    specialty: ["All"],
    unitOfIssue: "box/36",
    description: "Polydioxanone monofilament absorbable. 1 gauge, 90cm. Retains 70% tensile strength at 2 weeks. Ideal for slow-healing fascial layers.",
  },
  {
    name: "MONOCRYL 3-0 Suture 45cm",
    sku: "ET-MON-30-Y493G",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Sutures",
    specialty: ["All"],
    unitOfIssue: "box/36",
    description: "Poliglecaprone 25 monofilament absorbable. 3-0, 45cm. PS-2 reverse-cutting needle. Commonly used for subcutaneous and skin closure.",
  },
  {
    name: "PROLENE 2-0 Suture 75cm",
    sku: "ET-PRO-20-8694G",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Sutures",
    specialty: ["All"],
    unitOfIssue: "box/36",
    description: "Polypropylene monofilament non-absorbable. 2-0, 75cm. BV-1 needle. Permanent. For vascular anastomosis and skin closure.",
  },
  {
    name: "NYLON 2-0 Skin Suture 45cm",
    sku: "ET-NYL-20-661G",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Sutures",
    specialty: ["All"],
    unitOfIssue: "box/36",
    description: "Polyamide monofilament non-absorbable. 2-0, cutting needle. For external skin closure.",
  },

  // ── CONSUMABLES — DRAPES & GOWNS (Universal) ──────────────────────────────

  {
    name: "BARRIER Orthopaedic Drape System",
    sku: "ML-BAR-ORTH-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Drapes",
    specialty: ["All"],
    unitOfIssue: "kit",
    location: "Consumables Room — Shelf C3",
    supplierPhone: "0800 085 4422",
    description: "Complete orthopaedic draping system. SMS material with fluid-repellent reinforced zones. Includes extremity drape, split sheet and table cover.",
  },
  {
    name: "Ioban 2 Antimicrobial Incise Drape 35×45cm",
    sku: "3M-IOB2-3545",
    supplier: "Solventum/3M",
    category: "Consumables", subcategory: "Drapes",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Iodophor-impregnated transparent incise drape. 35×45cm. Kills bacteria that migrate under the drape throughout the procedure.",
  },
  {
    name: "Ioban 2 Antimicrobial Incise Drape 60×45cm",
    sku: "3M-IOB2-6045",
    supplier: "Solventum/3M",
    category: "Consumables", subcategory: "Drapes",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Large format (60×45cm) iodophor incise drape. For wider operative fields.",
  },
  {
    name: "Surgical Gown Extra-Large Sterile",
    sku: "ML-SGW-XL-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Drapes",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "AAMI Level 3 surgical gown. XL. Knitted cuffs, reinforced front and sleeves. SMS material.",
  },

  // ── CONSUMABLES — GLOVES (Universal) ──────────────────────────────────────

  {
    name: "Biogel Surgeons Gloves Size 7.0",
    sku: "ML-BGS-70-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Gloves",
    specialty: ["All"],
    unitOfIssue: "box/50",
    description: "Biogel latex surgical gloves. Size 7.0. Powder-free, double-donned. Recognised sensitivity indicator coating.",
  },
  {
    name: "Biogel Surgeons Gloves Size 7.5",
    sku: "ML-BGS-75-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Gloves",
    specialty: ["All"],
    unitOfIssue: "box/50",
    description: "Biogel latex surgical gloves. Size 7.5. Powder-free.",
  },
  {
    name: "Biogel Surgeons Gloves Size 8.0",
    sku: "ML-BGS-80-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Gloves",
    specialty: ["All"],
    unitOfIssue: "box/50",
    description: "Biogel latex surgical gloves. Size 8.0. Powder-free.",
  },
  {
    name: "Gammex Latex-Free Synthetic Gloves 7.5",
    sku: "AH-GMX-LF-75",
    supplier: "Ansell Healthcare",
    category: "Consumables", subcategory: "Gloves",
    specialty: ["All"],
    unitOfIssue: "box/50",
    description: "Latex-free neoprene surgical gloves. Size 7.5. For latex-allergic surgeons and patients.",
  },

  // ── CONSUMABLES — SWABS & DRESSINGS (Universal) ───────────────────────────

  {
    name: "Gauze Swabs 10×10cm 8-ply Non-Sterile Pack 100",
    sku: "SCR-GSW-1010-100",
    supplier: "Synectics Medical",
    category: "Consumables", subcategory: "Swabs",
    specialty: ["All"],
    unitOfIssue: "pack/100",
    description: "Type 13 light absorbent gauze. 10×10cm, 8-ply. Non-sterile for theatre preparation use.",
  },
  {
    name: "Raytec Gauze Swabs 10×10cm Sterile ×5",
    sku: "SCR-RYT-1010-S5",
    supplier: "Synectics Medical",
    category: "Consumables", subcategory: "Swabs",
    specialty: ["All"],
    unitOfIssue: "pack/5",
    description: "X-ray detectable sterile gauze swabs. 10×10cm, 8-ply. Radio-opaque thread woven in. Individually banded packs of 5.",
  },
  {
    name: "Abdominal Swab 45×45cm X-ray Detectable",
    sku: "SCR-ABS-4545-XRD",
    supplier: "Synectics Medical",
    category: "Consumables", subcategory: "Swabs",
    specialty: ["All"],
    unitOfIssue: "pack/5",
    description: "Large lap sponge / abdominal swab. 45×45cm. Woven-in radio-opaque marker. Pack of 5 sterile.",
  },
  {
    name: "Mepilex Border Post-Op Dressing 10×10cm",
    sku: "ML-MPB-1010-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Dressings",
    specialty: ["All"],
    unitOfIssue: "box/10",
    description: "Silicone foam border dressing. Gentle on fragile skin. Waterproof film layer. Suitable for post-operative wounds.",
  },
  {
    name: "Aquacel Ag Surgical Cover Dressing",
    sku: "CN-AQA-SRG-001",
    supplier: "ConvaTec",
    category: "Consumables", subcategory: "Dressings",
    specialty: ["All"],
    unitOfIssue: "box/10",
    description: "Silver-containing hydrofibre wound cover dressing. Antimicrobial. Indicated for post-surgical wounds at risk of infection.",
  },

  // ── CONSUMABLES — IRRIGATION & CEMENT MIXING (T&O) ───────────────────────

  {
    name: "InterPulse Pulse Lavage Irrigation System",
    sku: "STR-IPL-PLS-001",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Irrigation",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Single-use pulse lavage system. Battery-powered. 0.9% NaCl bag irrigation with splash shield. Effective wound bed preparation before cementing.",
  },
  {
    name: "Bone Wax 2.5g",
    sku: "ET-BW-2G5-001",
    supplier: "Ethicon",
    category: "Consumables", subcategory: "Irrigation",
    specialty: ["T&O", "General Surgery", "Neurosurgery"],
    unitOfIssue: "ea",
    description: "Sterile refined beeswax for mechanical haemostasis of bone. 2.5g stick. Non-absorbable.",
  },
  {
    name: "PALACOS Vacuum Mixing System",
    sku: "ZB-PAL-VMS-001",
    supplier: "Zimmer Biomet",
    category: "Consumables", subcategory: "Bone Cement",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Closed vacuum mixing system for PALACOS bone cement. Reduces porosity and potential for monomer exposure.",
  },

  // ── CONSUMABLES — DIATHERMY (Universal) ───────────────────────────────────

  {
    name: "Diathermy Pencil Disposable with Holster",
    sku: "ERB-DPD-HOL-001",
    supplier: "Erbe",
    category: "Consumables", subcategory: "Diathermy",
    specialty: ["All"],
    unitOfIssue: "box/20",
    description: "Disposable monopolar diathermy pencil with integrated holster. Push-button cut and coag activation. Universal connector.",
  },
  {
    name: "Patient Return Electrode Adult",
    sku: "ERB-PRE-ADL-001",
    supplier: "Erbe",
    category: "Consumables", subcategory: "Diathermy",
    specialty: ["All"],
    unitOfIssue: "box/50",
    description: "Adult patient dispersive electrode (diathermy pad). Adhesive hydrogel. Single use. For monopolar electrosurgery return.",
  },
  {
    name: "Bipolar Forceps Disposable Standard",
    sku: "ERB-BPF-DSP-001",
    supplier: "Erbe",
    category: "Consumables", subcategory: "Diathermy",
    specialty: ["All"],
    unitOfIssue: "box/10",
    description: "Single-use bipolar forceps. Straight tips, 150mm overall length. Bayonet or standard handles available.",
  },

  // ── EQUIPMENT ─────────────────────────────────────────────────────────────

  {
    name: "SmartPump Tourniquet System",
    sku: "STR-SMP-TORN-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Tourniquet",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Automatic pneumatic tourniquet. Integrated limb occlusion pressure (LOP) measurement. Single and dual channel. Digital touchscreen.",
  },
  {
    name: "Tourniquet Cuff Adult Thigh 90cm",
    sku: "STR-TQC-THG-90",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Tourniquet",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Adult pneumatic tourniquet cuff for thigh application. 90cm circumference. Compatible with SmartPump and ATS systems.",
  },
  {
    name: "VIO 3 Electrosurgery Unit",
    sku: "ERB-VIO3-EU-001",
    supplier: "Erbe",
    category: "Equipment", subcategory: "Diathermy",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Advanced electrosurgery platform. Cut, coagulation, argon beam and bipolar modes. Touchscreen with procedure-specific presets.",
  },
  {
    name: "Bair Hugger 775 Patient Warming Unit",
    sku: "3M-BH775-WM",
    supplier: "Solventum/3M",
    category: "Equipment", subcategory: "Warming",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Forced-air patient warming system. Adjustable temperature 32–43°C. Compatible with full range of Bair Hugger blankets and gowns.",
  },
  {
    name: "Alphamaquet 1150 Carbon Fibre Operating Table",
    sku: "GET-ALP1150-OT",
    supplier: "Getinge",
    category: "Equipment", subcategory: "Tables",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Modular operating table with carbon-fibre radiolucent tabletop. Motorised positioning. 500kg load capacity. Full C-arm compatibility.",
  },
  {
    name: "Neptune S Fluid Waste Management System",
    sku: "STR-NEP-S-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Waste",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Closed-loop suction and fluid waste management. 16L canister. Hands-free docking disposal for staff safety.",
  },
  {
    name: "System 7 Sagittal Saw",
    sku: "STR-S7-SAG-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Power Tools",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Battery-powered sagittal saw for bone cutting in arthroplasty. System 7 platform. Brushless motor with auto-adaptive speed.",
  },
  {
    name: "System 7 Reciprocating Saw",
    sku: "STR-S7-REC-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Power Tools",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Battery-powered reciprocating saw. Oscillating blade motion for precision cuts. System 7 battery platform.",
  },
  {
    name: "System 7 Drill",
    sku: "STR-S7-DRL-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Power Tools",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Cordless surgical drill. Variable speed 0–1000 rpm. Quick-release chuck. System 7 battery platform.",
  },
  {
    name: "TPS Trauma Power System Drill/Reamer",
    sku: "SYN-TPS-DRL-001",
    supplier: "Synthes",
    category: "Equipment", subcategory: "Power Tools",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Synthes Trauma Power System cordless drill and reamer handpiece. AO quick-coupling. Variable speed.",
  },
  {
    name: "Stille Retractor Set Basic",
    sku: "JNJ-STL-RET-BSC",
    supplier: "J&J MedTech",
    category: "Instruments", subcategory: "Retractors",
    specialty: ["All"],
    unitOfIssue: "set",
    description: "Basic Stille retractor set. Includes self-retaining and handheld options for wound exposure. Stainless steel, autoclavable.",
  },

  // ── INSTRUMENTS — POSITIONING (T&O) ───────────────────────────────────────

  {
    name: "OSI ProAxis Lateral Positioning System",
    sku: "MIZ-PAX-LAT-001",
    supplier: "Mizuho OSI",
    category: "Instruments", subcategory: "Positioning",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Lateral decubitus positioning system for hip and spine. Radiolucent. Fully C-arm compatible. Perineal post and pelvic support.",
  },
  {
    name: "Alvarado Knee Holder",
    sku: "MIZ-ALV-KNE-001",
    supplier: "Mizuho OSI",
    category: "Instruments", subcategory: "Positioning",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Knee holder for total knee arthroplasty. Supports leg in flexion at 90° for tibial resection. Radiolucent construction.",
  },
  {
    name: "Traction Table Hip Attachment",
    sku: "GET-TRC-HIP-001",
    supplier: "Getinge",
    category: "Instruments", subcategory: "Positioning",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Hip traction attachment for Maquet/Alphamaquet tables. Used for dynamic hip screw and intramedullary nail insertion.",
  },

  // ── CONSUMABLES — POWER TOOL BLADES & BITS (T&O) ─────────────────────────

  {
    name: "System 7 Sagittal Saw Blade 57mm",
    sku: "STR-S7-BLD-SAG57",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Power Tool Consumables",
    specialty: ["T&O"],
    unitOfIssue: "box/5",
    location: "Theatre Store A — Shelf B1",
    supplierPhone: "0800 783 4422",
    description: "57mm wide oscillating blade for System 7 sagittal saw. Optimal geometry for tibial/femoral flat cuts in TKA. Pack of 5, single use.",
  },
  {
    name: "System 7 Sagittal Saw Blade 44mm",
    sku: "STR-S7-BLD-SAG44",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Power Tool Consumables",
    specialty: ["T&O"],
    unitOfIssue: "box/5",
    description: "44mm narrow oscillating blade for System 7. For anterior femoral chamfer and tibial slope cuts.",
  },
  {
    name: "System 7 Reciprocating Saw Blade",
    sku: "STR-S7-BLD-REC001",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Power Tool Consumables",
    specialty: ["T&O"],
    unitOfIssue: "box/5",
    description: "Standard reciprocating blade for System 7 reciprocating saw. For femoral resection and revision surgery.",
  },
  {
    name: "Surgical Drill Bit 3.2mm",
    sku: "SYN-DB-32-001",
    supplier: "Synthes",
    category: "Consumables", subcategory: "Power Tool Consumables",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "3.2mm self-tapping drill bit for AO quick-coupling systems. For 4.5mm cortical screw pilot holes. Stainless steel, single use.",
  },
  {
    name: "Surgical Drill Bit 2.5mm",
    sku: "SYN-DB-25-001",
    supplier: "Synthes",
    category: "Consumables", subcategory: "Power Tool Consumables",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "2.5mm drill bit for 3.5mm cortical screw pilot holes. AO quick-coupling. Single use.",
  },

  // ── CONSUMABLES — WOUND DRAINAGE (Universal) ──────────────────────────────

  {
    name: "Redivac Drain 400ml with Trocar 4.8mm",
    sku: "SN-RED-400-001",
    supplier: "Smith+Nephew",
    category: "Consumables", subcategory: "Wound Drainage",
    specialty: ["All"],
    unitOfIssue: "ea",
    location: "Consumables Room — Shelf B2",
    description: "Closed vacuum drainage system. 400ml reservoir. 4.8mm round channel drain with trocar insertion. Single use.",
  },
  {
    name: "Redivac Drain 600ml with Trocar 4.8mm",
    sku: "SN-RED-600-001",
    supplier: "Smith+Nephew",
    category: "Consumables", subcategory: "Wound Drainage",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Closed vacuum drainage. 600ml large-capacity reservoir. For high-output wounds (revision arthroplasty, complex spinal).",
  },
  {
    name: "Charioteer Wound Drainage System",
    sku: "ML-CHR-WDS-001",
    supplier: "Mölnlycke",
    category: "Consumables", subcategory: "Wound Drainage",
    specialty: ["All"],
    unitOfIssue: "ea",
    description: "Closed active wound drainage with SAFESTEP connector. Reduces risk of accidental disconnection. 400ml reservoir.",
  },

  // ── CONSUMABLES — ARTHROSCOPY (T&O) ───────────────────────────────────────

  {
    name: "Arthroscopic Cannula 6mm with Trocar",
    sku: "STR-ARC-CAN-6T",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    location: "Theatre Store B — Arthro Rack",
    supplierPhone: "0800 783 4422",
    description: "6mm plastic working cannula with sharp trocar. For instrument access in knee/shoulder arthroscopy. Single use.",
  },
  {
    name: "Arthroscopic Cannula 8mm with Trocar",
    sku: "STR-ARC-CAN-8T",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "8mm working cannula. For larger instruments such as suture passers and graspers.",
  },
  {
    name: "Spinal Needle 18G × 90mm",
    sku: "SYN-SPN-18-90",
    supplier: "Synthes",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O", "General Surgery"],
    unitOfIssue: "box/25",
    description: "18G × 90mm spinal needle for arthroscopic portal localisation. Provides outflow path and joint distension check before scope insertion.",
  },
  {
    name: "Arthroscopic Shaver Blade 4.5mm Synovator",
    sku: "STR-ARC-SHV-45S",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "4.5mm full-radius resector/synovator shaver blade. For synovium and soft tissue removal in knee/shoulder. Single use.",
  },
  {
    name: "Arthroscopic Shaver Blade 5.5mm Aggressive",
    sku: "STR-ARC-SHV-55A",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "5.5mm aggressive cutting shaver. For meniscal debridement and loose body removal.",
  },
  {
    name: "Arthroscopic Burr 4.0mm Round",
    sku: "STR-ARC-BUR-40R",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "4.0mm round cutting burr for subchondral bone preparation in OATS procedures and acromioplasty. Single use.",
  },
  {
    name: "Arthroscopic Pump Tubing Set",
    sku: "STR-ARC-PMP-TS",
    supplier: "Stryker",
    category: "Consumables", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Single-use fluid management tubing set for arthroscopic pump. 3L saline bags × 2. Includes inflow and outflow lines.",
  },

  // ── IMPLANTS — TRAUMA (additional) ────────────────────────────────────────

  {
    name: "TFNA Lag Screw 100mm",
    sku: "SYN-TFNA-LS-100",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    location: "Theatre Store A — Implant Rack 2",
    description: "100mm TFNA lag screw for trochanteric fixation nail advanced system. For compression at the fracture site.",
  },
  {
    name: "TFNA Lag Screw 110mm",
    sku: "SYN-TFNA-LS-110",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "110mm TFNA lag screw.",
  },
  {
    name: "TFNA Lag Screw 120mm",
    sku: "SYN-TFNA-LS-120",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "120mm TFNA lag screw.",
  },
  {
    name: "LCP Proximal Humerus Plate 3.5mm PHILOS",
    sku: "SYN-PHL-35-001",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "PHILOS proximal humeral locking plate. Angular stability in osteoporotic proximal humerus fractures. 5-hole.",
  },
  {
    name: "LCP Distal Radius Plate 2.4mm Volar",
    sku: "SYN-LCP-DR-VOL",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "2.4mm volar locking plate for distal radius fractures. Low-profile titanium. Multiple locking screw trajectories for subchondral support.",
  },
  {
    name: "Distal Femoral Nail 11mm × 240mm",
    sku: "STR-DFN-11-240",
    supplier: "Stryker",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Retrograde distal femoral nail. 11mm diameter × 240mm. Titanium alloy. For periprosthetic and supracondylar femoral fractures.",
  },
  {
    name: "Tibial Nail Expert 9mm × 300mm",
    sku: "SYN-TBN-9-300",
    supplier: "Synthes",
    category: "Implants", subcategory: "Trauma",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    description: "Expert tibial nail 9mm × 300mm. Curved design follows tibial anatomy. Multi-directional locking screws.",
  },

  // ── EQUIPMENT — ARTHROSCOPY STACK (T&O) ───────────────────────────────────

  {
    name: "1688 AIM 4K Camera System",
    sku: "STR-1688-4K-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    location: "Equipment Bay 3",
    supplierPhone: "0800 783 4422",
    description: "4K arthroscopy camera system. 1688 camera head + SDC3 capture. Auto white balance and fluorescence imaging capable.",
  },
  {
    name: "Arthroscopy Light Source 300W Xenon",
    sku: "STR-ARC-LGT-300",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    location: "Equipment Bay 3",
    description: "300W xenon light source. Consistent 5600K colour temperature. Automatic iris adjustment.",
  },
  {
    name: "IQ Arthroscopic Fluid Management System",
    sku: "STR-ARC-FMS-001",
    supplier: "Stryker",
    category: "Equipment", subcategory: "Arthroscopy",
    specialty: ["T&O"],
    unitOfIssue: "ea",
    location: "Equipment Bay 3",
    description: "Programmable arthroscopic pump. Pressure and flow control. Compatible with gravity and pressurised bags. Alarm for inflow/outflow imbalance.",
  },

  // ── STERILISATION — PACKAGING & INDICATORS ────────────────────────────────

  {
    name: "Sterilisation Wrap 120×120cm (CSR Wrap)",
    sku: "3M-CSR-120-001",
    supplier: "Solventum/3M",
    category: "Sterilisation", subcategory: "Packaging",
    specialty: ["All"],
    unitOfIssue: "pack/100",
    location: "CSSD — Packaging Store",
    description: "SMS non-woven sterilisation wrap. 120×120cm double thickness. Steam and EO compatible. Colour-change indicator woven in.",
  },
  {
    name: "Sterilisation Wrap 60×60cm (CSR Wrap)",
    sku: "3M-CSR-060-001",
    supplier: "Solventum/3M",
    category: "Sterilisation", subcategory: "Packaging",
    specialty: ["All"],
    unitOfIssue: "pack/200",
    description: "60×60cm SMS sterilisation wrap for instrument trays and smaller sets.",
  },
  {
    name: "Autoclave Chemical Indicator Strips Type 1",
    sku: "3M-ACI-T1-001",
    supplier: "Solventum/3M",
    category: "Sterilisation", subcategory: "Indicators",
    specialty: ["All"],
    unitOfIssue: "box/250",
    description: "Type 1 process indicator strips. Change colour when exposed to steam sterilisation cycle. External tray ID use.",
  },
  {
    name: "Bowie-Dick Test Pack (Daily)",
    sku: "3M-BWD-TST-001",
    supplier: "Solventum/3M",
    category: "Sterilisation", subcategory: "Indicators",
    specialty: ["All"],
    unitOfIssue: "box/20",
    description: "Daily air-removal test pack for prevacuum steam sterilisers. Conforms to EN 867-5. Each pack single use.",
  },
  {
    name: "Biological Indicator Attest 1292 Steam",
    sku: "3M-ATT-1292-001",
    supplier: "Solventum/3M",
    category: "Sterilisation", subcategory: "Indicators",
    specialty: ["All"],
    unitOfIssue: "box/50",
    description: "Rapid biological indicator for steam sterilisation. 1 hour read time. B. stearothermophilus spores. Self-contained ampoule.",
  },

]

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate SKU safeguard — runs at module load (dev + build time)
// ─────────────────────────────────────────────────────────────────────────────

function buildAndValidate(raw: Omit<CatalogueProduct, "id">[]): CatalogueProduct[] {
  const seen = new Map<string, number>()
  const duplicates: string[] = []

  raw.forEach((p, i) => {
    if (seen.has(p.sku)) {
      duplicates.push(`SKU "${p.sku}" at index ${i} duplicates index ${seen.get(p.sku)}`)
    } else {
      seen.set(p.sku, i)
    }
  })

  if (duplicates.length > 0) {
    throw new Error(
      `[catalogue-data] Duplicate SKUs detected — fix before continuing:\n  ${duplicates.join("\n  ")}`
    )
  }

  // NHS Supply Chain framework suppliers — contract status auto-assigned if not explicit
  const CONTRACT_SUPPLIERS = new Set([
    "Stryker", "DePuy Synthes", "Synthes", "Zimmer Biomet",
    "Ethicon", "Mölnlycke", "Solventum/3M", "Erbe", "Getinge",
    "ConvaTec", "Synectics Medical", "Ansell Healthcare",
  ])

  return raw.map((p) => ({
    ...p,
    nhsContract: p.nhsContract ?? CONTRACT_SUPPLIERS.has(p.supplier),
    id: p.sku.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    sourceModel: p.sourceModel ?? "seeded_product",
    entityKind: p.entityKind ?? "product",
  }))
}

export const CATALOGUE: CatalogueProduct[] = buildAndValidate(RAW_CATALOGUE)

// ─────────────────────────────────────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────────────────────────────────────

export function findBySku(sku: string): CatalogueProduct | undefined {
  return CATALOGUE.find(p => p.sku === sku)
}

export function filterBySpecialty(specialty: string): CatalogueProduct[] {
  return CATALOGUE.filter(p => p.specialty.includes(specialty) || p.specialty.includes("All"))
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter option lists (derived from data — never hardcoded separately)
// ─────────────────────────────────────────────────────────────────────────────

export const CATALOGUE_CATEGORIES: string[] = [
  "All Categories",
  ...Array.from(new Set(CATALOGUE.map(p => p.category))).sort(),
]

export const CATALOGUE_SUPPLIERS: string[] = [
  "All Suppliers",
  ...Array.from(new Set(CATALOGUE.map(p => p.supplier))).sort(),
]

export const CATALOGUE_SUBCATEGORIES: string[] = [
  "All",
  ...Array.from(new Set(CATALOGUE.map(p => p.subcategory))).sort(),
]

export const CATALOGUE_SPECIALTIES: string[] = [
  ...Array.from(new Set(CATALOGUE.flatMap(p => p.specialty))).filter(s => s !== "All").sort(),
  "All",
]
