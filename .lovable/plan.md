

# Fix: A/P Aging Report Not Accounting for As-Of Date on Payments

## Problem Found

The discrepancy between the Balance Sheet ($20,486.15) and the A/P Aging report ($16,986.15) is exactly **$3,500.00**. This comes from the **RC Fields bill (#56045, $3,500)** which was:

- **Billed on November 14, 2025** (correctly included -- it's before Dec 31)
- **Paid on January 13, 2026** (after the Dec 31 as-of date)

The **Balance Sheet** correctly handles this: it sums journal entry lines with `entry_date <= Dec 31`, so the January 13 payment is excluded, and the bill still shows as owing $3,500.

The **A/P Aging report** has a bug: it reads `amount_paid` and `status` directly from the `bills` table, which reflects the **current** state (fully paid), not the historical state as of December 31. So it excludes this bill entirely, understating AP by $3,500.

## Root Cause

The A/P Aging query uses `bill.total_amount - bill.amount_paid` to determine open balance. But `amount_paid` is a running total that includes ALL payments ever made, regardless of when. There is no as-of-date filtering on payments.

## Solution

Instead of relying on the bill's `amount_paid` field, calculate the amount paid **as of the report date** by summing `bill_payment_allocations` where the parent `bill_payments.payment_date <= asOfDate`.

### File: `src/components/reports/AccountsPayableContent.tsx`

**Step 1**: Change the query to fetch ALL non-reversed bills (posted or paid) with `bill_date <= asOfDate`, removing the open-balance filter from the initial query.

**Step 2**: After fetching bills, query `bill_payment_allocations` joined with `bill_payments` to get the sum of payments made on or before the as-of date for each bill.

**Step 3**: Calculate `open_balance = total_amount - amount_paid_as_of_date` and filter out bills where the balance is zero.

```text
Query flow:
1. Fetch all bills where bill_date <= asOfDate (posted/paid, non-reversed)
2. Fetch bill_payment_allocations joined with bill_payments
   WHERE bill_payments.payment_date <= asOfDate
   GROUP BY bill_id -> sum of amount_allocated
3. For each bill: openBalance = total_amount - (payments as of date)
4. Filter out bills with openBalance <= 0.01
```

This ensures the A/P Aging report matches the Balance Sheet's as-of-date-aware approach, so both reports will show $20,486.15 as of December 31, 2025.

