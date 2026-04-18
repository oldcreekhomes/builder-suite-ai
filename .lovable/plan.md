
## Recommendation
I agree with your rule. It's the cleanest, most predictable model and matches how every accounting system I've seen treats "committed" vs. "in-progress" cost.

**Rule:** A bill counts toward "Billed To Date" on a PO once its status is `approved` OR `paid`. Bills in `review` (draft) or `rejected` are excluded.

## Why this is the right call
- **Approved = committed cost.** Once approved, the bill has posted journal entries and affects the GL. It should affect PO consumption too — they need to stay in sync.
- **Paid is just a payment event.** It doesn't change what's owed against the PO; the cost was already committed at approval. So treating approved and paid identically for "Billed To Date" is correct.
- **Review = not yet committed.** Excluding it prevents premature double-counting and matches the "This Bill" preview column which already shows the in-flight draft separately.
- **Rejected = never committed.** Correctly excluded.
- **Order-independent.** No more weirdness from bill_date or ID ordering — status alone decides inclusion. This fixes the TNT case directly.

## How this fixes your TNT example
- Paid bill ($1,663.98): status = `paid` → included in Billed To Date ✅
- Approved bill ($459.31): status = `approved` → included in Billed To Date ✅
- When viewing the Approved bill's dialog: Billed To Date = $1,663.98 (the paid one), This Bill = $459.31, Remaining = $0.00 → Matched.
- When viewing the Paid bill's dialog: Billed To Date should exclude itself to avoid double-counting → shows $459.31 (the approved sibling), This Bill is the $1,663.98 paid one (already in total_billed for posted/paid), Remaining = $0.00 → Matched.

## Plan (to implement after approval)

### 1. `src/hooks/useVendorPurchaseOrders.ts`
- Replace the current `bill_date` + ID chronology filter with a **status-based filter**: include only bills where `status IN ('approved','paid')`.
- Continue to exclude the `currentBillId` from the sum so the dialog never double-counts the bill being viewed (works for both draft preview and posted/paid review).
- Remove the now-unused `currentBillDate` ordering logic.

### 2. `src/components/bills/BillPOSummaryDialog.tsx`
- Pass `currentBillStatus={bill.status}` through to `PODetailsDialog` (currently missing — this is why posted/paid bills sometimes show wrong totals).

### 3. `src/components/bills/PODetailsDialogWrapper.tsx`
- Already passes `currentBillStatus` — verify it's being threaded from the table row click on all four tabs (Review, Rejected, Approved, Paid).

### 4. `src/hooks/useBillPOMatching.ts`
- Mirror the same rule for table-side badge math: when computing `total_billed` for status comparison, count only `approved` + `paid` siblings, exclude the current bill if it's already in that set, then add the current bill's amount once for forward projection.
- Ensures table badge and dialog header badge always agree.

### 5. Verify
- TNT Longview Drive: open both bills' PO dialogs and the table badges — all four views should show consistent numbers and a "Matched" status on the final draw.
- Spot-check a Review-status bill: it should NOT appear in any sibling's Billed To Date.
- Spot-check a Rejected bill: same — excluded everywhere.

## Out of scope
- Changing what "approved" or "paid" means in the workflow
- Touching the journal-entry posting logic
- Restyling dialogs or badges
