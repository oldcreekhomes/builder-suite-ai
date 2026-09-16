# Move City Concrete invoice 34028 to 2405 A/B/C

The $60,200.00 City Concrete invoice (ref 34028, 4275: Concrete, bill date 07/13/26) at 2401 N Potomac is allocated to lots 2401 A/B/C. It belongs on 2405 A/B/C.

## What changes

Six cost lines move across, amounts unchanged:

| Line | Now | After |
| --- | --- | --- |
| Footing - Walls - Pumps | 2401 A — $16,566.67 | 2405 A — $16,566.67 |
| Footing - Walls - Pumps | 2401 B — $16,566.66 | 2405 B — $16,566.66 |
| Footing - Walls - Pumps | 2401 C — $16,566.67 | 2405 C — $16,566.67 |
| Planter Box (5) - Footing, Walls & Slabs | 2401 A — $3,500.00 | 2405 A — $3,500.00 |
| Planter Box (5) - Footing, Walls & Slabs | 2401 B — $3,500.00 | 2405 B — $3,500.00 |
| Planter Box (5) - Footing, Walls & Slabs | 2401 C — $3,500.00 | 2405 C — $3,500.00 |

Per-lot totals stay $20,066.67 / $20,066.66 / $20,066.67; bill total stays $60,200.00. Vendor, dates, cost code, status, PO match and attachments untouched.

## Technical details

Data-only update, no code changes, scoped to bill `fed420c9-…`:

1. Repoint the six `bill_lines` rows' `lot_id` from the 2401 A/B/C lot ids to the 2405 A/B/C ids (A→A, B→B, C→C). Amounts unchanged.
2. This bill is currently in `void` status and has no journal entries attached, so no journal lines need repointing.
3. Verify: bill total still equals the sum of its lines ($60,200.00) and the Address hover shows 2405 A/B/C.

Note: the bill shows as void today. If you also want it re-posted with a journal entry, say so before approving and I'll add that step.
