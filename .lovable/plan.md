# Fix $0.01 Rounding on Bill 34069 (City Concrete, N Potomac 2405)

## Issue
Two line groups on bill 34069 are a penny off because the even 3-way lot split doesn't divide cleanly:

- **Backfill - 3 Units**: 3 x $533.33 = $1,599.99 (should be $1,600.00)
- **Interior Concrete - Basement Slabs (3 Units) - Pump**: 3 x $4,466.67 = $13,400.01 (should be $13,400.00)

The penny errors cancel out, so the bill header total of $19,900.00 is already correct. The bill is in void status with no journal entries, so only the bill lines need adjustment.

## Data fix (lot C absorbs the remainder)

- Backfill - 3 Units: 2405 A $533.33, 2405 B $533.33, **2405 C $533.34** -> group total $1,600.00
- Basement Slabs - Pump: 2405 A $4,466.67, 2405 B $4,466.67, **2405 C $4,466.66** -> group total $13,400.00
- Each line's `unit_cost` is updated to match its `amount` (quantity is 1 per line)
- Bill header total stays $19,900.00 - unchanged
- All other lines (Exterior Draintile, Garage Slabs) untouched

## Technical details
- Table: `bill_lines` - 2 row updates by id: `d2eb1875-0668-42fb-8771-e0e9b19e08fa` (backfill, lot C -> 533.34) and `e2d798dc-f1e3-4d47-abef-9e9e8958f611` (pump, lot C -> 4466.66)
- Executed as a data update; no schema change, no app code change
- After the update, re-query to verify each group sums exactly and the bill total still equals $19,900.00
