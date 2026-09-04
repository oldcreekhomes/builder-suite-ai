# Multiple Checks — Column-Header Cost Code / Account Switch

## Goal
Move the Cost Code / Account toggle out of the card header and into the table column header itself (the "Cost Code" column), exactly where the red box is in the screenshot.

## Changes (all in `src/components/multi-entry/MultiCheckTable.tsx`)

1. **Remove the header dropdown** — delete the "Apply rows as" label and `Select` from the card's top header. Header keeps only: Default Date, Total, and the three-dot Actions menu (Add Row / Clear All).

2. **Column header becomes the switch** — the column currently labeled "Cost Code" (between Check # and Description) renders a dropdown select in the table header instead of static text:
   - Shows "Cost Code" by default with a chevron, styled to match other table headers (no input-box look — uses a borderless/trigger-ghost style so it reads as a header, not a form field).
   - Options: "Cost Code" and "Account".
   - Switching updates every row (clears stale cost code / account selections) — reuses the existing `handleEntryTypeChange` logic.
   - The row cells below already swap between the cost-code picker and account picker; no change needed there.

3. **Everything else stays** — per-row three-dot Actions/Delete column at the far right, Add Row / Clear / Save Batch footer, save logic, and data model are untouched.

## Technical notes
- Implementation swaps the header `Select` for a compact `DropdownMenu` (or borderless `Select`) inside `<TableHead>`, displaying the active value ("Cost Code" or "Account") with a `ChevronDown` icon.
- No database, hook, or other file changes.
- Verify with `bun run build:dev`.
