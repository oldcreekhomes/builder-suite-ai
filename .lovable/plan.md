

## Fix the third number — Hide Paid filter mishandles partially-paid bills

### What I found

| View | Total | Status |
|---|---|---|
| A/P Aging Detail (PDF) as of 2/28 | $161,894.60 | correct |
| Balance Sheet AP 2010 as of 2/28 | $161,894.60 | correct (now matches) |
| AP Detail Dialog (Hide Paid ON) as of 2/28 | **$160,882.03** | **wrong — off by $1,012.57** |

### Root cause — single bill, partially paid as of the as-of date

Bill **#469748** for **$1,312.57** posted 2/23/2026:
- Payment 1: **$300.00** on 2/23/2026 ✓ before as-of
- Payment 2: **$1,012.57** on 3/18/2026 ✗ AFTER 2/28 as-of

Today the bill's `bills.status='paid'` and `amount_paid=$1,312.57`, but as of 2/28 only $300 had been paid — **$1,012.57 was still outstanding** on that date.

The bug is in `src/components/accounting/AccountDetailDialog.tsx` around lines 360–388. When an `asOfDate` is provided, the dialog builds a set `billsPaidBeforeAsOf` containing any bill that has *any* `bill_payment` JE on or before the as-of date — even a partial one. Then it marks `isPaid = true` for those bills. With **Hide Paid** ON, the bill ($1,312.57 credit) and its $300 partial payment (debit) are both hidden, but the $1,012.57 remainder simply vanishes from the running balance.

A/P Aging and Balance Sheet are both correct because they net actual JE amounts and don't make the binary "paid/unpaid" assumption.

### Fix

Replace the binary `billsPaidBeforeAsOf` set with a proper **as-of remaining-balance check**. A bill is "paid" as of the as-of date only when total payments before that date ≥ bill amount.

In the same `useQuery` block where `paymentEntries` is fetched (~lines 360–378):

1. For each bill, sum the AP debits (payments) on/before `asOfDate` from the JE lines.
2. Fetch the bill's posted AP credit (already in `bills.total_amount`, but use the actual JE sum to handle credits/reversals correctly).
3. Mark `isPaid = true` only when `payments_total >= bill_credit_total` (cent-precise compare, per the project's cent-math standard).
4. The predecessor→successor mapping logic (lines 405–429) already keys off this set; it continues to work unchanged once the set itself is corrected.

After this fix, partially-paid bills as of the as-of date stay visible in the register (with their partial payments), and the running balance equals the Balance Sheet AP balance for every as-of date.

### Verification

- AP Detail Dialog as of **2026-02-28** with Hide Paid ON → **$161,894.60** (matches BS and A/P Aging).
- Bill #469748 visible in the register with the $300 payment and a remaining $1,012.57.
- AP Detail Dialog with Hide Paid OFF → unchanged (already correct, since nothing is filtered).
- Other as-of dates with no partial payments → unchanged behavior.

### Files touched
- `src/components/accounting/AccountDetailDialog.tsx` — only the as-of `isPaid` computation block. No DB changes, no other components.

