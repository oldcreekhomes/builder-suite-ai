# Fix Oceanwatch May 2026 review, and stop past-month payments being pulled into later months

## What's wrong in May (confirmed)
The May review is off by exactly $29,740.77. The payments you checked off in May are correct: they add up to what the statement shows. The extra $29,740.77 is three older payments from earlier months that are also counted in May:

| Paid | Vendor | Amount | Belongs in |
|---|---|---|---|
| 2/23 | Z.L. Chantry (bill 0001313) | $1,431.00 | February |
| 4/14 | ABC Building Supply (bill 2006163907-001) | $28,244.90 | April |
| 4/15 | Erie Insurance (bill 04152026) | $64.87 | April |

$1,431.00 + $28,244.90 + $64.87 = $29,740.77.

## How it happened
All three bills have a second payment in May: Chantry 5/12, Erie 5/15, and a $0.00 ABC entry on 5/15. Before yesterday's fix, checking off a May payment marked every payment on that bill as cleared in May, including the earlier ones. Those old payments were moved into May, and the review then counted them twice: once in their own month and again in May. That's why it keeps turning up month after month.

There's still a gap in the code. For the $0.00 ABC payment, the closest bank entry is the 4/14 payment, so checking it off can still move April's $28,244.90 into May.

## Fix
1. **Checking off a payment (permanent):** only mark a bank entry that isn't already cleared in another month, and that falls within a few days of that payment's own date. $0.00 payments don't mark any bank entries. Unchecking a payment only clears its own entries.
2. **Review screen (permanent):** if a bill has saved payments, the review counts those saved payments and ignores that bill's loose bank entries. Loose bank entries only count for older bills that have no saved payment. A payment from another month can't show up again.
3. **Fix the data:** move the three entries above back to February and April, where their payments are already cleared. Your bank balance, bills and books don't change.
4. **Check every reconciliation:** run the same review math on every completed reconciliation on every job and compare it to its statement. I'll fix any month with this same pattern the same way. Anything with a different cause, I'll list for you before changing it.

## Verification
- Oceanwatch May 2026 review ends at $18,936.79, with a $0.00 difference.
- November through April still match their statements ($151,075.33 for November, $36,933.39 for February, $99,571.32 for March, $54,378.52 for April).
- New tests: a payment from an earlier month never counts in a later review, and a $0.00 payment never marks a bank entry.

## Technical details
- May rec `79048e28-1e26-4909-85d1-e9e1bbe62704`. Saved payments $162,773.90 + checks $1,738.19 = $164,512.09 = 54,378.52 + 129,070.36 − 18,936.79.
- Mis-tagged JE lines (all currently tagged to May): `e8530d44…` (2/23, retag to Feb rec `6fb4df6c…`), `285b264a…` (4/14) and `a9eb35f2…` (4/15), retag both to April rec `b622f0c5…`. Set `reconciled`, `reconciliation_id` and `reconciliation_date` from the target rec.
- `src/hooks/useBankReconciliation.ts` ~1408-1434: skip when `total_amount = 0`. Restrict candidates to `abs(entry_date − payment_date) ≤ 7` and to lines where `reconciliation_id is null or = this rec`. On uncheck, filter `.eq('reconciliation_id', thisRec)`.
- `src/components/transactions/ReconciliationReviewDialog.tsx` ~506-521: drop JE lines into `ungrouped` only when the bill has no rows in `bill_payment_allocations` at all. This needs one extra allocation lookup by bill IDs, batched.
- Move the "is this JE line represented by a saved payment" rule into `src/lib/reconciliationPaymentRows.ts` and test it with Bun.
- Global audit: for every completed `bank_reconciliations`, run beginning + deposits + credit-side JEs − checks − saved payments − JE lines for bills with no allocations, compare to `statement_ending_balance`, and list the mismatches.
