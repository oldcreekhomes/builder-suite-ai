# Fix Oceanwatch (OW) Atlantic Union Bank reconciliation issues

Two separate problems from Jole's email. Both are confirmed in the data and code.

## Issue 1: Reconciliation Review ending balance does not match (starts Nov 2025)

**Cause (confirmed):** The Reconciliation Review screen puts journal entries on the wrong side. Money that came *into* the bank through a journal entry (the 11/07 Refinance Loan entry, the $102,892.24 wire) shows under "Checks & Bill Payments Cleared" and gets subtracted instead of added. That's why the review's Ending Balance doesn't match the statement, even though the month really is reconciled. The reconciliation itself and the books are correct. Only the review screen is wrong.

**Fix:** In the review screen, journal entries that add money to the bank go under "Deposits Cleared". Journal entries that take money out go under "Checks & Bill Payments Cleared". This fixes every past and future month for every project. No accounting data changes.

## Issue 2: January lump-sum payments show twice in Reconcile Accounts

**Cause (confirmed):** In January, each lump-sum payment was saved once as the lump sum and again as one payment per bill, covering the same bills:
- Carter Lumber: a $22,754.83 lump sum, plus 9 separate payments for the same bills ($1,514.91, $13,590.06, $461.03, $619.46, $3,348.06, $1,913.98, $54.69, $692.59, $560.05).
- ELG Consulting: a $4,957.81 lump sum, plus $3,506.25 and $1,451.56.
- Wasteland: a $1,353.10 lump sum, plus $409.00, $464.29 and $479.81.

The bank balance itself was only reduced once, since each bill has one payment entry, so the totals are right. The duplicate payment records are what make the per-bill rows show up as reconciling items.

**Fix (OW data only, no code change):**
1. Before deleting anything, check that each set of duplicate payments covers exactly the same bills and amounts as its lump sum.
2. Delete the 14 duplicate per-bill payment records. Keep the 3 lump sums.
3. Leave the bills, journal entries and bank balance as they are. None of the duplicates are reconciled, so no closed reconciliation is affected.
4. Check whether other OW months (for example Nov/Dec Carter Lumber) have the same duplicate pattern. Report anything found before touching it.

## Verification
- November 2025 review: Ending Balance should equal the $151,075.33 statement.
- January Reconcile Accounts: only the 3 lump-sum lines show for Carter, ELG and Wasteland.

## Technical details
- `src/components/transactions/ReconciliationReviewDialog.tsx` lines ~412-423 and ~542-553: a manual JE line's bank debit is stored as a positive amount and sent to `allDebits`. Flip it so a bank debit goes to credits/deposits and a bank credit goes to payments.
- Data: delete the `bill_payment_allocations` and `bill_payments` rows for the 14 single-allocation duplicate payment IDs whose bill IDs are already allocated to lump sums `f05acaaf…`, `1f92876e…` and `f097819e…`. Do this only after a query confirms the bill IDs and amounts match.
