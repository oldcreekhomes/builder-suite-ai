# Reallocate Family Fire Services bill 1968 to 2401 A/B/C

The $10,980 Family Fire Services invoice (ref 1968, bill date 05/28/26, 4530: Plumbing) at 2401 N Potomac is allocated to 2405 A, 2405 B and 2405 C. It belongs on 2401 A/B/C, split evenly.

The other Family Fire invoice on that screen (ref 2219, $9,600) is already correctly on 2401 A/B/C, so it is untouched.

## What changes

| Line | Now | After |
| --- | --- | --- |
| 1 | 2405 A — $3,660.00 | 2401 A — $3,660.00 |
| 2 | 2405 B — $3,660.00 | 2401 B — $3,660.00 |
| 3 | 2405 C — $3,660.00 | 2401 C — $3,660.00 |

Amounts are already an even split, so only the address changes. Total stays $10,980.00; status, dates, vendor, cost code, PO match and attachments are untouched.

## Technical details

Data-only update (no code changes), scoped to bill `9e2d4956-…`:

1. Repoint the three `bill_lines` rows' `lot_id` to the 2401 A/B/C lot ids.
2. Repoint the three matching debit lines on the bill's journal entry `ddc7cecf-…` (dated 05/28/26) to the same lots. The $10,980 A/P credit line has no lot, so the entry stays balanced.
3. Verify: bill total = sum of lines = $10,980.00, journal debits = credits, and the PO Status hover lists 2401 A/B/C.

Other bills at this project that use 2405 A/B/C are left alone — those addresses are still valid lots on the project.
