"""
Targeted cleanup for Operating Theatre taxonomy/procedure drift.

Currently fixes:
- duplicate Arthroplasty anatomy mappings caused by flat ANAT_* imports
- obvious orphan T&O procedures that duplicate existing canonical concepts but have no variants
"""

from __future__ import annotations

import json
from pathlib import Path
from collections import defaultdict


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main():
    slam_path = DATA / "taxonomy" / "service_line_anatomy_map.json"
    slam = load_json(slam_path)

    remove_ids = {
        "SLAMAP_SL_ARTHROPLASTY_ANAT_ACETABULUM",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_ANKLE",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_ELBOW",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_FEMUR",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_HIP",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_KNEE",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_PATELLA",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_PELVIS",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_SHOULDER",
        "SLAMAP_SL_ARTHROPLASTY_ANAT_WRIST",
    }
    cleaned_slam = [row for row in slam if row.get("id") not in remove_ids]
    removed_slam = len(slam) - len(cleaned_slam)
    save_json(slam_path, cleaned_slam)

    proc_path = DATA / "procedures" / "trauma_and_orthopaedics" / "procedures_trauma_and_orthopaedics.json"
    procedures = load_json(proc_path)
    orphan_duplicate_ids = {
        "PROC_ACETABULAR_CUP_REVISION_OF_HIP_ARTHROPLASTY",
    }
    cleaned_procs = [row for row in procedures if row.get("id") not in orphan_duplicate_ids]
    removed_procs = len(procedures) - len(cleaned_procs)
    save_json(proc_path, cleaned_procs)

    urology_proc_path = DATA / "procedures" / "urology" / "procedures_urology.json"
    urology_variant_path = DATA / "procedure_variants" / "urology" / "procedure_variants_urology.json"
    urology_procs = load_json(urology_proc_path)
    urology_variants = load_json(urology_variant_path)

    canonical_procedure_map = {
        "PROC_PCNL": "PROC_PERCUTANEOUS_NEPHROLITHOTOMY",
        "PROC_TURBT": "PROC_TRANSURETHRAL_RESECTION_OF_BLADDER_TUMOUR",
        "PROC_TURP": "PROC_TRANSURETHRAL_RESECTION_OF_PROSTATE",
        "PROC_HOLEP": "PROC_HOLMIUM_LASER_ENUCLEATION_OF_PROSTATE",
    }

    remapped_variants = 0
    for row in urology_variants:
        replacement = canonical_procedure_map.get(row.get("procedure_id"))
        if replacement:
            row["procedure_id"] = replacement
            remapped_variants += 1

    cleaned_urology_procs = [
        row for row in urology_procs if row.get("id") not in canonical_procedure_map
    ]
    removed_urology_procs = len(urology_procs) - len(cleaned_urology_procs)
    save_json(urology_proc_path, cleaned_urology_procs)
    save_json(urology_variant_path, urology_variants)

    systems_path = DATA / "systems" / "systems.json"
    mappings_path = DATA / "systems" / "procedure_variant_system_map.json"
    systems = load_json(systems_path)
    mappings = load_json(mappings_path)

    canonical_system_map = {
        "SYS_ATTUNE_KNEE_SYSTEM": "SYS_ATTUNE_KNEE",
        "SYS_TRIATHLON_KNEE_SYSTEM": "SYS_TRIATHLON_KNEE",
        "SYS_PERSONA_KNEE_SYSTEM": "SYS_PERSONA_KNEE",
        "SYS_EQUINOXE_SHOULDER_SYSTEM": "SYS_EQUINOXE",
    }

    remapped_system_refs = 0
    for row in mappings:
        replacement = canonical_system_map.get(row.get("system_id"))
        if replacement:
            row["system_id"] = replacement
            remapped_system_refs += 1

    deduped_mappings = []
    seen_pairs = set()
    for row in mappings:
        pair = (row.get("procedure_variant_id"), row.get("system_id"))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        deduped_mappings.append(row)

    cleaned_systems = [
        row for row in systems if row.get("id") not in canonical_system_map
    ]
    removed_systems = len(systems) - len(cleaned_systems)

    save_json(systems_path, cleaned_systems)
    save_json(mappings_path, deduped_mappings)

    anaesthesia_proc_path = DATA / "procedures" / "anaesthesia" / "procedures_anaesthesia.json"
    anaesthesia_procs = load_json(anaesthesia_proc_path)
    cleaned_anaesthesia = [
        row for row in anaesthesia_procs if row.get("id") != "PROC_EPIRURAL_ANAESTHESIA"
    ]
    removed_anaesthesia_procs = len(anaesthesia_procs) - len(cleaned_anaesthesia)
    save_json(anaesthesia_proc_path, cleaned_anaesthesia)

    systems = load_json(systems_path)
    mappings = load_json(mappings_path)
    distal_radius_alias_map = {
        "SYS_DISTAL_RADIUS_FIXATION_SYSTEM": "SYS_DISTAL_RADIUS_SYSTEM",
    }
    distal_radius_remaps = 0
    for row in mappings:
        replacement = distal_radius_alias_map.get(row.get("system_id"))
        if replacement:
            row["system_id"] = replacement
            distal_radius_remaps += 1
    deduped_mappings = []
    seen_pairs = set()
    for row in mappings:
        pair = (row.get("procedure_variant_id"), row.get("system_id"))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        deduped_mappings.append(row)
    cleaned_systems = [
        row for row in systems if row.get("id") not in distal_radius_alias_map
    ]
    removed_distal_radius_systems = len(systems) - len(cleaned_systems)
    save_json(systems_path, cleaned_systems)
    save_json(mappings_path, deduped_mappings)

    variant_paths = list((DATA / "procedure_variants").rglob("*.json"))
    mappings = load_json(mappings_path)
    total_removed_variant_rows = 0
    total_remapped_variant_refs = 0
    total_pruned_synthetic_variants = 0

    def normalize(value):
        return str(value or "").strip().lower()

    def sort_key(row):
        return (
            int(row.get("sort_order") or 999999),
            len(str(row.get("description") or "")) * -1,
            str(row.get("id") or ""),
        )

    generic_variant_names = {
        "flexible scope",
        "rigid scope",
        "holmium laser",
        "thulium laser",
        "open approach",
        "laparoscopic approach",
        "robotic approach",
    }

    procedure_name_by_id = {}
    for proc_path in (DATA / "procedures").rglob("*.json"):
        rows = load_json(proc_path)
        for row in rows:
            if row.get("id"):
                procedure_name_by_id[row["id"]] = row.get("name", "")

    def looks_synthetic(row):
        return (
            normalize(row.get("name")) in generic_variant_names
            and normalize(row.get("description")).endswith("variant")
        )

    def should_keep_synthetic_variant(procedure_name, variant_name):
        text = normalize(procedure_name)
        variant_key = normalize(variant_name)

        if any(term in text for term in [
            "circumcision", "vasectomy", "frenuloplasty", "orchidopexy", "orchidectomy", "hydrocele"
        ]):
            return variant_key == "open approach"

        if any(term in text for term in [
            "transurethral", "cystoscopy", "ureteroscopy", "ureterorenoscopy", "pcnl",
            "nephrolithotomy", "lithotripsy", "endoscopic", "bladder", "prostate", "stone"
        ]):
            allowed = {"flexible scope", "rigid scope", "holmium laser", "thulium laser"}
            if "holmium" in text:
                allowed = {"flexible scope", "rigid scope", "holmium laser"}
            if "thulium" in text:
                allowed = {"flexible scope", "rigid scope", "thulium laser"}
            return variant_key in allowed

        if any(term in text for term in [
            "laparoscopic", "robotic", "colectomy", "gastrectomy", "nephrectomy",
            "prostatectomy", "hysterectomy", "hernia"
        ]):
            return variant_key in {"open approach", "laparoscopic approach", "robotic approach"}

        return True

    for variant_path in variant_paths:
        variants = load_json(variant_path)
        grouped = defaultdict(list)
        for row in variants:
            grouped[(row.get("procedure_id"), normalize(row.get("name")))].append(row)

        canonical_map = {}
        cleaned_variants = []
        for _, rows in grouped.items():
            rows = sorted(rows, key=sort_key)
            canonical = rows[0]
            cleaned_variants.append(canonical)
            for duplicate in rows[1:]:
                canonical_map[duplicate.get("id")] = canonical.get("id")

        # prune low-quality synthetic branches for procedures that only have sprayed generic variants
        by_procedure = defaultdict(list)
        for row in cleaned_variants:
            by_procedure[row.get("procedure_id")].append(row)

        pruned_variants = []
        for procedure_id, rows in by_procedure.items():
            procedure_name = procedure_name_by_id.get(procedure_id, "")
            if rows and all(looks_synthetic(row) for row in rows):
                kept = [
                    row for row in rows
                    if should_keep_synthetic_variant(procedure_name, row.get("name"))
                ]
                if kept:
                    total_pruned_synthetic_variants += len(rows) - len(kept)
                    pruned_variants.extend(kept)
                    continue
            pruned_variants.extend(rows)

        if canonical_map:
            for row in mappings:
                replacement = canonical_map.get(row.get("procedure_variant_id"))
                if replacement:
                    row["procedure_variant_id"] = replacement
                    total_remapped_variant_refs += 1

        removed_here = len(variants) - len(pruned_variants)
        total_removed_variant_rows += removed_here
        save_json(variant_path, pruned_variants)

    deduped_mappings = []
    seen_pairs = set()
    for row in mappings:
        pair = (row.get("procedure_variant_id"), row.get("system_id"))
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        deduped_mappings.append(row)
    save_json(mappings_path, deduped_mappings)

    print(f"Removed {removed_slam} duplicate arthroplasty anatomy mappings")
    print(f"Removed {removed_procs} orphan duplicate T&O procedures")
    print(f"Remapped {remapped_variants} urology variants onto canonical procedure IDs")
    print(f"Removed {removed_urology_procs} duplicate urology procedures")
    print(f"Remapped {remapped_system_refs} duplicate system references")
    print(f"Removed {removed_systems} duplicate systems")
    print(f"Removed {removed_anaesthesia_procs} duplicate anaesthesia procedures")
    print(f"Remapped {distal_radius_remaps} distal radius system references")
    print(f"Removed {removed_distal_radius_systems} remaining duplicate systems")
    print(f"Remapped {total_remapped_variant_refs} duplicate variant references")
    print(f"Removed {total_removed_variant_rows} duplicate variant rows")
    print(f"Pruned {total_pruned_synthetic_variants} low-quality synthetic variants")


if __name__ == "__main__":
    main()
