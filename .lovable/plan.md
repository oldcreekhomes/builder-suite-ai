# Nob Hill opening journal entry (3/31/2026 QuickBooks cutover)

Data-only change. No code edits.

## The entry

Date 03/31/2026, project 100 Nob Hill Ct, description "Opening Balance - QuickBooks Conversion 3/31/2026".

| Account | Debit | Credit |
|---|---|---|
| 1010 Atlantic Union Bank | 28,208.67 | |
| 1020 Deposits | 4,200.00 | |
| 1430 WIP - Direct Construction Costs (19 lot lines) | 1,921,591.33 | |
| 2530.1 Loan Land - Russell Trust | | 903,000.00 |
| 2530.2 Loan Land - McVeigh 2nd Trust | | 320,000.00 |
| 2905 Equity - OCH | | 731,000.00 |
| **Total** | **1,954,000.00** | **1,954,000.00** |

Accounts Payable is 0.00, so no line is needed.

## WIP split across the 19 lots

Confirmed Nob Hill has exactly 19 lots. Even split with the remainder absorbed on the last lot:

- Lots 1-18: 101,136.39 each (1,820,455.02)
- Lot 19: 101,136.31
- Total: 1,921,591.33

These WIP lines carry the lot but no cost code, since the QuickBooks balance is a single lump. Tell me if you want it broken out by cost code too.

## Verified current state

- Nob Hill has no existing 3/31/2026 opening entry - the only pre-cutover activity is one 2024 bill.
- 2530.1 and 2530.2 both already exist as liability accounts.
- The Atlantic Union opening reconciliation seeded earlier (03/31/2026, ending 28,208.67, nothing checked) is already in place.

## Reconciliation safety

The 1010 line is marked cleared against that 03/31 opening reconciliation. Otherwise the $28,208.67 would reappear as an uncleared item in the April statement and double-count against the $28,208.67 beginning balance.

## Result

The Nob Hill balance sheet as of 03/31/2026 matches the attached QuickBooks report line for line, job costs show the opening WIP per lot, and the April Atlantic Union reconciliation still opens at $28,208.67 with a clean transaction list. The entry appears on the Journal Entries screen at Nob Hill for review.
