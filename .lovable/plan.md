
## Issue
Three PO dialogs from the same Review tab show inconsistent data:
1. **PO 2026-103E-0009** — works correctly (shows line items + over-budget warning)
2. **PO 2026-103E-0008** — "No line items found" + over-budget warning ($0.01)
3. **PO 2026-103E-0027** — "No line items found" + Matched badge

So two problems:
- **A.** Some POs render "No line items found" even though they're real POs that were matched to the bill.
- **B.** PO 2026-103E-0008 shows an "over budget by $0.01" warning despite having no visible lines (likely a cent-rounding artifact, but worth confirming after A is fixed).

## Investigation needed
1. Read `PODetailsDialog.tsx` to see how line items are loaded — likely from `purchase_order_lines` keyed off the matched PO's `id`.
2. Read `PODetailsDialogWrapper.tsx` (already shown) and the Review-tab handler in `BillsApprovalTable.tsx` to see what `poMatch` / `matches` we pass in (the new row-click sets `matches: rowAllMatches`, but the wrapper takes a single `poMatch`).
3. Check `useVendorPurchaseOrders` to confirm `id` and `purchase_order_lines` shape.
4. Query DB for POs `2026-103E-0008` and `2026-103E-0027` to see if they actually have rows in `purchase_order_lines`. If they do → it's a fetch/key mismatch bug. If they don't → these are header-only POs and the dialog needs a graceful fallback (show PO header total + "this bill" comparison instead of "No line items").

## Likely root causes (hypotheses to confirm)
- **H1 (most likely):** The new row click passes `matches` (array) but the wrapper/dialog still expects a single `poMatch`. When multiple matches exist, the wrong PO id (or none) is selected, so `purchase_order_lines` query returns empty. The 0009 case worked because that row had a single match.
- **H2:** Some POs were created without line items (header-only). Dialog should fall back to using `total_amount` from the PO header so the comparison still renders.
- **H3:** The $0.01 over-budget is cent-precision drift — already a known pattern (see `mem://accounting/cent-precise-calculation-rounding-and-arithmetic`). Confirm after H1/H2 fixed.

## Plan
1. Inspect the three files above + run a DB read to check line-item presence for the two failing POs.
2. Fix the wrapper/dialog wiring so it always resolves the correct matched PO id (handle single vs. multiple matches).
3. Add a graceful header-only fallback when `purchase_order_lines` is empty: show one synthetic row using PO `total_amount` and the PO's header `cost_code_id` so the comparison/warning is meaningful instead of "No line items found."
4. Re-evaluate the $0.01 warning after fix; if still present on truly equal amounts, apply cent-precise rounding before the over-budget check.

## Out of scope
- Changing PO creation to require line items.
- Restyling the dialog.
- Any change to other tabs.
