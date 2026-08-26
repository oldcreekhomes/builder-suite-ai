# Move City Concrete bill 34069 from 2401 lots to 2405 lots

The $19,900.00 City Concrete invoice (ref 34069, bill date 07/23/26) at 2401 N Potomac is allocated to lots 2401 A/B/C. It belongs on 2405 A/B/C, with the same A/B/C split.

## What changes

| Cost code | Lot now | Lot after | Amount |
| --- | --- | --- | --- |
| 4200 Excavation, Backfill & Grading | 2401 A | 2405 A | 533.33 |
| 4200 | 2401 B | 2405 B | 533.33 |
| 4200 | 2401 C | 2405 C | 533.33 |
| 4275 Concrete | 2401 A | 2405 A | 700.00 + 4,466.67 |
| 4275 Concrete | 2401 B | 2405 B | 700.00 + 4,466.67 + 1,400.00 |
| 4275 Concrete | 2401 C | 2405 C | 700.00 + 4,466.67 + 1,400.00 |

Per-lot totals stay as they are today: 2405 A $5,700.00, 2405 B $7,100.00, 2405 C $7,100.00. Bill total stays $19,900.00. Amounts, cost codes, dates, vendor, status and attachments are untouched — only the address changes.

## Technical details

Data-only update (no code changes), scoped to bill `cc9d4a23-…`:

1. Update the 11 `bill_lines` rows, repointing `lot_id` from the 2401 A/B/C ids to the 2405 A/B/C ids (A→A, B→B, C→C).
2. This bill currently has no journal entries attached (it is in `void` status), so no journal lines need repointing.
3. Verify afterwards: bill total still equals the sum of its lines ($19,900.00) and the Address hover shows 2405 A/B/C.

If you also want this bill brought out of void and re-posted with a journal entry, say so before approving and I'll add that step.
