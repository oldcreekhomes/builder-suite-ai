# Reallocate Family Fire Services bill 2102 to 2401 A/B/C

The $10,980 Family Fire Services invoice (ref 2102, 4530: Plumbing) at 2401 N Potomac is currently allocated to lots 2405 A, 2405 B and 2405 C. It belongs on 2401 A, 2401 B and 2401 C, split evenly.

## What changes

| Line | Now | After |
| --- | --- | --- |
| 1 | 2405 A — $3,733.20 | 2401 A — $3,660.00 |
| 2 | 2405 B — $3,623.40 | 2401 B — $3,660.00 |
| 3 | 2405 C — $3,623.40 | 2401 C — $3,660.00 |

Bill total stays $10,980.00. Payment status, dates, vendor, cost code and attachments are untouched.

## Technical details

Data-only update (no code changes), scoped to bill `e02c499b-…`:

1. Update the three `bill_lines` rows: repoint `lot_id` to the 2401 A/B/C lot ids and set each `amount` to 3660.00.
2. Update the matching three debit lines on the bill's job-cost journal entry (`0d9a482c-…`, dated 06/25/26): same lot repointing and debit amounts of 3660.00 each. The $10,980 A/P credit line is unchanged, so the entry stays balanced.
3. The two payment journal entries dated 08/03/26 carry no lot allocation, so they need no change.
4. Verify afterwards: bill total = sum of lines = $10,980.00, journal entry debits = credits, and the PO Status hover shows 2401 A/B/C.
