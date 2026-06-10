## Change

In `src/components/bills/POSelectionDropdown.tsx`, update how the selected PO is displayed in the dropdown trigger (the collapsed row in the table).

### Trigger label
Currently the trigger shows `PO# | Cost Code | Amount`. Change it to show only the cost code, e.g.:

`3180: Sediment & Erosion Control`

(Same format as the Cost Code column for visual consistency.)

### Hover tooltip
Wrap the SelectTrigger in a shadcn Tooltip. On hover, show the full PO info string for the currently selected PO, matching the dropdown option format:

`2026-100N-0013 | 3180 - Sediment & Erosion Control | $22,347.30 / $22,347.30`

### Dropdown options (open list)
Leave the open dropdown list as-is — it already shows the full `PO# | Cost Code | Remaining / Total` line that the user likes.

## Scope

- Single file: `src/components/bills/POSelectionDropdown.tsx`.
- No changes to matching logic, save behavior, the info (ⓘ) icon, or the shared PO Status Summary dialog.
