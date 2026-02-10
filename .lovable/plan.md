

# Fix: "Hide Paid" Not Working in Accounts Payable Dialog

## Problem

The previous fix tried to determine historical payment status using the `bill_payment_allocations` table. But most bills in this project were paid individually and have **no records** in `bill_payment_allocations` -- only 2 out of 11 paid bills have allocation records. So the lookup returns $0 for almost every paid bill, `isPaid` stays `false`, and "Hide Paid" fails to filter them out.

## Root Cause

The `bill_payment_allocations` table is only populated for **consolidated** (multi-bill) payments. Individual bill payments skip this table entirely. The code assumed all payments would have allocation records, which is incorrect.

## Solution

Replace the `bill_payment_allocations` query with a `journal_entries` query. Every bill payment -- whether individual or consolidated -- creates a journal entry with `source_type = 'bill_payment'` and `source_id = bill.id`. Checking for the existence of such an entry with `entry_date <= asOfDate` reliably determines if a bill was paid before the report date.

## Changes

### File: `src/components/accounting/AccountDetailDialog.tsx` (lines 336-363)

Replace the `bill_payment_allocations` query and `isPaid` logic with:

1. Query `journal_entries` where `source_type = 'bill_payment'`, `source_id IN (billIds)`, `entry_date <= asOfDate`, and `reversed_at IS NULL`.
2. Build a Set of bill IDs that were paid before the as-of date.
3. Update `isPaid` determination:

```
// Before (broken - most bills have no allocation records):
const isPaid = asOfDate
  ? (paidAsOfDate[bill.id] || 0) >= bill.total_amount
  : bill.amount_paid >= bill.total_amount || bill.status === 'paid';

// After (works - every payment has a journal entry):
const isPaid = asOfDate
  ? billsPaidBeforeAsOf.has(bill.id)
  : bill.amount_paid >= bill.total_amount || bill.status === 'paid';
```

This correctly identifies the RC Fields bill ($3,500, paid Jan 13, 2026) as **unpaid** on Dec 31, while correctly identifying all other paid bills (paid before Dec 31) as **paid** so they get hidden.

