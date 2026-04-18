

## Goal
On the **Enter with AI** tab, make each bill row clickable. Clicking the row should open the PO dialog showing what POs the line items are attached to — same behavior as the Review / Rejected / Approved / Paid tabs.

## What's already in place
- `BatchBillReviewTable.tsx` already wires up `BillPOSummaryDialog` and `setPoDialogBillId(bill.id)` via the PO Status badge click.
- `usePendingBillPOStatus` already computes `poStatusMap` for each bill (status + matched PO ids).
- So the dialog, data, and matches all exist — only the row-level click handler is missing.

## Changes (single file: `src/components/bills/BatchBillReviewTable.tsx`)

1. **Make each `<TableRow>` clickable when the bill has matched POs**
   - Add `onClick` to the row that calls `setPoDialogBillId(bill.id)` only when `poStatusMap.get(bill.id)?.status !== 'no_po'`.
   - Add conditional classes: `cursor-pointer hover:bg-muted/50` when clickable.
   - Mirror the pattern used in `BillsApprovalTable.tsx` and `PayBillsTable.tsx` (`handleRowClick` + `rowClickable`).

2. **Stop propagation on interactive child cells** so clicking them doesn't also pop the PO dialog:
   - Checkbox cell
   - Vendor "Re-match" / "Add" buttons (when vendor unmatched)
   - Files cell (file icon buttons + remove `×` buttons)
   - PO Status badge cell (already triggers the dialog itself)
   - Actions menu (Edit / Delete)
   - Tooltip triggers stay fine (they don't have onClick handlers that conflict)

3. **No data, no schema, no dialog component changes** — the existing `BillPOSummaryDialog` rendering block at the bottom of the file already handles everything.

## Out of scope
- Hover-to-preview (user said "click on that row" — matches the behavior on the other tabs).
- Any extraction / matcher / PO-reference logic (that's the prior thread).
- The file preview / Storage RLS work (separate open thread).

## Verification
- Open Enter with AI tab → AN EXTERIOR INC. row → click anywhere on the row → PO summary dialog opens showing the matched POs.
- Click checkbox → only toggles selection, dialog does NOT open.
- Click file icon → only opens preview, dialog does NOT open.
- Click PO Status badge → still opens dialog (existing behavior preserved).
- Click ⋯ Actions menu → only opens menu.
- Bills with `no_po` status → row is not clickable, no hover affordance.

