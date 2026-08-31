# Fix the 4-cent overage on Wire Gill bill 12428-412 E Nelson

## What's going on

The payment is right ($2,125.00). The bill itself is wrong: it totals **$2,125.04**.

The invoice was split across two lots, and each half was rounded **up** independently instead of one half absorbing the remainder. Three of the six time entries got over-rounded:

| Entry | Correct | Currently posted | Over by |
| --- | --- | --- | --- |
| 1/5 - Transmittal to T. LaColla... | $212.50 | $212.52 (4 x $53.13) | $0.02 |
| 1/6 - Prep for and attend Planning Commission... | $318.75 | $318.76 (2 x $159.38) | $0.01 |
| 1/6 -Prep for and attend Planning Commission... (duplicate memo spelling) | $318.75 | $318.76 (2 x $159.38) | $0.01 |

The other three entries ($425.00 each) are exact. 0.02 + 0.01 + 0.01 = the extra **$0.04**.

## The fix

1. For each over-rounded entry, drop one cent from a single lot line so the group sums to the exact amount:
   - 1/5 entry: two of the four $53.13 lines become $53.12 → group = $212.50
   - each 1/6 entry: one of the two $159.38 lines becomes $159.37 → group = $318.75
2. Recompute the bill total to **$2,125.00**, which then equals the $2,125.00 already paid, clearing the balance.
3. Apply the identical cent adjustments to the matching job-cost lines in the journal entry so Job Costs, the account register, and the bank register all agree.
4. Verify the journal entry still balances (debits = credits) and the bill shows fully paid with a $0.00 remaining balance.

## Technical detail

Data-only change on this one bill: update `bill_lines.amount` (unit cost and quantity unchanged; the rounding lives in the stored amount), update `bills.total_amount` to 2125.00, and mirror the same per-line cent changes in `journal_entry_lines` for the bill's job-cost debit lines. The offsetting A/P credit line is adjusted by the same $0.04 so the entry stays balanced. No schema or code changes.

## Note

This is the same lot-rounding pattern seen on earlier bills — the remainder should land on the last lot instead of every lot rounding up. If you want, I can follow up separately with a scan for other bills whose lot splits don't sum back to their invoice total.
