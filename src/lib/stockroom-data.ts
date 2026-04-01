// Shared stockroom seed data — imported by both the stockroom page and KardexSection

export type StockStatus = "OK" | "Low" | "Critical" | "Out"
export type IconKey = "bone" | "package" | "settings" | "zap" | "thermometer" | "layout" | "wrench"

export interface StockItemHistory {
  surgeon?: string   // last surgeon who used this item
  usedDate?: string  // date last used
  checkedBy?: string // last person who checked/updated stock
  checkedDate?: string
}

export interface StockItem {
  id: string
  name: string
  sku: string
  group?: string
  supplier?: string
  subcategory?: string
  category: string
  icon: IconKey
  qty: number
  par: number
  location: string
  history?: StockItemHistory
}

export function getStockStatus(qty: number, par: number): StockStatus {
  if (qty === 0)        return "Out"
  if (qty < par * 0.3)  return "Critical"
  if (qty < par)        return "Low"
  return "OK"
}

/**
 * Find all stockroom items whose group name matches any significant token from
 * the given system string (e.g. "Exeter / Trident" → matches "Exeter V40 Stem").
 * Tokens are split by /, space, comma, | and must be >2 chars to reduce noise.
 */
export function getStockForSystem(system: string): StockItem[] {
  if (!system.trim()) return []
  const tokens = system
    .toLowerCase()
    .split(/[\s/|,]+/)
    .filter((t) => t.length > 2)
  if (tokens.length === 0) return []
  return SEED_ITEMS.filter(
    (item) =>
      item.group &&
      tokens.some((token) => item.group!.toLowerCase().includes(token)),
  )
}

const IMPLANT_LOCATION = "Theatre Store A — Implant Rack"

export const SEED_ITEMS: StockItem[] = [
  // Triathlon CR Femoral Component
  { id: "tri-cr-1", name: "Size 1R", sku: "STR-TRI-CR-001", group: "Triathlon CR Femoral Component", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "8 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "tri-cr-2", name: "Size 2R", sku: "STR-TRI-CR-002", group: "Triathlon CR Femoral Component", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "8 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "tri-cr-3", name: "Size 3R", sku: "STR-TRI-CR-003", group: "Triathlon CR Femoral Component", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 0, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "5 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "tri-cr-4", name: "Size 4R", sku: "STR-TRI-CR-004", group: "Triathlon CR Femoral Component", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "5 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "tri-cr-5", name: "Size 5R", sku: "STR-TRI-CR-005", group: "Triathlon CR Femoral Component", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 1, par: 2, location: IMPLANT_LOCATION },

  // Triathlon Tibial Baseplate
  { id: "tri-tib-a", name: "Size A", sku: "STR-TRI-TIB-A", group: "Triathlon Tibial Baseplate", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 4, par: 3, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "8 Mar 2026", checkedBy: "L. Jones", checkedDate: "11 Mar 2026" } },
  { id: "tri-tib-b", name: "Size B", sku: "STR-TRI-TIB-B", group: "Triathlon Tibial Baseplate", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 3, par: 3, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "8 Mar 2026", checkedBy: "L. Jones", checkedDate: "11 Mar 2026" } },
  { id: "tri-tib-c", name: "Size C", sku: "STR-TRI-TIB-C", group: "Triathlon Tibial Baseplate", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 0, par: 3, location: IMPLANT_LOCATION },

  // Triathlon CR Poly Insert
  { id: "tri-ins-8",  name: "8mm",  sku: "STR-TRI-INS-008", group: "Triathlon CR Poly Insert", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 5, par: 4, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "5 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "tri-ins-10", name: "10mm", sku: "STR-TRI-INS-010", group: "Triathlon CR Poly Insert", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 2, par: 4, location: IMPLANT_LOCATION },
  { id: "tri-ins-12", name: "12mm", sku: "STR-TRI-INS-012", group: "Triathlon CR Poly Insert", supplier: "Stryker", subcategory: "Knee", category: "Implants", icon: "bone", qty: 0, par: 4, location: IMPLANT_LOCATION },

  // Exeter V40 Stem
  { id: "ext-1", name: "Size 1 / Offset 37.5", sku: "STR-EXT-V40-01", group: "Exeter V40 Stem", supplier: "Stryker", subcategory: "Hip", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr C. Okafor", usedDate: "12 Mar 2026", checkedBy: "M. Davies", checkedDate: "13 Mar 2026" } },
  { id: "ext-2", name: "Size 2 / Offset 37.5", sku: "STR-EXT-V40-02", group: "Exeter V40 Stem", supplier: "Stryker", subcategory: "Hip", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr C. Okafor", usedDate: "12 Mar 2026", checkedBy: "M. Davies", checkedDate: "13 Mar 2026" } },
  { id: "ext-3", name: "Size 3 / Offset 44",   sku: "STR-EXT-V40-03", group: "Exeter V40 Stem", supplier: "Stryker", subcategory: "Hip", category: "Implants", icon: "bone", qty: 1, par: 2, location: IMPLANT_LOCATION },

  // G7 Acetabular Shell
  { id: "g7-50", name: "50mm", sku: "ZB-G7-ACE-050", group: "G7 Acetabular Shell", supplier: "Zimmer Biomet", subcategory: "Hip", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr C. Okafor", usedDate: "12 Mar 2026", checkedBy: "M. Davies", checkedDate: "13 Mar 2026" } },
  { id: "g7-52", name: "52mm", sku: "ZB-G7-ACE-052", group: "G7 Acetabular Shell", supplier: "Zimmer Biomet", subcategory: "Hip", category: "Implants", icon: "bone", qty: 0, par: 2, location: IMPLANT_LOCATION },
  { id: "g7-54", name: "54mm", sku: "ZB-G7-ACE-054", group: "G7 Acetabular Shell", supplier: "Zimmer Biomet", subcategory: "Hip", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "1 Mar 2026", checkedBy: "M. Davies", checkedDate: "13 Mar 2026" } },

  // Corail Hip Stem (Cementless)
  { id: "cor-8",  name: "Size 8",  sku: "DS-COR-STD-008", group: "Corail Cementless Hip Stem", supplier: "DePuy Synthes", subcategory: "Hip", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "3 Mar 2026", checkedBy: "L. Jones", checkedDate: "11 Mar 2026" } },
  { id: "cor-9",  name: "Size 9",  sku: "DS-COR-STD-009", group: "Corail Cementless Hip Stem", supplier: "DePuy Synthes", subcategory: "Hip", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "3 Mar 2026", checkedBy: "L. Jones", checkedDate: "11 Mar 2026" } },
  { id: "cor-10", name: "Size 10", sku: "DS-COR-STD-010", group: "Corail Cementless Hip Stem", supplier: "DePuy Synthes", subcategory: "Hip", category: "Implants", icon: "bone", qty: 1, par: 2, location: IMPLANT_LOCATION },
  { id: "cor-11", name: "Size 11", sku: "DS-COR-STD-011", group: "Corail Cementless Hip Stem", supplier: "DePuy Synthes", subcategory: "Hip", category: "Implants", icon: "bone", qty: 0, par: 2, location: IMPLANT_LOCATION },
  { id: "cor-12", name: "Size 12", sku: "DS-COR-STD-012", group: "Corail Cementless Hip Stem", supplier: "DePuy Synthes", subcategory: "Hip", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION },
  { id: "cor-13", name: "Size 13", sku: "DS-COR-STD-013", group: "Corail Cementless Hip Stem", supplier: "DePuy Synthes", subcategory: "Hip", category: "Implants", icon: "bone", qty: 1, par: 2, location: IMPLANT_LOCATION },

  // Persona TKA Femoral Component
  { id: "per-fem-xs", name: "XS", sku: "ZB-PER-FEM-XS", group: "Persona TKA Femoral Component", supplier: "Zimmer Biomet", subcategory: "Knee", category: "Implants", icon: "bone", qty: 1, par: 2, location: IMPLANT_LOCATION },
  { id: "per-fem-s",  name: "S",  sku: "ZB-PER-FEM-S",  group: "Persona TKA Femoral Component", supplier: "Zimmer Biomet", subcategory: "Knee", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "6 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "per-fem-m",  name: "M",  sku: "ZB-PER-FEM-M",  group: "Persona TKA Femoral Component", supplier: "Zimmer Biomet", subcategory: "Knee", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr A. Rahman", usedDate: "6 Mar 2026", checkedBy: "S. Patel", checkedDate: "10 Mar 2026" } },
  { id: "per-fem-l",  name: "L",  sku: "ZB-PER-FEM-L",  group: "Persona TKA Femoral Component", supplier: "Zimmer Biomet", subcategory: "Knee", category: "Implants", icon: "bone", qty: 0, par: 2, location: IMPLANT_LOCATION },
  { id: "per-fem-xl", name: "XL", sku: "ZB-PER-FEM-XL", group: "Persona TKA Femoral Component", supplier: "Zimmer Biomet", subcategory: "Knee", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION },

  // Gamma3 Long Nail
  { id: "gm3-200", name: "200mm / 11mm", sku: "STR-GM3-LN-200", group: "Gamma3 Long Nail", supplier: "Stryker", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 2, par: 2, location: IMPLANT_LOCATION, history: { surgeon: "Mr C. Okafor", usedDate: "11 Mar 2026", checkedBy: "M. Davies", checkedDate: "13 Mar 2026" } },
  { id: "gm3-240", name: "240mm / 11mm", sku: "STR-GM3-LN-240", group: "Gamma3 Long Nail", supplier: "Stryker", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 1, par: 2, location: IMPLANT_LOCATION },
  { id: "gm3-300", name: "300mm / 11mm", sku: "STR-GM3-LN-300", group: "Gamma3 Long Nail", supplier: "Stryker", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 0, par: 2, location: IMPLANT_LOCATION },
  { id: "gm3-340", name: "340mm / 11mm", sku: "STR-GM3-LN-340", group: "Gamma3 Long Nail", supplier: "Stryker", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 3, par: 2, location: IMPLANT_LOCATION },

  // DHS Lag Screw
  { id: "dhs-80",  name: "80mm",  sku: "SYN-DHS-LAG-080", group: "DHS Lag Screw 135°", supplier: "Synthes", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 4, par: 3, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "10 Mar 2026", checkedBy: "L. Jones", checkedDate: "11 Mar 2026" } },
  { id: "dhs-90",  name: "90mm",  sku: "SYN-DHS-LAG-090", group: "DHS Lag Screw 135°", supplier: "Synthes", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 3, par: 3, location: IMPLANT_LOCATION, history: { surgeon: "Mr J. Wilson", usedDate: "10 Mar 2026", checkedBy: "L. Jones", checkedDate: "11 Mar 2026" } },
  { id: "dhs-100", name: "100mm", sku: "SYN-DHS-LAG-100", group: "DHS Lag Screw 135°", supplier: "Synthes", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 2, par: 3, location: IMPLANT_LOCATION },
  { id: "dhs-110", name: "110mm", sku: "SYN-DHS-LAG-110", group: "DHS Lag Screw 135°", supplier: "Synthes", subcategory: "Trauma", category: "Implants", icon: "bone", qty: 1, par: 3, location: IMPLANT_LOCATION },

  // Consumables
  { id: "drape-1",  name: "BARRIER Orthopaedic Drape Set", sku: "ML-BAR-ORTH-001",  category: "Consumables", icon: "package",     qty: 24, par: 20, location: "Consumables Room — Shelf C3" },
  { id: "suture-1", name: "VICRYL 0 Suture 70cm",          sku: "ET-VIC-0-W9984",   category: "Consumables", icon: "package",     qty: 48, par: 40, location: "Suture Cabinet" },
  { id: "suture-2", name: "PDS II 1 Suture 90cm",          sku: "ET-PDS-1-Z340E",   category: "Consumables", icon: "package",     qty: 6,  par: 20, location: "Suture Cabinet" },
  { id: "cement-1", name: "Simplex P Bone Cement 40g",     sku: "STR-SPX-P-40G",    category: "Consumables", icon: "package",     qty: 12, par: 10, location: "Cold Store — Bay 2" },
  { id: "lavage-1", name: "InterPulse Pulse Lavage",       sku: "STR-IPL-PLS-001",  category: "Consumables", icon: "package",     qty: 8,  par: 10, location: "Consumables Room — Shelf A1" },
  { id: "swab-1",   name: "Raytec Gauze Swabs 10×10 ×5",  sku: "SCR-RYT-1010-S5",  category: "Consumables", icon: "package",     qty: 60, par: 50, location: "Swab Store" },

  // Equipment
  { id: "equip-1", name: "SmartPump Tourniquet System",  sku: "STR-SMP-TORN-001", category: "Equipment", icon: "settings",    qty: 3, par: 2, location: "Equipment Bay 1" },
  { id: "equip-2", name: "VIO 3 Electrosurgery Unit",    sku: "ERB-VIO3-EU-001",  category: "Equipment", icon: "zap",         qty: 2, par: 2, location: "Equipment Bay 1" },
  { id: "equip-3", name: "Bair Hugger 775 Warming Unit", sku: "3M-BH775-WM",      category: "Equipment", icon: "thermometer", qty: 3, par: 3, location: "Equipment Bay 2" },
  { id: "equip-4", name: "System 7 Sagittal Saw",        sku: "STR-S7-SAG-001",   category: "Equipment", icon: "wrench",      qty: 4, par: 3, location: "Equipment Bay 2" },
  { id: "equip-5", name: "System 7 Drill",               sku: "STR-S7-DRL-001",   category: "Equipment", icon: "wrench",      qty: 4, par: 3, location: "Equipment Bay 2" },
]
