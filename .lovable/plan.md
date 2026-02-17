

## Unify PO Status Dialog Across All Bill Tabs

### Problem
The Paid/Approved tabs (`PayBillsTable`) use `PODetailsDialogWrapper` which opens a single `PODetailsDialog` with only the first PO match. This shows incorrect/incomplete information (e.g., $720 from a single PO line instead of the full $7,000 bill context). Meanwhile, the Review tab (`BillsApprovalTable`) uses the `BillPOSummaryDialog` which correctly shows all matched POs with the "This Bill" column.

### Solution
Replace `PODetailsDialogWrapper` usage in `PayBillsTable` with `BillPOSummaryDialog` -- the same component used on the Review tab.

### Technical Changes

**File: `src/components/bills/PayBillsTable.tsx`**

1. Replace import of `PODetailsDialogWrapper` with `BillPOSummaryDialog`
2. Change `poDialogState` shape from `{ open, poMatch, bill }` (single match) to `{ open, matches, bill }` (all matches) -- matching the pattern in `BillsApprovalTable`
3. Update the PO Status badge click handler to pass all matches (`matchResult?.matches`) instead of just `firstMatch`
4. Replace the `<PODetailsDialogWrapper>` component at the bottom with `<BillPOSummaryDialog>`, passing the same props as the Review tab does

This ensures every tab shows the same PO Status Summary dialog with the "This Bill" column and correct amounts.

