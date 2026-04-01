## Trauma And Orthopaedics Reference Imports

Files copied from `C:\Users\forda\Downloads` on 2026-03-13:

- `master_ontology.json`
- `full_with_all_tier_suppliers.json`

Current alignment against repo data:

- Master ontology subspecialties: `13`
- Master ontology anatomy nodes: `95`
- Master ontology subanatomy groups: `316`
- Master ontology procedures: `604`
- Master ontology variants: `227`
- Master ontology systems: `424`

Current repo trauma and orthopaedics data:

- Procedures: `597`
- Variants: `227`

Gap summary:

- Variants match the repo exactly by ID.
- Master ontology contains `44` procedures not present in the repo procedure file.
- Current repo contains `37` procedures not present in the imported master ontology.
- The missing imported procedures currently have `null` IDs, so they should not be merged into live repo data until canonical IDs are assigned.

Use these files as reference sources for the next normalization/import pass.
