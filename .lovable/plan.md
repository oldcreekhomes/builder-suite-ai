I’ll fix the bill-payment detail calculation so payments on the same bill and same payment date are ordered by the actual transaction timestamp, not just the date.

Plan:

1. **Use the real payment sequence**
   - Keep using `payment_date` for different days.
   - For payments on the same date, use the bank journal entry `created_at` timestamp as the ordering timestamp.
   - This matches cases like City Concrete where `$10,000` was paid first and `$5,028` was paid minutes later on the same date.

2. **Attach the correct timestamp to bank rows**
   - In `AccountDetailDialog.tsx`, when building synthetic bill-payment rows from `bill_payments`, match each payment allocation to its active, non-reversed `journal_entries` row by:
     - same bill id,
     - same payment date,
     - same payment amount,
     - excluding reversed/reversal journal entries.
   - Use that matched journal entry `created_at` as the row’s `created_at` instead of relying on `bill_payments.created_at`, because the backfilled bill payment records can share the exact same timestamp.

3. **Compute previous payments correctly in the detail dialog**
   - In `TransactionDetailDialog.tsx`, replace the current date-only cutoff with a date + timestamp cutoff.
   - A payment counts as **Previous Payments** when:
     - its `payment_date` is before the current row date, or
     - its `payment_date` is the same date and its matched journal-entry timestamp is earlier than the current transaction’s timestamp.
   - The current payment will still be shown separately.

4. **Expected City Concrete result**
   - First `$10,000` payment:
     - Original Bill: `$15,028.00`
     - Current Payment: `($10,000.00)`
     - Balance: `$5,028.00`
   - Second `$5,028` payment:
     - Original Bill: `$15,028.00`
     - Previous Payments: `($10,000.00)`
     - Current Payment: `($5,028.00)`
     - Balance: `$0.00`

5. **Keep the cleared-status fix included**
   - While touching the same payment path, exclude reversed/reversal journal entries from the bank-side reconciliation lookup so cleared payments do not incorrectly display as paid.