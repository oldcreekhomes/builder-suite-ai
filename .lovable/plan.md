

# Fix: Accounts Payable Dialog "Hide Paid" Not As-Of-Date Aware

## Problem

The Balance Sheet shows $20,486.15 for Accounts Payable as of December 31, 2025. But when you click on that line to open the account detail dialog, it shows $16,986.15 -- a $3,500 difference.

The root cause is the same as the A/P Aging report bug that was just fixed: the dialog's "Hide Paid" toggle uses the bill's **current** `amount_paid` and `status` fields to determine if a bill is paid. So a bill that was paid on January 13, 2026 (after the Dec 31 as-of date) gets marked as "paid" and hidden from the dialog, even though it was still outstanding on December 31.

The Balance Sheet total ($20,486.15) is correct because it uses journal entry dates. The dialog total ($16,986.15) is wrong because it hides bills based on their current payment status rather than their historical status.

## Solution

Make the `isPaid` determination as-of-date aware. When an `asOfDate` is provided, query `bill_payment_allocations` joined with `bill_payments` to calculate how much was paid on or before the as-of date, instead of relying on the bill's current `amount_paid` field.

## Changes

### File: `src/components/accounting/AccountDetailDialog.tsx`

**In the query function (around lines 316-352):**

After fetching bills, if an `asOfDate` is provided:

1. Query `bill_payment_allocations` joined with `bill_payments` for all bill IDs, filtering by `payment_date <= asOfDate`.
2. Sum allocations per bill to get the historical `amount_paid`.
3. Use this historical amount (instead of `bill.amount_paid`) to determine `isPaid`.

This is the same pattern already applied to `AccountsPayableContent.tsx`. The key change is on the `isPaid` calculation at line 342:

```
// Current (broken):
const isPaid = bill.amount_paid >= bill.total_amount || bill.status === 'paid';

// Fixed (when asOfDate is provided):
const historicalPaid = paidAsOfDate[bill.id] || 0;
const isPaid = historicalPaid >= bill.total_amount;
```

When no `asOfDate` is provided (e.g., from the Accounting page), the current behavior is preserved.

