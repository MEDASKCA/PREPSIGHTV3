# PrepSight — Product Decisions & Rationale

A living document capturing the *why* behind key product and technical decisions.
Update this as decisions evolve.

---

## What PrepSight is

A community-maintained clinical procedure reference platform. Think Kardex, but digital,
consistent, and always with you. Every card covers equipment, instruments, positioning,
medications, and more — organised by setting, specialty, and surgeon.

**Product of MEDASKCA™**

---

## Architecture decisions

### Tech stack
- **Next.js 16 + TypeScript + Tailwind CSS v4** — App Router, server + client components
- **Firebase** — Auth (Google + Microsoft), Firestore (data), Storage (images)
- **Vercel** — deployment, auto-deploys from `master`

### Data architecture
- `src/lib/hospitals.json` — seed list of UK hospitals, read-only baseline
- `src/lib/seed-data/` — procedure card seed data (TypeScript, version-controlled)
- **Firestore** — all user-generated or community additions on top of the seed data
  - `users/{uid}` — user profile (hospital, departments, role, specialties)
  - `admin_content/{key}` — text overrides for page content (editable via admin)
  - `hospitals/{id}` — user-added hospitals, require admin approval
  - `surgeons/{id}` — user-added surgeon profiles, require admin approval
  - `proposed_changes/{id}` — pending procedure card edits (see Editing below)
  - `approvers/{uid}` — users granted approval power (set by admin only)

### Why seed data stays in TypeScript not Firestore
Procedures are the core content — keeping them in version-controlled TypeScript means
they're auditable via Git, deployable instantly, and don't depend on Firestore being
reachable. Community edits layer on top via Firestore.

---

## User roles

### Onboarding role selection is a survey, not an access gate
During onboarding, users pick how they'll use PrepSight (Browse / Manage / Clinical Author).
This is **personalisation data only** — it tailors the UI (filtered settings, relevant content)
but does not restrict access to any features. Everyone in the community can edit.

**Rationale:** Gating edits by self-declared role creates friction and false security.
A scrub nurse who ticks "Browse" should still be able to fix a wrong item on a card.
Real governance comes from the approval workflow, not role-based locks.

### Approver status
Approvers are the exception — this IS a granted permission, set by the admin only via
the dev mode admin page (`/admin` → Approvers tab, coming soon).

- Approvers can be scoped to specific settings (e.g. "Theatres only") or global
- Granted and revoked by admin at any time
- Intended for: senior clinicians, charge nurses, clinical educators

**Rationale:** Domain-appropriate oversight. A theatres approver doesn't need to
validate endoscopy content, and vice versa.

---

## Editing & change governance

### Everyone can propose edits
Any signed-in user can enter edit mode on any procedure card and propose changes.

### Edit mode UX
- **Trigger:** floating ✏ Edit button, bottom-right of procedure page
- **Visual language:** coral accent colour (vs blue for viewing) so edit state is unmistakable
- **Scope:** all section content — items, qty, location, notes, positioning, references
- **Audit:** every proposed change records who proposed it, what changed (diff), and when

### Proposed changes workflow (Option A — chosen)
1. User submits edit → change is **immediately visible** but flagged as "Proposed"
2. Amber banner on card: *"Proposed changes — reverts in X days if not approved"*
3. All approvers for that setting are notified (Day 1, Day 2 reminder, Day 3 final)
4. Any approver can approve → change becomes permanent
5. If no approver acts within the window → **auto-reverts** to previous version
6. Proposer is notified of outcome either way

**Why Option A over Option B (immediate live + revert window):**
In a clinical reference context, showing proposed content as "pending" rather than
immediately authoritative builds user trust. A scrub nurse preparing for a case needs
to know whether what they're reading is validated or in flux. The amber flag makes
that clear. Option B (Wikipedia model) is fine for general knowledge but not for
clinical decision support.

### Approval window
- Default: **3 days**
- Configurable per trust/organisation via admin page
- Rationale: short enough to keep content fresh, long enough for busy clinicians to act

### Auto-revert as safe default
If nobody acts, the card silently returns to its last approved state.
No manual cleanup, no cards left in permanent "proposed" limbo.

### Accountability trail
- Permanent, visible to admins even after revert
- Includes: proposer, diff (old vs new), timestamp, approver (if approved), revert reason (if reverted)
- Stored in Firestore `proposed_changes/{id}`

---

## Content filtering (personalised feed)

Users pick their departments during onboarding. The app filters:
- **Home page "Your areas"** — only shows settings relevant to their departments
- **Sidebar** — "Your areas" at top, all other settings hidden behind "Show all areas" toggle
- **Search** — always searches everything (not filtered) so users can still find anything

**Rationale:** A ward nurse shouldn't have to scroll past 8 theatre specialties to find
what they need. But they should always be able to browse everything if they want to.

---

## Visual design language

| Context | Colour | Rationale |
|---|---|---|
| Viewing / navigation | `#4DA3FF` blue | Calm, clinical, trustworthy |
| Editing / proposed changes | `#F87171` rose-red | Clearly different state — "this is mutable" |
| Warnings / pending approval | Amber | Standard clinical caution colour |
| Approved / safe | Green | Standard clinical safe colour |

No dark navy (`#003366`) anywhere — removed in favour of the single blue accent.

---

## Admin / dev mode

- **Trigger:** 10 clicks anywhere on the page within 8 seconds → password prompt
- **Route:** `/admin` (requires Firebase auth + admin session password)
- **Password:** set via `NEXT_PUBLIC_ADMIN_PASSWORD` env var (default: `prepsight-dev`)
- **Capabilities:** content editing, hospital/surgeon approval, image uploads, data stats

**Rationale:** Hidden trigger prevents accidental access by clinical users while keeping
it accessible without a separate login flow for the admin.

---

## Section structure

Procedure cards are built from sections. Sections are grouped into 6 parent categories
for the section picker (used when creating/editing cards):

| # | Group | Sections |
|---|---|---|
| 1 | Before the procedure | Overview, Consent & Documentation, Pre-procedure Assessment, Patient Information |
| 2 | Setup | PPE, Patient Positioning, Sterile Field & Draping, Anaesthesia |
| 3 | Equipment | Instrument Sets & Trays, Medical Devices & Equipment, Implants & Prosthetics, Consumables & Supplies |
| 4 | Medications | Medications & Fluids, Blood & Products, Specimen Collection |
| 5 | During | Nurse Prep Notes, Surgical Steps, Procedure Reference, Counts, Imaging & Fluoroscopy |
| 6 | After | Post-procedure Care, Discharge Criteria, Complications & Escalation |

**Rationale:** 6 groups follow the natural chronological flow of any procedure regardless
of setting. Any more groups = same problem as a flat list.

---

## Item row layout

Each item in a section shows three columns:

```
[Item name  ⓘ]    [LOC]    [Qty]
```

- **ⓘ inline** — tapping opens notes, custom instructions, and comments panel
- **LOC** — storage location, displayed as multi-line using `/` as line-break delimiter
  e.g. `"4th Floor/Storage A/Shelf A2"` renders as three stacked lines
- **Qty** — default quantity

**Rationale:** Moving ⓘ inline frees up a column for location data which is operationally
important (staff need to know where to fetch items from).

---

## Surgeons (Waze model)

Surgeon data is **user-generated**, not pre-loaded. Users add surgeons when creating or
editing procedure cards. Submissions go to Firestore `surgeons/` collection and require
admin approval before appearing in the sidebar.

**Rationale:** No central database of surgeons exists and maintaining one would be
operationally impossible. Crowdsourcing with approval is the right model (cf. Waze
for road data).

---

## What's next (build order)

1. **Edit mode UI** — floating coral edit button, inline editing on procedure page
2. **Proposed changes workflow** — Firestore `proposed_changes`, amber banner, diff view
3. **Approver management** — admin page Approvers tab, scoped permissions
4. **Notifications** — Firebase Cloud Messaging or email (SendGrid) for approval reminders
5. **Auto-revert** — Firebase Cloud Functions scheduled job
6. **Card creator** — new procedure card form using same visual template as viewing
7. **Surgeon linking** — attach surgeon profiles to procedure card variants
