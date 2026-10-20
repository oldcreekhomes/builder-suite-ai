# Permanent fix: vendor credits missing from Reconciliation Review

## What's wrong (confirmed)
March 2026 at Oceanwatch is off by exactly $2,714.97, which is Jole's three credits ($58.73 + $1,150.12 + $1,506.12). The reconciliation itself is correct ($99,571.32, $0.00 difference). Only the review screen is wrong.

The real cause is in the step that runs when a payment is checked off in Reconcile Accounts. It marks the bill side of a payment as cleared, but it skips the credit side. In February the ABC credit happened to get marked, so yesterday's fix worked there. In March none of the three credits were marked, so the review still leaves them out.

The same thing is happening in 4 other months:
- Oceanwatch, November 2025: $5,490.03 in credits
- 3 other jobs (January, August and September 2026): $350.00, $3,200.00 and $4,731.25

The same step also marks every payment on a bill, not only the one being checked off. That's how the 5/12 Z.L. Chantry payment ended up in February.

## Fix
1. **Checking off a payment:** mark the whole payment as cleared, bills and credits, and only the entries dated on that payment's date. This stops new months from breaking and stops payments from other months getting pulled in.
2. **Review screen:** show each combined payment at its saved payment amount ($1,918.08 on 3/12, $1,499.60 on 3/27, and so on), which is what the bank statement shows. Use the bill and credit lines only for the hover breakdown. The review will be right even if older entries were marked wrong.
3. **Fix past months:** mark the missing credit entries in the 5 months listed above so they're cleared in the same month as their payment. The bank balance and the books don't change.
4. **Two misplaced items to report, not change:** Erie Insurance $64.87 dated 5/15 is marked cleared in April at Oceanwatch, and a $4,950.00 payment dated 11/10 is marked cleared in October at another job. I'll list them for you to decide.

## Verification
- Oceanwatch March 2026 review: the bottom shows $99,571.32.
- February still shows $36,933.39, and November still shows $151,075.33.
- The other 3 jobs' reviews for those months match their statements.
- I'll add a test for combined payments: a $635.89 bill with a $500.52 credit shows as $135.37, and a payment's total always equals its saved amount.

## Technical details
- `src/hooks/useBankReconciliation.ts` ~1390-1424 (`consolidated_bill_payment` branch): remove `.gt('credit', 0)`; restrict JE lookup to `entry_date = bill_payments.payment_date`; tag both debit and credit bank lines for every allocated bill.
- `src/components/transactions/ReconciliationReviewDialog.tsx`: build rows for `bill_payments` where `reconciliation_id` = this reconciliation, with amount = `total_amount`, breakdown from allocations and bill lines. Skip JE-path lines whose `(source_id, entry_date)` belong to those payments so nothing counts twice. Move the grouping into a pure helper in `src/lib/` with a vitest file.
- Data backfill (one-off update): set `reconciled`, `reconciliation_id` and `reconciliation_date` from the parent `bill_payments` row on bank-account `journal_entry_lines` of `source_type='bill_payment'` JEs whose `source_id` is an allocated bill and `entry_date = payment_date`, where the tag differs. Affected: 5 reconciliations, 9 lines.
- Misplaced lines to report: OW Erie `03efaa07…` (5/15 tagged to 4/30 rec), project `a50ae540…` source `54bd6a17…` (11/10 tagged to 10/31 rec).
