
## Issues
1. **Row not clickable on Approved tab** for the TNT bill, even though we removed the `isDraftStatus` gate. The badge says "Over" but clicking the row does nothing.
2. **Status mismatch**: table badge shows "Over" (red), dialog shows "Matched" (green). For PO 2025-126L-0023: PO total $2,123.29, billed $0.00, this bill $459.31 → remaining $1,663.98. This is clearly **under budget / a draw**, not over. Both the table and the dialog "Over" indicator are wrong; the dialog's green "Matched" is actually correct.

## Investigation needed
1. Re-open `src/components/bills/BillsApprovalTable.tsx` `renderBillRow` to confirm whether `rowAllMatches` is populated for non-draft tabs. The PO Status column clearly renders an "Over" badge in the Approved tab, so a match exists for badge purposes — but row-click may use a different source (e.g., `poMatch` only set for draft, or matches lookup keyed off `pendingBillLines` that's empty for approved bills).
2. Check where the "Over" badge in the PO Status column is computed for non-draft tabs vs. how the dialog computes its status. Likely two different code paths:
   - Table badge: probably uses raw PO `remaining` without subtracting/accounting for the current approved bill (which is already in `total_billed`), causing a $0.01 or sign-flip artifact, OR uses a stale aggregate.
   - Dialog: uses cent-precise `remainingCents < 0`, which correctly returns "Matched" here.
3. Inspect `useVendorPurchaseOrders` (or the hook feeding the table badge) to see how `remaining` / status is derived per bill row in approved/paid tabs. Specifically check if the current bill is being double-counted (subtracted again on top of `total_billed` that already includes it).
4. Confirm `pendingBillLines` is passed for non-draft tabs. If not, the dialog correctly falls back to PO header math (which gives the right answer here). The table needs the same logic.

## Hypotheses
- **H1 (row click):** `rowAllMatches` for approved/paid bills is derived from `pendingBillLines` or a draft-only matches map, so it's empty → `rowClickable` is false even though the badge renders from a different source. Need to use the same source the badge uses.
- **H2 (status mismatch):** The table badge subtracts the current bill's amount from `remaining` a second time (since the bill is already approved and counted in `total_billed`), producing a phantom over-budget. Dialog uses corrected math and shows the truth.

## Plan
1. Read `BillsApprovalTable.tsx` `renderBillRow` + the PO Status badge cell to see both data sources.
2. Read the hook(s) that supply per-row PO match info for non-draft tabs.
3. Unify: make `rowClickable` use the same match source the badge uses (so any row showing a PO badge is clickable).
4. Fix the table-side over/matched calculation to mirror the dialog's cent-precise logic and avoid double-counting the current bill's amount when it's already in `total_billed` (approved/paid).
5. Verify the TNT row now (a) opens dialog on row-click and (b) shows "Matched" in both the table badge and dialog.

## Out of scope
- Restyling
- Other tabs' grouped payment rows
- PO line-item creation
