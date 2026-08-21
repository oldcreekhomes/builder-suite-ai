# Move City Concrete bill 33968 to 2401 A/B/C

The $24,750.00 City Concrete invoice (ref 33968, bill date 06/30/26) at 2401 N Potomac is allocated to 2405 A/B/C. It belongs on 2401 A/B/C.

## What changes

Twelve cost lines (four per lot) move across, amounts unchanged:

| Line | Now | After |
| --- | --- | --- |
| Backfill - 3 units | 2405 A — $533.33 | 2401 A — $533.33 |
| Exterior Draintile | 2405 A — $766.67 | 2401 A — $766.67 |
| Interior Concrete - Basement Slabs | 2405 A — $5,500.00 | 2401 A — $5,500.00 |
| Interior Concrete - Garage Slab | 2405 A — $1,450.00 | 2401 A — $1,450.00 |
| Backfill - 3 units | 2405 B — $533.33 | 2401 B — $533.33 |
| Exterior Draintile | 2405 B — $766.67 | 2401 B — $766.67 |
| Interior Concrete - Basement Slabs | 2405 B — $5,500.00 | 2401 B — $5,500.00 |
| Interior Concrete - Garage Slab | 2405 B — $1,450.00 | 2401 B — $1,450.00 |
| Backfill - 3 units | 2405 C — $533.34 | 2401 C — $533.34 |
| Exterior Draintile | 2405 C — $766.66 | 2401 C — $766.66 |
| Interior Concrete - Basement Slabs | 2405 C — $5,500.00 | 2401 C — $5,500.00 |
| Interior Concrete - Garage Slab | 2405 C — $1,450.00 | 2401 C — $1,450.00 |

Per-lot totals stay $8,250.00 / $8,250.00 / $8,250.00; bill total stays $24,750.00. Vendor, dates, cost codes (4200 and 4275), PO match and attachments untouched.

## Technical details

Data-only update, no code changes, scoped to bill `36139219-…`:

1. Repoint the twelve `bill_lines` rows' `lot_id` from the 2405 A/B/C lot ids to 2401 A/B/C. Amounts unchanged.
2. Repoint the twelve matching debit lines on journal entry `85ff7a98-…` (06/30/26) the same way. The $24,750.00 A/P credit line carries no lot, so the entry stays balanced.
3. Verify: bill total = sum of lines = $24,750.00, debits = credits, and the PO Status hover shows 2401 A/B/C.
