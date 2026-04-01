export const FIXED_DATA_EXTRACTION_PROMPT = `Extract structured fixed-data information from the source text below for PrepSight.

Rules:
- Return JSON only
- Do not write explanations
- Do not guess missing values
- Leave unknown values as empty strings
- Do not invent IDs
- Use names only
- Only extract information explicitly supported by the source
- Do not set mapping_status
- Include unresolved or ambiguous items in "unresolved_items"

Return this exact structure:

{
  "source_meta": {
    "supplier_name": "",
    "system_name": "",
    "source_type": "",
    "source_document": "",
    "source_version": "",
    "source_date": ""
  },
  "systems": [
    {
      "system_name": "",
      "supplier_name": "",
      "system_category": "",
      "system_notes": ""
    }
  ],
  "trays": [
    {
      "tray_name": "",
      "system_name": "",
      "tray_type": "",
      "tray_notes": ""
    }
  ],
  "components": [
    {
      "component_name": "",
      "system_name": "",
      "component_role": "",
      "implant_category": "",
      "component_notes": ""
    }
  ],
  "products": [
    {
      "sku": "",
      "product_name": "",
      "component_name": "",
      "packaging_type": "",
      "product_notes": ""
    }
  ],
  "system_mappings": [
    {
      "procedure_name": "",
      "procedure_variant": "",
      "system_name": "",
      "data_source": "",
      "research_notes": "",
      "last_verified": ""
    }
  ],
  "unresolved_items": [
    {
      "entity_type": "",
      "raw_text": "",
      "reason": "",
      "source_excerpt": ""
    }
  ]
}

Source text:
[PASTE SOURCE HERE]`
