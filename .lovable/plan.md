# Plan: Mirror Approved-tab columns on the Paid tab

## Problem

On the Paid tab, payments are shown as a consolidated header row with expandable child bill rows. The child rows currently render empty placeholders for **Address**, **PO Status**, **Cleared**, and the final **Actions** column. The Approved tab renders all four. Result: the Paid tab looks stripped-down compared to Approved.

The header summary row (e.g., "3 items / Payment") should stay summary-only — only the **child bill rows** need to be filled in.

## Change (single file)

`src/components/bills/BillsApprovalTable.tsx`, child-row block inside the `isPaidStatus && paymentGroupsMap` branch (currently ~lines 1657–1832).

Replace the four empty placeholder cells for each child bill with the real per-bill content, copied from `renderBillRow`:

1. **Address cell** (when `showAddressColumn` is true)
   - Use the same `getLotAllocationData(childBill)` block used in `renderBillRow` (lines 1112–1151): show the lot/address display string, with the multi-lot tooltip breakdown when `uniqueLotCount > 1`. Skip if `childBill` is missing.

2. **PO Status cell** (always rendered, since `showPOStatusColumn = true`)
   - Use the same `poMatchingData?.get(childBill.id)` lookup and `<POStatusBadge>` rendering from lines 1190–1213, including the `over_and_partial` split case. Click opens the PO details dialog exactly like the parent row.

3. **Cleared cell** (final column for paid status)
   - Render the same green check / dash logic from line 1233:
     `childBill.reconciled ? <Check className="h-4 w-4 text-green-600 mx-auto" /> : <span className="text-muted-foreground">-</span>`

4. **Actions cell** (the trailing `canShowDeleteButton` column)
   - Because paid bills are locked from edits, render a **red lock icon** instead of the action menu, matching the established convention in `src/components/accounting/AccountDetailDialog.tsx` and `CloseBooksPeriodManager.tsx`:
     `<Lock className="h-4 w-4 text-red-600 mx-auto" />`
   - Wrap in a tooltip: "Paid bills are locked".
   - Import `Lock` from `lucide-react` if not already imported.

## Out of scope

- The "Pay Bill" column is correctly hidden on Paid (`showPayBillButton` is false there) — no change.
- The payment header (summary) row keeps its current empty placeholders so the summary doesn't repeat per-bill data.
- No business-logic or data-fetch changes — `poMatchingData`, `lots`, and `reconciled` are already loaded for the visible bills.
- Footer "Total amount: $0.01" rounding is a separate concern and not covered here.

## Verification

- Open Paid tab on 103 East Oxford, search "homest", expand a multi-bill payment group: each child row should now show address, the matched PO badge, cleared check (or dash), and a red lock in Actions.
- Single-bill payments fall through to the standard `renderBillRow` path and continue to render correctly.
- Header layout and column widths remain unchanged (all four columns already exist in the header).
