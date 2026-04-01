from __future__ import annotations

import json
from pathlib import Path

from openpyxl import Workbook


ROOT = Path(__file__).resolve().parents[1]
EXTRACTION_ROOT = ROOT / "data" / "catalogue" / "manual_extractions"
OUTPUT_JSON = ROOT / "data" / "catalogue" / "manual_extraction_index.json"
OUTPUT_XLSX = ROOT / "Manual_Extraction_Index.xlsx"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def build_rows() -> list[dict]:
    rows: list[dict] = []
    for json_path in sorted(EXTRACTION_ROOT.rglob("*_extraction.json")):
        payload = load_json(json_path)
        meta = payload.get("source_meta", {})
        rows.append(
            {
                "Supplier Name": meta.get("supplier_name", ""),
                "System Name": meta.get("system_name", ""),
                "Source Type": meta.get("source_type", ""),
                "Source Document": meta.get("source_document", ""),
                "Source Version": meta.get("source_version", ""),
                "Source Date": meta.get("source_date", ""),
                "Trays Count": len(payload.get("trays", []) or []),
                "Components Count": len(payload.get("components", []) or []),
                "Products Count": len(payload.get("products", []) or []),
                "Mappings Count": len(payload.get("system_mappings", []) or []),
                "Unresolved Count": len(payload.get("unresolved_items", []) or []),
                "Extraction File": str(json_path.relative_to(ROOT)),
            }
        )
    return rows


def write_json(rows: list[dict]) -> None:
    payload = {
        "summary": {
            "systems_parsed": len(rows),
            "trays_total": sum(row["Trays Count"] for row in rows),
            "components_total": sum(row["Components Count"] for row in rows),
            "products_total": sum(row["Products Count"] for row in rows),
            "mappings_total": sum(row["Mappings Count"] for row in rows),
        },
        "rows": rows,
    }
    OUTPUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_xlsx(rows: list[dict]) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "MANUAL_EXTRACTIONS"
    headers = list(rows[0].keys()) if rows else [
        "Supplier Name",
        "System Name",
        "Source Type",
        "Source Document",
        "Source Version",
        "Source Date",
        "Trays Count",
        "Components Count",
        "Products Count",
        "Mappings Count",
        "Unresolved Count",
        "Extraction File",
    ]
    sheet.append(headers)
    for row in rows:
        sheet.append([row.get(header, "") for header in headers])
    workbook.save(OUTPUT_XLSX)


def main() -> None:
    rows = build_rows()
    write_json(rows)
    write_xlsx(rows)
    print(OUTPUT_JSON)
    print(OUTPUT_XLSX)


if __name__ == "__main__":
    main()
