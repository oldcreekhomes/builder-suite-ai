
## Problem

For a Bill Payment transaction, the Description currently reads "Paid" instead of the bill's actual line description ("Ceramic tile installation"). Root cause: `TransactionDetailDialog`'s `originalBillDescription` is sourced from `bills.notes` first (which is the audit/notes log — payment-recording code auto-appends entries like "User | date: Paid") and only falls back to `bill_lines.memo`.

## Fix

In `src/components/accounting/TransactionDetailDialog.tsx`, change the source of `originalBillDescription` for `bill_payment` / `consolidated_bill_payment` rows to come **only** from `bill_lines.memo` (the same field Edit Bill exposes as Description and the same field Edit Description already writes to). Stop reading from `bills.notes` entirely for this purpose.

Specifics:
- Remove the `bills.notes` lookup and its fallback branch.
- Query `bill_lines` (`select memo, line_number`) for the resolved `billIds`, ordered by `line_number ascending`. Use the first non-empty memo per bill; if multiple bills (consolidated), join unique non-empty memos with `; `.
- Keep the existing `bills` select for `reference_number`, `total_amount`, and `amount_paid` (still needed for Invoice / Original Bill / Balance rows) — just drop `notes` from the select.
- Run the parsed-history conversion (`getLatestDescription`) as today so if a memo happens to contain structured edit history, the latest entry's content is shown.

This makes the Transaction Details Description a live mirror of the bill's line description: when the bill's Description is edited, the payment's Description updates automatically (same row, same field).

## Files

- `src/components/accounting/TransactionDetailDialog.tsx` — adjust the bill lookup effect only. No DB changes, no other dialogs touched.
