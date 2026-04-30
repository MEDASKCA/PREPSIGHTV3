SIDEBAR ICONS — PrepSight Portal
=================================

Drop your PNG files in this folder to replace the sidebar icons.
PNG, SVG, WEBP, and JPG are all supported.

ICON NAMES (use these exact filenames):
  collections.png    — Collections nav item
  bookmarks.png      — Bookmarks nav item
  review.png         — Review nav item
  calendar.png       — Calendar nav item
  catalogue.png      — Catalogue nav item
  workforce.png      — Workforce / User Accounts nav items
  equipment.png      — Equipment nav item
  supplies.png       — Supplies / Departments nav items

SIZE GUIDANCE:
  - 32×32 px or 48×48 px recommended
  - Square canvas
  - Transparent background (PNG with alpha works great)
  - Light-coloured artwork reads best on the dark sidebar (#202020)

HOW IT WORKS:
  The sidebar reads icon paths from:
    src/lib/workspace-nav.ts

  Each nav item has an "iconSrc" field pointing to this folder.
  Example: "/icons/navigation/collections.png"

  Once you drop a PNG in here with the correct filename, it shows up
  automatically — no code change needed.

TO SWAP A SINGLE ICON:
  1. Save your image as e.g. collections.png in this folder
  2. That's it — the sidebar will use it on next page load

TO USE A DIFFERENT FILENAME:
  Open src/lib/workspace-nav.ts and update the iconSrc for that item.
  Example: iconSrc: "/icons/navigation/my-custom-icon.png"
