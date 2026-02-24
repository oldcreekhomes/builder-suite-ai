
## Fix: PO Status Must Be Consistent Across All Tabs

### Problem
The Review tab and Approved/Posted/Paid tabs use **completely different** PO matching logic:

- **Review tab** (`usePendingBillPOStatus`): Auto-matches bills to POs by looking up `project_purchase_orders` where vendor + project + cost_code match. This shows "Matched" even though nothing is saved to the database.
- **Approved/Posted/Paid tabs** (`useBillPOMatching`): Only checks if `purchase_order_id` is explicitly saved on `bill_lines`. Since it was never saved during approval, these bills show "No PO".

Database confirms: bills $265.80, $289.25, $2,738.76, and $30,749.66 all have `purchase_order_id = NULL` on their bill lines, despite matching POs existing for vendor + cost_code.

### Solution (Two-Part Fix)

#### Part 1: Persist auto-matched PO IDs during approval (`usePendingBills.ts`)

Before calling `approve_pending_bill`, auto-populate `purchase_order_id` on `pending_bill_lines` that don't already have one:

1. Fetch the pending bill's lines (with cost_code_id)
2. Look up matching POs from `project_purchase_orders` using vendor + project + cost_code
3. Update each `pending_bill_line` with the matched `purchase_order_id` (only where currently NULL)
4. Then call `approve_pending_bill` as normal (it already copies `purchase_order_id` to `bill_lines`)

This applies to both single (`approveBill`) and batch (`batchApproveBills`) mutations.

#### Part 2: Add fallback auto-match to `useBillPOMatching` for existing bills

For bills that were already approved without PO IDs (the ones currently showing "No PO"), add the same vendor + project + cost_code matching logic as a fallback in `useBillPOMatching.ts`. This ensures:

- Bills approved before this fix still show correct PO status
- The logic is identical to what the Review tab uses
- Only kicks in when `purchase_order_id` is NULL (explicit selections are always respected)

### Files to Modify

1. **`src/hooks/usePendingBills.ts`** -- Add pre-approval PO auto-population step to both `approveBill` and `batchApproveBills` mutations
2. **`src/hooks/useBillPOMatching.ts`** -- Add vendor + project + cost_code fallback matching when `purchase_order_id` is NULL on bill lines, mirroring the logic in `usePendingBillPOStatus`

### Result
After this fix, a bill that shows "Matched" in Review will also show "Matched" in Approved, Posted, Paid, and any other tab -- because:
- New approvals will persist the PO match to the database
- Existing approved bills without PO IDs will be matched on-the-fly using the same logic
