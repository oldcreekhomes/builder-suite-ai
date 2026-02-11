
# Fix $0.04 Balance Sheet Imbalance

## Problem
Four bills have bill line sums that exceed their `total_amount` due to rounding during the 50/50 split. Two of those bills also have imbalanced journal entries (debits exceed credits). This creates a $0.04 "Balance Sheet Difference" line.

## What We'll Fix

### Part 1: Fix Bill Line Amounts (4 bills)
For each bill, reduce ONE Lot 1 line's amount by the overage so the lines sum equals `total_amount`:

| Bill (Ref) | Overage | Line to Adjust | Current | New |
|------------|---------|----------------|---------|-----|
| 11893 | $0.04 | Line 1 (e201433b) | $53.13 | $53.09 |
| 12428-413 E Nelson | $0.02 | Line 1 (992d3535) | $53.13 | $53.11 |
| INV-2026-00000996 | $0.01 | Line 5 (c79b1d78) | $0.98 | $0.97 |
| 02022026-413 | $0.01 | Line 1 (a504ddf3) | $2.73 | $2.72 |

### Part 2: Fix Journal Entry Line Amounts (2 journal entries)
Only 2 of the 4 bills have imbalanced journal entries (the other 2 were posted after the useBills.ts fix):

**Bill 11893** (JE f5de9e9d): Debits = $1,190.04, Credits = $1,190.00 -- reduce first Lot 1 debit line (4ca0d35b) from $53.13 to $53.09

**Bill 02022026-413** (JE 0ca0e8bc): Debits = $5.46, Credits = $5.45 -- reduce first debit line (389a319b) from $2.73 to $2.72

### Part 3: No Code Changes Needed
The edge function and useBills.ts were already fixed in the previous update. This is purely a data correction via SQL.

## Result
After the SQL runs, the Balance Sheet will show Total Assets = Total Liabilities and Equity with no "DIFF" line.
