# PrepSight Shared Platform Architecture

PrepSight should behave like a combination of:

- GitHub: versioned procedure content, local ownership, shared publication, contribution history
- YouTube: community discovery, likes, ratings, comments, suggestions, reputation signals
- Waze: local contributors improve the shared system continuously, and the strongest patterns gradually standardise

## Product Rules

1. Every hospital/team workspace can create and maintain local source content.
2. Local content is automatically published to the global repository.
3. Global publication is anonymised.
4. The originating hospital/team remains responsible for maintenance.
5. Users should start from a baseline taxonomy and baseline procedure library, not from zero.
6. Users should usually create versions of existing procedures rather than blank net-new cards.
7. The platform should still support new procedures and new taxonomy where the baseline is incomplete.
8. Global community signals should help surface strong patterns over time without exposing sensitive source identity.

## Identity Model

### Local / Workspace View

Visible:

- real hospital or team name
- real consultant or clinician name
- real contributor names
- explicit ownership and accountability

Purpose:

- operational editing
- maintenance responsibility
- local governance

### Global View

Visible:

- anonymised hospital alias such as `PSH-001`
- anonymised contributor alias
- anonymised consultant/version labels
- specialty / setting context
- community signals such as likes, ratings, comments, and suggestions

Hidden:

- real hospital identity
- real consultant identity
- real contributor identity

Purpose:

- cross-site learning
- shared discovery
- gradual standardisation without prestige bias

## Repository Model

### Global Repository

Contains:

- shared canonical taxonomy
- shared canonical procedure definitions
- published anonymised projections of workspace-authored versions

### Workspace Repositories

Each repository maps to a hospital/team workspace and contains:

- local source procedures
- consultant-specific versions
- local adaptations of shared procedures
- local taxonomy additions where permitted

The workspace repository is authoritative for its own source lineage. The global repository is a projection layer, not an independently authored duplicate.

## Core Firebase Entities

The implementation target is defined in:

- `src/lib/shared-repository.ts`
- `src/lib/shared-repository-seed.ts`

Collections:

- `repositories_v2`
- `taxonomy_nodes_v2`
- `canonical_procedures_v2`
- `procedure_versions_v2`
- `publication_projections_v2`
- `publication_comments_v2`
- `publication_suggestions_v2`
- `publication_ratings_v2`
- `publication_reactions_v2`

## Taxonomy Model

The taxonomy model must work across all settings, not only Operating Theatre.

Node kinds:

- setting
- specialty
- service_line
- anatomy

Each node carries:

- setting context
- parent-child hierarchy
- stable path IDs and labels
- canonical/local state
- lifecycle state
- owning repository and organisation lineage

The existing Operating Theatre structure is treated as seed data. Other settings should be seeded to the same shared model and expanded over time.

## Procedure Model

There are two distinct layers:

### Canonical Procedure

Represents the shared procedure identity:

- canonical procedure name
- aliases and tags
- taxonomy linkage
- source lineage

### Procedure Version

Represents the actual usable card content:

- canonical version
- consultant preference version
- team preference version
- local adaptation

Versions carry the editable sections, workflow steps, metadata, contributor identity, lifecycle state, and revision number.

## Automatic Publishing

Publishing from workspace content to global should be automatic.

That means:

- local source content is created in the workspace repository
- a global publication projection is produced automatically
- the global projection is anonymised
- edits from the owning workspace should update the published projection

This requires:

- strong lineage between source and projection
- revision history
- lifecycle states such as draft, active, superseded, archived
- rollback support

## Community Layer

Global content should support:

- likes
- useful/save reactions
- ratings
- comments
- suggestions for improvement

These do not replace ownership. They provide community pressure and discovery signals that help the strongest patterns emerge and influence standardisation.

## Migration Direction

The current repo still relies heavily on file-backed taxonomy and seeded procedure data.

The safe migration order is:

1. Define the generalized Firebase data model.
2. Seed the current taxonomy and baseline procedures into Firebase.
3. Switch onboarding, browse, search, and library views to Firebase reads.
4. Add workspace editing and automatic global publication.
5. Remove file-backed runtime dependency once Firebase is authoritative.

## Immediate Goal

The immediate engineering goal is not to start from an empty platform.

It is to:

- keep the current baseline
- transform it into shared Firebase-ready records
- let hospitals and teams extend and maintain it live
- make the platform feel non-empty and useful from first use
