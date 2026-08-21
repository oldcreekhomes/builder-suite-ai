# Move City Concrete bill 33900 to 2401 A/B/C

The $63,400.00 City Concrete invoice (ref 33900, 4275: Concrete, bill date 06/16/26) at 2401 N Potomac is allocated to 2405 A, 2405 B and 2405 C. It belongs on 2401 A/B/C.

## What changes

The bill has two cost lines per lot; both move over, amounts unchanged:

| Line | Now | After |
| --- | --- | --- |
| Foundation Walls | 2405 A — $18,633.33 | 2401 A — $18,633.33 |
| Planter Box | 2405 A — $2,500.00 | 2401 A — $2,500.00 |
| Foundation Walls | 2405 B — $18,633.33 | 2401 B — $18,633.33 |
| Planter Box | 2405 B — $2,500.00 | 2401 B — $2,500.00 |
| Foundation Walls | 2405 C — $18,633.34 | 2401 C — $18,633.34 |
| Planter Box | 2405 C — $2,500.00 | 2401 C — $2,500.00 |

Per-lot total stays $21,133.33 / $21,133.33 / $21,133.34, bill total stays $63,400.00. Vendor, dates, cost code, PO match and attachments untouched.

## Technical details

Data-only update, no code changes, scoped to bill `10ca8029-…`:

1. Repoint the six `bill_lines` rows' `lot_id` from the 2405 A/B/C lot ids to 2401 A/B/C. Amounts unchanged.
2. Repoint the six matching debit lines on journal entry `30e2a80f-…` (06/16/26) the same way. The $63,400.00 A/P credit line carries no lot, so the entry stays balanced.
3. Verify: bill total = sum of lines = $63,400.00, debits = credits, and the PO Status hover shows 2401 A/B/C.
