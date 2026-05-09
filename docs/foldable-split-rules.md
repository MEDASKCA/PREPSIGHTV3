# Foldable Split Rules

This document captures the shared notation and behavior rules for unfolded foldable phones in the mobile experience.

## Notation

- `A'` = Comms main page with search and three-dot menu
- `B'` = Library main page with search and three-dot menu
- `C'` = Resources main page with search and three-dot menu
- `D'` = Insights main page with search and three-dot menu
- `-A1'` = Comms thread detail with back button, search, and three-dot menu
- `E` = active caller display / call surface
- `F` = minimized video display

## Symbols

- `=` separates left and right panes in unfolded mode
- `+` means both panes share a unified header
- `'` means that pane or shared header owns search and the three-dot menu
- `-` means that pane owns a back button

## Split Chrome

- The swap button must always be present in split mode.
- The swap button sits on the center divider.
- In unified-header states, the swap button sits below the shared center header.
- The bottom dock stays on the left pane by default for unified main-page states.

## Base Comms Rules

- The standard unfolded Comms split is `A=A1'`.
- In this state, the left pane is the Comms list view and the right pane is the selected thread view.
- The right pane owns search and the three-dot menu.
- The split thread view does not show a back button in `A=A1'`.

## Unified Main-Tab States

- Unified main-tab states are:
  - `+A=B'`
  - `+A=C'`
  - `+A=D'`
- These states use one shared header across both panes.
- The `'` stays on the right side of the shared header.

## Breaking Unified State

- Selecting a thread from `+A=X'` breaks unified mode and becomes `-A1=X'`.
- `X'` is dynamic and can be `B'`, `C'`, or `D'`.
- When unified mode breaks, the right pane keeps `'`.

## Call Rules

- `E` never owns search or the three-dot menu.
- Search and the three-dot menu must always remain on the non-call pane.
- During an active call, `E` stays on its current pane unless the user explicitly swaps panes.
- Only the non-call pane changes when the user navigates or selects content during the call.

Examples:

- `A'=E`
- selecting a thread becomes `-A1'=E`
- `E=B'`
- tapping Comms becomes `E=A'`
- selecting a thread becomes `E=-A1'`

## Non-Comms Split Defaults

- When the user is on Library, Resources, or Insights in unfolded mode, the default paired Comms pane should be `A`.
- Default states are:
  - `A=B'`
  - `A=C'`
  - `A=D'`
- These states must not restore a stale `-A1` thread-detail pane unless the behavior explicitly calls for it.

## Incoming Call Transition

- When the device is on the standard Comms split `A=A1'` and an incoming call arrives, the UI should transition directly to the correct active-call split state.
- It must not flash an intermediate wrong split such as `E=A1'` before settling.

## Library Detail Behavior In Split Mode

- Library detail pages opened from the Library pane must remain in the Library pane while unfolded.
- The Comms pane stays visible on the other side.
- This applies to routes such as `/libraries/[id]/cards/[cardId]`.
- Library drill-down must not replace the entire unfolded screen.
