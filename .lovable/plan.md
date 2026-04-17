
## Goal
Make the entire bill row in the Review tab clickable to open the PO Status dialog (currently only the badge in the "PO Status" column triggers it).

## Investigation needed
- Find the Review tab row component (likely `BillsApprovalReviewRow` or similar — not `BillsReviewTableRow` which is the older `/review-bills` page).
- Locate the PO Status badge `onClick` and the dialog state.
- Identify cells with their own interactions (Files icon, Notes "Add", Description preview, Actions `…` menu) so we can stop propagation on those and not hijack their clicks.

## Plan
1. In the Review row component:
   - Add `onClick` to the `<TableRow>` that opens the PO Status dialog.
   - Add `cursor-pointer` class.
2. Add `e.stopPropagation()` to the existing interactive children:
   - Files icon button
   - Notes "Add" button
   - Description preview trigger
   - Actions menu (`…`) trigger
   - The PO Status badge itself (so it still works and doesn't double-fire)
3. No changes to the dialog itself or to other tabs (Approved/Paid/Rejected) unless the user wants the same behavior — out of scope for now.

## Out of scope
- Other tabs
- Visual restyle of the row
- Dialog behavior changes
