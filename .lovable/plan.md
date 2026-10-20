# Fix Oceanwatch AUB April 2026 review, then check every other reconciliation

## Short answer
- **Going forward, the fix is permanent.** Payments that use credits now count at the amount actually paid, and checking off a payment clears only that payment.
- **Older months can still have bad data from before the fix.** These need a one-time cleanup, which I'll do for all reconciliations.

## April: what's wrong (confirmed)
The April review is off by exactly $64.87.
- The Erie Insurance bill 04152026 ($64.87) was paid twice: once on 4/15 and again on 5/15.
- Both bank entries are marked as cleared in April. Only the 4/15 one belongs there, because a 5/15 payment can't clear on an April statement.

## Fix
1. Unmark the 5/15 Erie $64.87 entry from April. After that, the April review should end at $54,378.52, the same as the statement.
2. The 5/15 payment looks like a duplicate of the 4/15 one, because there's one bill and two payments. Check it against the May bank statement:
   - If $64.87 didn't come out in May, delete the duplicate 5/15 payment and its bank entry so the bank balance and bills owed are right.
   - If it did come out, leave it so it can be cleared in May.
   - I'll report what I find before deleting anything.
3. Run the same check across every completed reconciliation on every job. Find each month where the bottom of the review doesn't match the statement, and list the items causing it (job, month, item, amount). That includes the $4,950.00 payment dated 11/10 that's marked as cleared in October.
4. Fix the items you approve, the same way, and confirm each month shows a $0.00 difference.

## Verification
- The Oceanwatch April review ends at $54,378.52, with a $0.00 difference.
- November through March still match their statements.
- After the cleanup, every completed reconciliation's review matches its statement.

## Technical details
- April reconciliation `b622f0c5-a8a8-416c-bc16-fe6f9f578b94`. Clear `reconciliation_id` on the bank JE line dated 2026-05-15, credit 64.87, memo "Payment for bill 04152026".
- Bill payments: `0300c4aa…` (4/15, reconciled in April) and `feb7a65c…` (5/15, not reconciled), both for 64.87 on the same bill.
- Audit: for each completed `bank_reconciliations` row, compute beginning + cleared deposits − cleared payments, the same way the review does, and compare to `statement_ending_balance`. Flag any tagged lines dated after the statement date.
