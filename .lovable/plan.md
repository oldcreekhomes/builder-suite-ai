# Fix February 2026 review: ABC credit missing (Oceanwatch, AUB)

## What's wrong (confirmed)
You're right. The ABC Building Supply payment on 2/26 was $135.37 out of the bank: the $635.89 bill minus the $500.52 credit (2005904779-001). Both parts are saved correctly in the February reconciliation.

The review screen only picks up bill payment entries that take money out. The $500.52 credit puts money back, so the review drops it. It counts the full $635.89 and ends up $500.52 short ($36,432.87 instead of $36,933.39). The reconciliation and the books are correct. Only the review screen is wrong.

## Fix (code only, no data changes)
1. Have the review include credits applied on bill payments, so they reduce the payment total.
2. Show the ABC payment as one $135.37 line, which matches the bank statement. Combine the bill and the credit that were paid together in one payment. Hovering the line shows both: $635.89 bill and ($500.52) credit.
3. The fix applies to every month and project where a credit was used in a payment.

## Verification
- In the February 2026 review, ABC Building Supply on 2/26 shows $135.37.
- Checks & Bill Payments Cleared is $64,972.15. The bottom Ending Balance is $36,933.39, the same as the statement.
- January and March reviews still match their statements.

## Technical details
- `src/components/transactions/ReconciliationReviewDialog.tsx`, bill-payment query (~line 170): remove `.gt('credit', 0)` so the bank-debit "Credit applied" line (`bed83cdd…`, debit 500.52) is included. The existing mapping already turns a debit into a negative amount.
- Group bill-payment JE lines by their consolidated `bill_payments` row. Look up `bill_payments` with this `reconciliation_id` plus their `bill_payment_allocations`, then match each line by bill id and date. Each group becomes one row with the net amount and the per-bill breakdown. Lines that don't match any payment stay as single rows.
- Data checked: payment `21d73ac0…` dated 2026-02-26, total 135.37, allocations 635.89 (bill `6623093a…`) and -500.52 (bill `81991d2a…`).
