# Nob Hill opening journal entry (3/31/2026 QuickBooks cutover)

Data-only change. No code edits.

## The entry

Date 03/31/2026, project 100 Nob Hill Ct, description "Opening Balance - QuickBooks Conversion 3/31/2026".

| Account | Debit | Credit |
|---|---|---|
| 1010 Atlantic Union Bank | 28,208.67 | |
| 1020 Deposits | 4,200.00 | |
| 1430 WIP - Direct Construction Costs | 1,921,591.33 | |
| 2530.1 Loan Land (Russell Trust) | | 903,000.00 |
| 2530.2 Loan Land (McVeigh 2nd Trust) | | 320,000.00 |
| 2905 Equity - OCH | | 731,000.00 |
| **Total** | **1,954,000.00** | **1,954,000.00** |

Accounts Payable is 0.00, so no line is needed.

## Verified current state

- Nob Hill has no existing 3/31/2026 opening entry - the only pre-cutover activity is one 2024 bill.
- 2520 does not exist in this chart of accounts; per your direction Russell Trust goes to 2530.1 and McVeigh to 2530.2 (both already exist and are liability accounts).
- The Atlantic Union opening reconciliation seeded earlier (03/31/2026, ending 28,208.67, nothing checked) is already in place.

## Two calls I'm making unless you say otherwise

1. **WIP as a single line, no cost code or lot.** Keeps the balance sheet exactly $1,921,591.33. It will not appear in job cost detail by cost code. Say the word if you want it split across cost codes or lots instead.
2. **The 1010 line is marked cleared against the 03/31 opening reconciliation.** Otherwise the $28,208.67 would show up again as an uncleared item in the April statement and double-count against the $28,208.67 beginning balance.

## Result

The Nob Hill balance sheet as of 03/31/2026 matches the attached QuickBooks report line for line, and the April Atlantic Union reconciliation still opens at a $28,208.67 beginning balance with a clean transaction list. The entry appears on the Journal Entries screen at Nob Hill for review.
