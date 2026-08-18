# Fix penny error on Edit Bill line total

## What's wrong

The Dominion Energy bill (ref 08062026-Longview SFD) is stored as two lot lines, each with quantity 0.50 and unit cost 223.21. Each line's amount was rounded up on its own (0.50 x 223.21 = 111.605 -> 111.61), so the grouped row that displays "1.00 x 223.21" totals 111.61 + 111.61 = $223.22 instead of $223.21. The bill header total is also stored as 223.22.

## The fix

1. Line grouping math (`src/lib/billLineMath.ts`)
   - For lot-distributed groups where every child shares the same unit cost, compute the group amount as round(totalQuantity x unitCost) instead of summing separately-rounded child amounts. This makes the displayed row total always equal what the user sees: quantity x unit cost.
   - Keep the existing sum-of-children behavior only for the mixed-rate case (a remainder lot deliberately carrying a different per-lot rate), so those rows still reconcile.

2. Save-time distribution (Edit Bill dialog)
   - When splitting a group across lots on save, distribute the group's rounded total across children with cent-precise remainder math (e.g. 111.61 and 111.60) so the child amounts sum exactly to the row total and the bill header total.

3. Repair the existing record
   - Correct the two stored bill lines and the bill's total so the bill reads $223.21, matching the invoice.

## Scope

Display grouping + save distribution only. No change to how bills post to the general ledger beyond the corrected cent amounts, and no change to any other dialog behavior.
