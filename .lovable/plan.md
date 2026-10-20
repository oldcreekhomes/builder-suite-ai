# Reconciliation Review: is the fix permanent?

## Short answer
- **Going forward: yes.** When you check off a payment that used a credit, the bill and the credit are now both marked as cleared, for that payment only. The review shows the amount actually paid (bills minus credits), which matches the bank statement. You won't need to fix new reconciliations by hand.
- **Past reconciliations: mostly done.** I already went back through past months and fixed 23 bank entries where a credit had been left out. All Oceanwatch months from November through March now match their statements.
- **What's left:** about 11 past months still don't match. These are older problems that the new fix can't fix on its own, such as Oceanwatch April, where the 5/15 Erie Insurance $64.87 payment is marked as cleared in April, and a $4,950.00 payment dated 11/10 marked as cleared in October. They need one-by-one review because they look like duplicate payments or payments marked in the wrong month.

## Proposed next step: clean up the remaining months
1. Go through every completed reconciliation, on every job, where the bottom ending balance doesn't equal the statement.
2. For each one, list the exact items causing the difference: a payment from a different month, a duplicate payment, or a missing credit.
3. Send you the list (job, month, item, amount) before changing anything.
4. After you approve, fix each item: move it to the right month or remove the duplicate payment and its bank entry. Then confirm each month matches and the next month starts from the right balance.

## Verification
- Every completed reconciliation's review ending balance equals its statement ending balance, with a $0.00 difference.
- Bank balances and the books only change where a true duplicate payment is removed, and only with your approval.

## Technical details
- Audit query: for each `bank_reconciliations` row with status completed, compute beginning + cleared deposits − cleared payments (saved `bill_payments.total_amount` for consolidated payments, bank JE lines otherwise) and compare to `statement_ending_balance`.
- Known items: OW April (Erie $64.87, dated 5/15, tagged to April) and $4,950.00 dated 11/10 tagged to October. About 9 more months across projects 350e5951, 494d, 691271, 8bf27, a50ae and e5439.
