from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "catalogue" / "fixed_data_source_manifest.json"
SOURCE_ROOT = ROOT / "data" / "catalogue" / "source_library"


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-") or "unknown"


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    sourced_ids = set()
    for file in SOURCE_ROOT.glob("*/_source_links.json"):
        try:
            data = json.loads(file.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, list):
            continue
        for row in data:
            if isinstance(row, dict) and row.get("system_id"):
                sourced_ids.add(row["system_id"])

    pending_by_supplier = defaultdict(list)
    for row in manifest:
        if row.get("system_id") in sourced_ids:
            continue
        supplier_name = row.get("supplier_name") or "Unassigned"
        pending_by_supplier[supplier_name].append(
            {
                "system_id": row.get("system_id", ""),
                "system_name": row.get("system_name", ""),
                "system_category": row.get("system_category", ""),
                "mapping_count": row.get("mapping_count", 0),
                "source_folder": row.get("source_folder", ""),
                "needed_sources": [
                    "operative technique",
                    "ifu",
                    "catalogue",
                ],
                "notes": row.get("notes", ""),
            }
        )

    current_pending_files = list(SOURCE_ROOT.glob("*/_pending_sources.json"))
    active_supplier_files = {
        SOURCE_ROOT / slug(supplier_name) / "_pending_sources.json"
        for supplier_name in pending_by_supplier
    }
    for pending_file in current_pending_files:
        if pending_file not in active_supplier_files:
            pending_file.write_text("[]\n", encoding="utf-8")

    for supplier_name, rows in pending_by_supplier.items():
        supplier_dir = SOURCE_ROOT / slug(supplier_name)
        supplier_dir.mkdir(parents=True, exist_ok=True)
        (supplier_dir / "_pending_sources.json").write_text(
            json.dumps(sorted(rows, key=lambda item: (-item["mapping_count"], item["system_name"])), indent=2, ensure_ascii=True),
            encoding="utf-8",
        )

    print(f"pending supplier lists written: {len(pending_by_supplier)}")


if __name__ == "__main__":
    main()
