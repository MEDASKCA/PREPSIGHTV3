from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "data" / "catalogue" / "fixed_data_source_manifest.json"
SOURCE_LIBRARY = ROOT / "data" / "catalogue" / "source_library"
OUTPUT_JSON = ROOT / "data" / "catalogue" / "fixed_data_missing_sources.json"
OUTPUT_XLSX = ROOT / "Fixed_Data_Missing_Sources.xlsx"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def system_has_sources(system: dict) -> bool:
    source_folder = Path(system["source_folder"])
    supplier_slug = source_folder.parts[-2]
    links_path = SOURCE_LIBRARY / supplier_slug / "_source_links.json"
    if not links_path.exists():
        return False
    try:
        entries = load_json(links_path)
    except json.JSONDecodeError:
        return False
    target_id = system["system_id"]
    return any(entry.get("system_id") == target_id and entry.get("sources") for entry in entries)


def build_missing_rows(manifest: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for row in manifest:
        if system_has_sources(row):
            continue
        rows.append(
            {
                "Supplier Name": row["supplier_name"],
                "Supplier Folder": Path(row["source_folder"]).parts[-2],
                "System ID": row["system_id"],
                "System Name": row["system_name"],
                "System Category": row.get("system_category", ""),
                "Mapping Count": row.get("mapping_count", 0),
                "Source Folder": row["source_folder"],
                "Missing Sources": ", ".join(
                    [
                        source_name
                        for source_name, found in (
                            ("operative technique", row.get("operative_technique_found", "")),
                            ("ifu", row.get("ifu_found", "")),
                            ("catalogue", row.get("catalogue_found", "")),
                        )
                        if not found
                    ]
                ),
                "Follow-up Notes": "",
            }
        )
    rows.sort(key=lambda item: (item["Supplier Name"], item["System Name"]))
    return rows


def write_json(rows: list[dict]) -> None:
    payload = {
        "summary": {
            "missing_systems": len(rows),
        },
        "rows": rows,
    }
    with OUTPUT_JSON.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def write_xlsx(rows: list[dict]) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "MISSING_SOURCES"
    headers = list(rows[0].keys()) if rows else [
        "Supplier Name",
        "Supplier Folder",
        "System ID",
        "System Name",
        "System Category",
        "Mapping Count",
        "Source Folder",
        "Missing Sources",
        "Follow-up Notes",
    ]
    sheet.append(headers)
    for row in rows:
        sheet.append([row.get(header, "") for header in headers])
    workbook.save(OUTPUT_XLSX)


def main() -> None:
    manifest = load_json(MANIFEST_PATH)
    rows = build_missing_rows(manifest)
    write_json(rows)
    write_xlsx(rows)
    print(OUTPUT_JSON)
    print(OUTPUT_XLSX)


if __name__ == "__main__":
    main()
