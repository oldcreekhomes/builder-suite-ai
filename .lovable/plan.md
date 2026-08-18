# Fix the $223.22 vs $223.21 total on the Dominion Energy bill

## What the data actually shows

126 Longview Drive has exactly **one** lot. But this bill (ref 08062026-Longview SFD) was written to the database as **two** bill lines, both pointing at that same single lot, each with quantity 0.50 and unit cost 223.21:

```text
line 1: lot 18d5f475  qty 0.50  unit 223.21  amount 111.61
line 2: lot 18d5f475  qty 0.50  unit 223.21  amount 111.61
```

The dialog correctly collapses them into one displayed row (1.00 x 223.21), but the total is the sum of the two stored amounts. Each half was rounded up on its own (111.605 -> 111.61), so the total lands on $223.22 and the bill header total was stored as 223.22 too.

So there are two defects: the bill was split across lots that don't exist, and the split rounding adds a penny.

## The fix

1. Repair this bill
   - Collapse it back to a single line: quantity 1.00, unit cost 223.21, amount 223.21, and set the bill total to 223.21. Update the matching journal entry lines so the ledger stays balanced at the corrected amount.

2. Stop the phantom split (lot distribution)
   - When a project has only one lot, a line must never be divided — write one line at full quantity instead of N fractional lines.
   - Never create more child lines than the project has lots.

3. Stop the penny drift when a split is legitimate (multiple real lots)
   - Distribute the row's rounded total across children using cent-precise remainder math (e.g. 111.61 + 111.60 = 223.21) instead of rounding each child independently.
   - In the grouped display, when all children share the same unit cost, compute the row total as round(total quantity x unit cost) so the row always equals what the user sees.

## Scope

Edit Bill line math, lot-distribution on save, and a one-time data correction for this bill. No change to how bills post to the ledger beyond the corrected cent amounts.
