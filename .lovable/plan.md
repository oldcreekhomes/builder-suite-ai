

## Replace Old PO Dialog with New Line-Item Breakdown

### What Happened
The redesigned `PODetailsDialog` (with line-item breakdown) was only wired into the `POSelectionDropdown` component -- the dropdown inside the bill editing forms. It was never connected to the **PO Status badge** on the Manage Bills page, which is what you actually click. Those badges still open the old `POComparisonDialog` showing useless aggregate numbers.

### What This Plan Does

**1. `BillsApprovalTable.tsx`** -- Swap `POComparisonDialog` for `PODetailsDialog`
- Import `PODetailsDialog` and `useVendorPurchaseOrders`
- When the PO Status badge is clicked, store the bill's `projectId` and `vendorId` (already available) and the specific PO ID
- Fetch the full PO data with line items using `useVendorPurchaseOrders`
- Find the matching PO from the results and pass it to `PODetailsDialog`
- Add current bill amount/reference as context footer

**2. `PayBillsTable.tsx`** -- Same swap as above
- Identical changes: replace `POComparisonDialog` with `PODetailsDialog`

**3. `PODetailsDialog.tsx`** -- Add current bill context
- Add optional `currentBillAmount` and `currentBillReference` props
- Show a small footer: "Current Bill: [reference] for $7,000"

**4. Delete `POComparisonDialog.tsx`**
- No longer used anywhere after the swap -- remove it entirely

### Result
When you click the "Matched" or "Over" badge on the bills approval page, you will see the full PO with all 22 line items, each showing description, cost code, PO amount, billed amount, and remaining. For the Four Seasons example, the "2nd floor" row will show $11,008 PO amount, $7,000 billed, $4,008 remaining.
