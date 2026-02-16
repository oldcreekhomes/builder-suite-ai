

## Fix: Stop Duplicating Billing Across PO Lines

### Root Cause
The bill line for INV0010 ($7,000) has `purchase_order_id` set but `purchase_order_line_id` is NULL. The current code tries to distribute this $7,000 to PO lines by matching on `cost_code_id`. But this PO has **19 lines all sharing cost code 4370**, so the $7,000 gets duplicated to every single one -- showing $133,000 billed instead of $7,000.

### Fix

**`src/hooks/useVendorPurchaseOrders.ts`** -- Remove the broken cost-code distribution logic

- Remove the `poLevelBilledByCostCodeByPo` map entirely (lines 112-122)
- For line-level billing, ONLY use `purchase_order_line_id` (explicit link) -- this is the only reliable attribution
- For PO-level billing (where `purchase_order_id` is set but `purchase_order_line_id` is NULL), aggregate it into the PO header total only, not distributed to individual lines
- Add a new "Unallocated" summary row in the dialog when there is PO-level billing that couldn't be attributed to a specific line

**`src/components/bills/PODetailsDialog.tsx`** -- Show unallocated billing clearly

- Accept a new `unallocatedBilled` field on the `VendorPurchaseOrder` interface
- If there is unallocated billing, show an "Unallocated" row at the bottom of the line items table (before the totals row) with the amount that hasn't been assigned to a specific PO line
- This makes it clear that $7,000 is billed against the PO but not yet allocated to a specific line

### Result
- Each PO line shows $0.00 billed (correct -- nothing is explicitly linked to them)
- The PO header shows $7,000 Billed to Date (correct -- one bill exists against this PO)
- An "Unallocated" row shows $7,000 so the user knows it needs to be assigned to a specific line
- To get the $7,000 to show on "2nd floor" specifically, the user edits the bill and selects the "2nd floor" PO line from the dropdown -- this sets `purchase_order_line_id` and the attribution becomes explicit and correct

### Why This Is the Right Approach
Cost-code matching fails when multiple PO lines share the same cost code (which is common -- this PO has 19 lines on one cost code). The only reliable way to attribute billing to a specific PO line is through the explicit `purchase_order_line_id` link, which is set when the user selects a PO line in the bill entry/edit form.
