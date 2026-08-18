# Correct the Dominion Energy bill to one lot and one line

## What the data actually shows

126 Longview Drive has exactly **one** lot. The bill does not reference two lots; it has two duplicate database lines that both point to the same Lot 1. Those two lines were recreated together on August 17 and each holds half the quantity:

```text
line 1: lot 18d5f475  qty 0.50  unit 223.21  amount 111.61
line 2: lot 18d5f475  qty 0.50  unit 223.21  amount 111.61
```

The dialog correctly collapses them into one displayed row (1.00 x 223.21), but the total is the sum of the two stored amounts. Each half was rounded up on its own (111.605 -> 111.61), so the total lands on $223.22 and the bill header total was stored as 223.22 too.

This is a duplicate-line problem, not a two-lot project.

## The fix

1. Delete one of the two duplicate Lot 1 lines.
2. Change the remaining Lot 1 line to quantity 1.00, unit cost 223.21, and amount 223.21.
3. Change the bill total to 223.21.
4. Verify the Edit Bill dialog shows one line for Lot 1 and a $223.21 total.

## Scope

One-time correction of this bill only. The bill is void and has no journal entry, so no ledger record needs adjustment. No application-wide lot or calculation changes.
