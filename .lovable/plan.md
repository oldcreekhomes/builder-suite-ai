
## Goal
Extend the row-click-to-open-PO-dialog behavior from the Review tab to the Rejected, Approved, and Paid tabs as well — whenever a bill row has a matched PO.

## Current state
In `BillsApprovalTable.tsx`, `renderBillRow` gates row-click on `isDraftStatus && rowAllMatches.length > 0`. The PO Status column already shows "Matched" badges in non-draft tabs, so the dialog data path works for them too.

## Plan
1. In `src/components/bills/BillsApprovalTable.tsx`:
   - Remove the `isDraftStatus` condition from `rowClickable`. Keep the `rowAllMatches.length > 0` check so rows without a PO stay non-interactive.
   - Keep all existing `stopPropagation` wrappers (Files, Notes, PO Status badge, Actions menu) — they already protect interactive cells in every tab.
2. Verify the Paid tab's consolidated/grouped payment rows (e.g., the "OCH at Nob Hill — 13 items" expandable rows) are not affected — those are rendered by a separate path, not `renderBillRow`. If they share the renderer, exclude grouped/parent rows from row-click so expand/collapse still works.

## Out of scope
- Visual restyling
- Dialog content changes
- Grouped payment parent-row behavior (will be left as-is)
