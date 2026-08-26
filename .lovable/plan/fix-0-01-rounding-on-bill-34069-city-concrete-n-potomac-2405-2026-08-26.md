# Fix $0.01 Rounding on Bill 34069 (City Concrete, N Potomac 2405)

## Issue
Two line groups on bill 34069 are a penny off because the even 3-way lot split doesn't divide cleanly:

- **Backfill – 3 Units**: 3 × $533.33 = $1,599.99 (should be $1,600.00)
- **Interior Concrete – Basement Slabs (3 Units) – Pump**: 3 × $4,466.67 = $13,400.01 (should be $13,400.00)

The penny errors cancel out, so the bill total of $19,900.00 is already correct — no journal entry exists (bill is void), so only the bill lines need adjustment.

## Data fix (per line group, lot C absorbs the remainder)

- Backfill – 3 Units: lot 2405 A $533.33, lot 2405 B $533.33, **lot 2405 C $533.34** → group total $1,600.00
- Basement Slabs – Pump: lot 2405 A $4,466.67, lot 2405 B $4,466.67, **lot 2405 C $4,466.66** → group total $13,400.00
- Update each line's `unit_cost` to match its `amount` (quantity is 1 per line)
- Bill header total stays $19,900.00 — unchanged

## Technical details
- Table: `bill_lines` — 6 row updates by id (backfill ids: e97f242d…, daafb73c…, d2eb1875…; pump ids: 3bed8b81…, 7954c76e…, e2d798dc…)
- Executed via a data update (run_sql); no schema change, no app code change
- After the update, re-query to verify each group sums exactly and the bill total still equals $19,900.00
