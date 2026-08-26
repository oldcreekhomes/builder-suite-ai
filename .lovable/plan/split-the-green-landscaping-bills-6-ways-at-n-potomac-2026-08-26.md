# Split the Green Landscaping bills 6 ways at N Potomac

Two of the seven Green Landscaping bills (MSG558 $196.00 and MSG598 $250.00) are already split across all six lots. The other five are split only 3 ways and need to be spread across 2401 A/B/C and 2405 A/B/C.

## What changes

| Invoice | Total | Currently on | After: per-lot amounts (6 lots) |
| --- | --- | --- | --- |
| MSG617 | $75.00 | 2405 A/B/C | $12.50 each |
| MSG618 | $75.00 | 2401 A/B/C | $12.50 each |
| MSG623 | $158.00 | 2401 A/B/C | $26.33 × 5, last lot $26.35 |
| MSG624 | $158.00 | 2401 C + 2405 A/B | $26.33 × 5, last lot $26.35 |
| MSG634 | $666.00 | 2401 A/B/C | $111.00 each |

Cost code (4120: Labor), descriptions, dates, vendor, payment status and each bill's total stay exactly the same. MSG558 and MSG598 are already correct and are left alone.

## Technical details

Data-only change, no code:

1. For each of the five bills, rewrite its `bill_lines` into six rows — one per lot (2401 A/B/C, 2405 A/B/C) — carrying the same cost code, description and quantity 1, with the split amounts above.
2. Rewrite the matching debit lines on each bill's journal entry the same way, so Job Costs mirrors the bill. The A/P credit line is untouched, so each entry stays balanced.
3. Verify each bill total is unchanged ($75 / $75 / $158 / $158 / $666, list total $1,578.00), debits equal credits, and the Address hover shows all 6 lots.
