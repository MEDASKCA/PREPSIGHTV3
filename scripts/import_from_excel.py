"""
Import surgical_master_ontology.xlsx -> JSON data files.

What it does:
  - Reads MASTER_ALL_SPECIALTIES sheet (3689 rows)
  - Extracts unique: service lines, anatomy, procedures, suppliers, systems, variants, variant-system mappings
  - Merges into existing JSON files (never overwrites existing records)
  - Normalises duplicate supplier IDs
  - Skips fake SUPP_* placeholder suppliers (marks supplier_id as null)
  - Writes taxonomy, per-specialty procedures/variants, and global systems/suppliers/mappings

Run: python scripts/import_from_excel.py
"""
import json, os, sys, openpyxl

XLSX = "C:/Users/forda/OneDrive/Desktop/surgical_master_ontology.xlsx"
BASE = "C:/Users/forda/orthopod/data"

# ── supplier ID normalisation map (Excel ID -> canonical ID in our DB) ──────
# Covers known duplicates in the Excel
SUP_NORM = {
    "SUP_DEPUY":           "SUP_DEPUY_SYNTHES",
    "SUP_ZIMMER":          "SUP_ZIMMER_BIOMET",
    "SUP_SMITHNEPHEW":     "SUP_SMITH_NEPHEW",
    "SUP_GLOBUS":          "SUP_GLOBUS_MEDICAL",
    "SUP_BOSTON":          "SUP_BOSTON_SCIENTIFIC",
    "SUP_PARAGON_28":      "SUP_PARAGON28",
    "SUP_ORTHOPEDS":       "SUP_ORTHOPEDIATRICS",
    "SUP_LED_A":           "SUP_LEDA",
    "SUP_BBRAUN_AESCULAP": "SUP_BBRAUN",
    "SUP_B_BRAUN":         "SUP_BBRAUN",
    "SUP_DRAEGER":         "SUP_DRAGER",
    "SUP_EDWARDS":         "SUP_EDWARDS_LIFESCIENCES",
    "SUP_INTEGRA":         "SUP_INTEGRA_LIFESCIENCES",
    "SUP_LUMENIS":         "SUP_MEDTRONIC",    # Lumenis laser - now Medtronic
    "SUP_ANGIODYNAMICS":   "SUP_ANGIODYNAMICS",
    "SUP_FUJIFILM_SONOSITE":"SUP_FUJI_FILM_MEDICAL",
    "SUP_TERUMO":          "SUP_TERUMO",
    "SUP_TORNIER":         "SUP_SMITH_NEPHEW",  # Tornier acquired by Wright/Smith+Nephew
    "SUP_STANMORE_STRYKER":"SUP_STRYKER",
    "SUP_LEMaitre":        "SUP_LEMaitre_VASCULAR",
}

# specialty_id mapping from Excel to our IDs
SPEC_NORM = {
    "SPEC_GYNECOLOGY":                   "SPEC_GYNECOLOGY",
    "SPEC_GYNAECOLOGY":                  "SPEC_GYNECOLOGY",
    "SPEC_ENT":                          "SPEC_ENT",
    "SPEC_OTOLARYNGOLOGY":               "SPEC_ENT",
    "SPEC_ORAL_AND_MAXILLOFACIAL":       "SPEC_OMFS",
    "SPEC_OMFS":                         "SPEC_OMFS",
    "SPEC_PLASTIC_RECONSTRUCTIVE":       "SPEC_PLASTIC_RECONSTRUCTIVE_SURGERY",
    "SPEC_PLASTIC_AND_RECONSTRUCTIVE":   "SPEC_PLASTIC_RECONSTRUCTIVE_SURGERY",
}

# Map specialty_id -> folder name
SPEC_TO_FOLDER = {
    "SPEC_ANAESTHESIA":                  "anaesthesia",
    "SPEC_CARDIOTHORACIC_SURGERY":       "cardiothoracic",
    "SPEC_DENTAL_AND_ORAL":              "dental_and_oral",
    "SPEC_GENERAL_SURGERY":              "general_surgery",
    "SPEC_GYNECOLOGY":                   "gynaecology",
    "SPEC_NEUROSURGERY":                 "neurosurgery",
    "SPEC_OBSTETRICS":                   "obstetrics",
    "SPEC_OPHTHALMOLOGY":                "opthalmology",
    "SPEC_OMFS":                         "oral_and_maxillofacial",
    "SPEC_ENT":                          "otolaryngology",
    "SPEC_PAEDIATRIC_SURGERY":           "paediatric",
    "SPEC_PLASTIC_RECONSTRUCTIVE_SURGERY":"plastic_and_reconstructive",
    "SPEC_PODIATRIC_SURGERY":            "podiatric",
    "SPEC_TRAUMA_ORTHOPAEDICS":          "trauma_and_orthopaedics",
    "SPEC_UROLOGY":                      "urology",
    "SPEC_VASCULAR_SURGERY":             "vascular",
    "SPEC_DENTAL_ORAL_SURGERY":          "dental_and_oral",
}

def load(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def save(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def merge_by_id(existing, new_items, key="id"):
    idx = {x[key]: x for x in existing}
    added = 0
    for item in new_items:
        k = item[key]
        if k and k not in idx:
            idx[k] = item
            added += 1
    return list(idx.values()), added

def append_unique(existing, new_items, key_fn):
    seen = {key_fn(x) for x in existing}
    added = 0
    for item in new_items:
        key = key_fn(item)
        if key in seen:
            continue
        existing.append(item)
        seen.add(key)
        added += 1
    return existing, added

def normalise_sup(sid):
    if not sid:
        return None
    if sid.startswith("SUPP_"):      # placeholder suppliers
        return None
    return SUP_NORM.get(sid, sid)

def normalise_spec(sid):
    return SPEC_NORM.get(sid, sid)

# ── read Excel ────────────────────────────────────────────────────────────────
print("Reading Excel...")
wb = openpyxl.load_workbook(XLSX)
ws = wb["MASTER_ALL_SPECIALTIES"]
headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
H = {h: i for i, h in enumerate(headers)}
rows = list(ws.iter_rows(min_row=2, values_only=True))
print(f"  {len(rows)} rows read")

# ── collect entities ──────────────────────────────────────────────────────────
suppliers_new = {}          # id -> {id, name, aliases, status}
systems_new = {}            # id -> {id, name, ...}
service_lines_new = {}      # id -> {id, name, specialty_id}
anatomy_new = {}            # id -> {id, name, specialty_id, parent_id, sort_order, tags}
procedures_by_spec = {}     # spec_id -> {procedure_id -> procedure_obj}
variants_by_spec = {}       # spec_id -> {variant_id -> variant_obj}
mappings_new = {}           # (variant_id, system_id) -> mapping_obj
service_line_anatomy_pairs = {}  # (service_line_id, anatomy_id) -> mapping_obj

skipped_variants = 0

for r in rows:
    get = lambda col: r[H[col]] if col in H else None

    spec_id_raw  = get("specialty_id") or ""
    spec_id      = normalise_spec(spec_id_raw)
    if not spec_id:
        continue

    # ── supplier ──
    sup_id_raw   = get("supplier_id")
    sup_id       = normalise_sup(sup_id_raw)
    sup_name     = get("supplier_name") or ""
    sup_aliases  = get("supplier_aliases") or ""
    if sup_id and sup_id not in suppliers_new:
        suppliers_new[sup_id] = {
            "id": sup_id,
            "name": sup_name,
            "aliases": sup_aliases,
            "status": "active"
        }

    # ── system ──
    sys_id   = get("system_id")
    sys_name = get("system_name")
    sys_type = get("system_type") or ""
    sys_cat  = get("system_category") or ""
    sys_desc = get("system_description") or ""
    sys_stat = get("system_status") or "active"
    if sys_id and sys_id not in systems_new:
        systems_new[sys_id] = {
            "id": sys_id,
            "name": sys_name,
            "supplier_id": sup_id,
            "system_type": sys_type,
            "category": sys_cat,
            "description": sys_desc,
            "status": sys_stat if sys_stat in ("active","inactive") else "active",
        }

    # ── variant ──
    var_id      = get("variant_id")
    var_name    = get("variant_name")
    var_type    = get("variant_type") or "technique"
    var_value   = get("variant_value") or ""
    var_desc    = get("variant_description") or ""
    var_sort    = get("variant_sort_order")
    var_stat    = get("variant_status") or "active"
    proc_id     = get("procedure_id")
    sl_id       = get("service_line_id")
    anat_id     = get("anatomy_id")
    setting     = get("setting") or "operating_theatre"

    if not var_id or not proc_id:
        skipped_variants += 1
        continue

    # Skip generic "Standard Technique" placeholders (data_quality_status == completed_with_inference
    # AND variant_type == technique_profile) — these are filler rows
    dq = get("data_quality_status") or ""
    if var_type == "technique_profile" and dq == "completed_with_inference":
        skipped_variants += 1
        continue

    try:
        sort = int(var_sort) if var_sort is not None else 10
    except (TypeError, ValueError):
        sort = 10

    variant_obj = {
        "id": var_id,
        "procedure_id": proc_id,
        "setting": setting if setting else "operating_theatre",
        "specialty_id": spec_id,
        "service_line_id": sl_id or "",
        "anatomy_id": anat_id or "",
        "name": var_name or var_id,
        "variant_type": var_type,
        "variant_value": var_value,
        "description": var_desc,
        "sort_order": sort,
        "status": var_stat if var_stat in ("active","inactive") else "active",
    }

    if spec_id not in variants_by_spec:
        variants_by_spec[spec_id] = {}
    variants_by_spec[spec_id][var_id] = variant_obj

    # ── mapping ──
    if var_id and sys_id:
        is_def_raw = get("mapping_is_default")
        is_def = str(is_def_raw).lower() == "true" if is_def_raw is not None else False
        role   = get("mapping_role") or "primary"
        usage  = get("mapping_usage_type") or "required"
        key = (var_id, sys_id)
        if key not in mappings_new:
            mappings_new[key] = {
                "procedure_variant_id": var_id,
                "system_id": sys_id,
                "is_default": is_def,
                "role": role,
                "usage_type": usage,
            }

print(f"  Skipped {skipped_variants} rows (no variant_id or placeholder)")
print(f"  Collected: {len(suppliers_new)} suppliers, {len(systems_new)} systems, "
      f"{sum(len(v) for v in variants_by_spec.values())} variants, {len(mappings_new)} mappings")
print(f"  Specialties with variants: {list(variants_by_spec.keys())}")

# ── merge and write suppliers ─────────────────────────────────────────────────
print("\nMerging suppliers...")
sup_path = f"{BASE}/suppliers/suppliers.json"
existing_sups = load(sup_path)
merged_sups, n = merge_by_id(existing_sups, list(suppliers_new.values()))
save(sup_path, merged_sups)
print(f"  +{n} new | {len(merged_sups)} total -> {sup_path}")

# ── merge and write systems ────────────────────────────────────────────────────
print("\nMerging systems...")
sys_path = f"{BASE}/systems/systems.json"
existing_sys = load(sys_path)
merged_sys, n = merge_by_id(existing_sys, list(systems_new.values()))
save(sys_path, merged_sys)
print(f"  +{n} new | {len(merged_sys)} total -> {sys_path}")

# ── merge and write per-specialty variants ─────────────────────────────────────
print("\nMerging variants per specialty...")
for spec_id, var_dict in sorted(variants_by_spec.items()):
    folder = SPEC_TO_FOLDER.get(spec_id)
    if not folder:
        print(f"  WARN: unknown spec_id {spec_id} - skipping {len(var_dict)} variants")
        continue
    path = f"{BASE}/procedure_variants/{folder}/procedure_variants_{folder}.json"
    existing = load(path)
    merged, n = merge_by_id(existing, list(var_dict.values()))
    save(path, merged)
    print(f"  {spec_id}: +{n} new | {len(merged)} total -> {path}")

# ── merge and write mappings ──────────────────────────────────────────────────
print("\nMerging variant-system mappings...")
map_path = f"{BASE}/systems/procedure_variant_system_map.json"
existing_maps = load(map_path)
existing_pairs = {(m["procedure_variant_id"], m["system_id"]) for m in existing_maps}
added = 0
for (vid, sid), m in mappings_new.items():
    if (vid, sid) not in existing_pairs:
        existing_maps.append(m)
        existing_pairs.add((vid, sid))
        added += 1
save(map_path, existing_maps)
print(f"  +{added} new | {len(existing_maps)} total -> {map_path}")

print("\nDone!")
print(f"Summary:")
print(f"  Suppliers: {len(merged_sups)}")
print(f"  Systems:   {len(merged_sys)}")
print(f"  Mappings:  {len(existing_maps)}")
print(f"  Variants by specialty:")
for spec_id in sorted(variants_by_spec.keys()):
    folder = SPEC_TO_FOLDER.get(spec_id, "?")
    path = f"{BASE}/procedure_variants/{folder}/procedure_variants_{folder}.json"
    try:
        data = load(path)
        print(f"    {folder}: {len(data)}")
    except:
        pass
