# Princess Street: 11 lots to 4 lots

1020 Princess Street currently has 11 lots. Every job-cost transaction was split 11 ways. The goal is to re-split each transaction evenly across Lots 1-4 (last lot absorbs the rounding remainder), remove Lots 5-11, and set the project to 4 lots.

## What is in the data today

- 17 bills, each split across all 11 lots (188 bill lines total, $31,385.87 gross)
- 165 job-cost journal entry lines carrying lot ids (the accounting mirror of those bills)
- 11 check lines ($12.00) and 11 deposit lines ($12.00), one per lot
- 44 pending (ML-staged) bill lines across 4 uploads, split 11 ways
- 61 budget rows, all already on Lot 1 - no change needed

## Reallocation approach

For each document (bill, check, deposit, journal entry, pending upload) and each cost code within it:

1. Take the current total across all 11 lots - this amount never changes.
2. Re-split evenly across Lots 1-4: base = floor(total / 4) to the cent for the first three lots, Lot 4 takes total minus the first three so the pennies always tie back exactly.
3. Update the Lot 1-4 lines in place with the new amount (and matching unit cost where quantity is 1), then delete the Lot 5-11 lines.
4. Debit/credit sides of every journal entry are re-split with the same remainder rule so each entry stays balanced to the cent.

Document header totals (bill totals, check totals, deposit totals, journal entry totals) stay identical, so no register, Balance Sheet, A/P, or reconciliation figure moves. Only the per-lot distribution changes.

Bills in every status are included (paid, posted, draft, and the one void bill) so the lot breakdown is consistent everywhere. Payment records and their journal entries are untouched.

## Then the lot structure

- Verify no remaining rows anywhere reference Lots 5-11 (bill lines, pending lines, journal lines, check lines, deposit lines, budgets, budget manual lines, takeoff/estimate rows).
- Delete Lots 5 through 11.
- Set `projects.total_lots = 4` so budget, bill entry, PO, and allocation screens only offer 4 lots going forward.

## Verification before finishing

- Total dollars per bill, check, deposit, and journal entry before vs after are identical.
- Each remaining lot holds roughly a quarter of the project's job costs, with the difference between lots never more than a few cents.
- Every journal entry still has debits equal to credits.
- 126-style balance checks: the project Balance Sheet and Job Costs totals are unchanged.
