

## Fix Review Tab: Memo Blank + Wrong PO Dialog

### Problem 1: Memo is blank in Review tab
The AI extraction populates `pending_bill_lines.description` (e.g. "Asbestos abatement services") but leaves `memo` as NULL. The `approve_pending_bill` RPC copies `memo` (NULL) to `bill_lines.memo`, ignoring `description`. So the Review tab shows "-" because there's no memo data.

**Fix**: Update the `approve_pending_bill` RPC to use `COALESCE(line_record.memo, line_record.description)` when inserting into `bill_lines.memo`. This ensures the description is carried over as memo when no explicit memo exists.

Additionally, update the Review tab's `getBillMemoSummary` function in `BillsApprovalTable.tsx` as a safety net -- but the real fix is in the RPC so future bills get memo populated.

For the current bill (CU202508), run a one-time SQL update to backfill memo from the pending data.

### Problem 2: PO Status dialog missing "This Bill" column
The Review tab uses `BillPOSummaryDialog` which calls `PODetailsDialog` without the `pendingBillLines` prop. Without that prop, the "This Bill" column doesn't render, and remaining doesn't account for the current bill's allocation.

**Fix**: In `BillPOSummaryDialog.tsx`, derive `pendingBillLines` from `bill.bill_lines` and pass it to `PODetailsDialog`. This applies to both the single-match shortcut (line 78) and the drill-down dialog (line 166).

### Technical Details

**File 1: `src/components/bills/BillPOSummaryDialog.tsx`**

- Add `pendingBillLines` prop to both `PODetailsDialog` renders, derived from `bill.bill_lines`:
  ```typescript
  pendingBillLines={bill?.bill_lines?.map(l => ({
    cost_code_id: l.cost_code_id || undefined,
    amount: l.amount || 0,
    purchase_order_line_id: l.purchase_order_line_id || undefined,
  })) || []}
  ```
- Need to add `purchase_order_line_id` to the `BillLine` interface
- Update the `PendingBillLine` type import from `PODetailsDialog` if needed

**File 2: Database RPC `approve_pending_bill`**

- Change the `memo` value in the INSERT into `bill_lines` from:
  `line_record.memo`
  to:
  `COALESCE(line_record.memo, line_record.description)`

**File 3: `src/components/bills/BillsApprovalTable.tsx`** (lines 554-567)

- Update `getBillMemoSummary` to also check `bill.bill_lines[].description` as a fallback (future-proofing, though bill_lines doesn't currently have a description column -- so the RPC fix is the primary solution)

**One-time data fix** (run in SQL editor):

Update existing bill_lines that have NULL memo by matching back to their pending_bill_lines description. This fixes the current CU202508 bill and any others that were already approved.

