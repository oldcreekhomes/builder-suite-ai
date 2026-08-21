# Swap lot allocation on the two Family Fire Services bills

Both Family Fire Services invoices at 2401 N Potomac are pointed at the wrong addresses. They need to swap.

## What changes

Invoice 1968 — $10,980.00, bill date 05/28/26, 4530: Plumbing

| Now | After |
| --- | --- |
| 2405 A — $3,660.00 | 2401 A — $3,660.00 |
| 2405 B — $3,660.00 | 2401 B — $3,660.00 |
| 2405 C — $3,660.00 | 2401 C — $3,660.00 |

Invoice 2219 — $9,600.00, bill date 07/21/26, 4530: Plumbing

| Now | After |
| --- | --- |
| 2401 A — $3,200.00 | 2405 A — $3,200.00 |
| 2401 B — $3,200.00 | 2405 B — $3,200.00 |
| 2401 C — $3,200.00 | 2405 C — $3,200.00 |

Both are already even splits, so only the address changes. Totals, status, dates, vendor, cost code, PO match and attachments are untouched.

## Technical details

Data-only update, no code changes:

1. Bill `9e2d4956-…` (ref 1968): repoint its three `bill_lines` and the three debit lines on journal entry `ddc7cecf-…` (05/28/26) to the 2401 A/B/C lot ids.
2. Bill `81e57d96-…` (ref 2219): repoint its three `bill_lines` and the three debit lines on journal entry `c37b3e09-…` (07/21/26) to the 2405 A/B/C lot ids.
3. The A/P credit line on each entry carries no lot, so both entries stay balanced.
4. Verify: each bill total still equals the sum of its lines ($10,980.00 / $9,600.00), debits equal credits, and the PO Status hover shows the new addresses.

Other bills at this project using 2405 A/B/C are left alone — those are valid lots.
