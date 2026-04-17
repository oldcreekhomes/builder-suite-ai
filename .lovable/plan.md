
## Issue
Table badge correctly shows "Draw" for the TNT bill, but the PO dialog still shows "Matched". The two need to use the same status logic.

## Root cause
`PODetailsDialog` computes its own status (matched / over_po) and doesn't know about the "draw" state. The table uses `useBillPOMatching` which now returns `draw` when the bill amount is less than the PO remaining (partial draw).

## Plan
1. In `src/components/bills/PODetailsDialog.tsx`, replicate the same cent-precise logic used in `useBillPOMatching`:
   - `over_po` when `remainingCents < 0`
   - `draw` when bill amount < PO remaining (partial of total)
   - `matched` when bill fully consumes the remaining PO
2. Render the existing `POStatusBadge` (which already supports the `draw` variant) in the dialog header instead of the hardcoded Matched/Over badge.
3. Pass the bill `status` (draft vs posted) into the dialog so it avoids double-counting `total_billed` for posted bills, mirroring the hook fix.

## Out of scope
- Restyling the dialog
- Changing the table logic (already correct)
