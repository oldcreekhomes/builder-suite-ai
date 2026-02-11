
# Fix: Balance Sheet $0.04 Imbalance from Bill Line Split Rounding

## Root Cause

When we split bill lines 50/50 between lots using `Math.ceil` and `Math.floor`, lines with odd-cent amounts created tiny overages. For example, splitting $106.25 gives Lot 1 = $53.13 (ceil) and Lot 2 = $53.12 (floor) = $106.25 (correct). But splitting $63.75 gives Lot 1 = $31.88 and Lot 2 = $31.87 = $63.75 (correct). The problem occurs when MULTIPLE lines in the same bill all round up by $0.01 -- individually each split is correct, but collectively the bill lines sum exceeds the original total.

The journal entry creation logic (useBills.ts line 193) uses `bill.total_amount` for the A/P credit line but sums individual `line.amount` values for debit lines. When bill_lines sum exceeds total_amount, debits exceed credits, breaking double-entry accounting.

## Three-Part Fix

### 1. Fix the Edge Function (`supabase/functions/split-bill-lines-by-lot/index.ts`)

Replace ceil/floor splitting with a remainder-based approach:
- Lot 1 gets `Math.round(amount / 2 * 100) / 100`
- Lot 2 gets `originalAmount - lot1Amount` (remainder ensures exact sum)
- Same for unit_cost

This guarantees `lot1Amount + lot2Amount === originalAmount` for every line.

### 2. Fix Existing Data (4 bills with mismatched line sums)

Run SQL corrections to adjust the Lot 1 line amounts (the ones that got ceiling) down by the overage. Then fix the corresponding journal entry debit lines to match. Bills to fix:

| Bill | Reference | Lines Sum | Total | Overage |
|------|-----------|-----------|-------|---------|
| f8b175a8 | 11893 | $1,190.04 | $1,190.00 | $0.04 |
| 9c24fbaf | 12428-413 E Nelson | $1,062.52 | $1,062.50 | $0.02 |
| dd67e9d4 | INV-2026-00000996 | $2,001.96 | $2,001.95 | $0.01 |
| 0f1e4c4d | 02022026-413 | $5.46 | $5.45 | $0.01 |

For each bill:
- Find the Lot 1 lines that received the ceiling amount
- Reduce one Lot 1 line's amount by the overage (e.g., reduce by $0.01)
- Find and reduce the corresponding journal entry debit line by the same amount

### 3. Fix Bill Posting Logic (`src/hooks/useBills.ts`)

As a preventive measure, change the A/P credit line calculation (around line 193) to use the **sum of actual line amounts** instead of `bill.total_amount`. This ensures journal entries are always internally balanced regardless of any line amount discrepancies:

```text
Before: const totalAmount = Math.abs(bill.total_amount);
After:  const totalAmount = journalLines.reduce((sum, l) => sum + (l.debit || 0), 0)
                          - journalLines.reduce((sum, l) => sum + (l.credit || 0), 0);
```

This guarantees that debits always equal credits in every journal entry going forward, even if bill_lines have rounding quirks.
