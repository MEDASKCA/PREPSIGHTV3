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
- Search and the three-dot menu default to the right side of the unfolded layout.

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
- The unified-header rule is state-based, not hard-coded to “Comms must be on the left”.
- If panes are swapped, unified mode still applies as long as the Comms pane is `A`.
- So the swapped equivalents are still unified states:
  - `B'=A`
  - `C'=A`
  - `D'=A`

## Breaking Unified State

- Selecting a thread from `+A=X'` breaks unified mode and becomes `-A1=X'`.
- `X'` is dynamic and can be `B'`, `C'`, or `D'`.
- When unified mode breaks, the right pane keeps `'`.
- Unified mode breaks only when the Comms pane stops being `A`.
- In practice, that means unified mode ends when Comms becomes:
  - `A1`
  - `E`
- Swap by itself does not break unified mode.

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
- If panes are swapped, the same rule still applies with Comms on the opposite side:
  - `B'=A`
  - `C'=A`
  - `D'=A`
- When a Comms thread is active, the split becomes the corresponding `A1` form on whichever side Comms currently occupies.

## Incoming Call Transition

- When the device is on the standard Comms split `A=A1'` and an incoming call arrives, the UI should transition directly to the correct active-call split state.
- It must not flash an intermediate wrong split such as `E=A1'` before settling.

## Library Detail Behavior In Split Mode

- Library detail pages opened from the Library pane must remain in the Library pane while unfolded.
- The Comms pane stays visible on the other side.
- This applies to routes such as `/libraries/[id]/cards/[cardId]`.
- Library drill-down must not replace the entire unfolded screen.
- Direct URL entry to library detail routes on foldables must also resolve into the split shell, not a standalone full-screen mobile shell.
- The same principle applies to unfolded Resources routes and related subroutes: the non-Comms content stays in its pane and Comms remains in the opposite pane as `A` or `A1`.

## Header And Back Controls In Split Library States

- If the Comms pane is still `A`, the unified header stays active even when the Library pane is showing a deeper library view.
- In those cases, the Library-side `Back` control belongs in the unified header row on the non-Comms side.
- The unified header should not disappear just because the non-Comms pane opened a deeper library state.
- If unified mode is already broken because Comms became `A1` or `E`, then the `Back` control belongs in the standalone pane header for the non-Comms pane.

## Pane-Bounded Drawers And Overlays

- Any library branch/version drawer opened from the Library pane in unfolded mode must stay inside the Library pane bounds.
- Its backdrop must also stay inside that pane and must not cover or cross the center divider.
- Drawer contents must not overflow past the pane midline.

## Embedded Detail Header Rule

- When a detail view is rendered inside an unfolded split pane, it must not render a duplicate inner mobile header below the split header.
- Embedded Library card and branch-detail views should suppress their own mobile top headers when the split shell already provides the pane header.
