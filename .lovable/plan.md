

## Run PO Matching on Initial Load (Not Just on Edit)

### Problem
PO auto-matching currently only runs when the user opens the "Edit Extracted Bill" dialog. The table always shows "No PO" on initial load because `purchase_order_id` is NULL in the database until the dialog triggers matching.

### Solution
Move the PO matching logic to run automatically right after bill lines are loaded in `BillsApprovalTabs.tsx`, so the PO Status badge is accurate from the moment bills appear in the table.

### Technical Changes

**File: `src/components/bills/BillsApprovalTabs.tsx`** (lines ~90-200, the `fetchAllLines` useEffect)

After fetching all lines and processing lots (around line 192), add a new step:

1. Collect unique vendor IDs from the batch bills (from `bill.vendor_id` or `bill.extracted_data.vendor_id`)
2. For each unique vendor that has a `vendor_id`, fetch their approved POs using the same query pattern as `useVendorPurchaseOrders` (direct Supabase calls, not the hook, since we're inside an async effect)
3. For each bill's lines that don't already have a `purchase_order_id`, run `getBestPOLineMatch` against that vendor's PO lines
4. Batch-update matched `pending_bill_lines` rows in the database with the assigned `purchase_order_id`
5. Update the local `billsWithLines` state so the table renders the correct PO status immediately

This reuses the existing `getBestPOLineMatch` utility from `src/utils/poLineMatching.ts` and follows the same matching logic already proven in the Edit dialog.

**File: `src/components/bills/EditExtractedBillDialog.tsx`** (no changes needed)

The existing auto-match logic in the dialog will detect that lines already have `purchase_order_id` set (from the table-level matching) and skip re-matching (`needsMatching` check on line 395 will be false). So there's no conflict.

### What the User Will See

- Upload a PDF and extract invoices
- The table immediately shows "Matched", "Partial", or "No PO" based on actual PO matching results
- Opening the Edit dialog confirms the same PO assignments
- No need to click Edit just to trigger PO status updates

### Sequence
1. Add PO matching logic to the `fetchAllLines` effect in `BillsApprovalTabs.tsx`
2. The matching persists results to DB and updates local state in one pass
