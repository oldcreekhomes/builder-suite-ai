

## Fix: Balance Sheet Totals Not Including the Difference Adjustment

### Root Cause

In both `BalanceSheetContent.tsx` and `BalanceSheet.tsx`, the code:
1. Calculates `totalEquity` from the equity array
2. Computes the difference between Assets and (Liabilities + Equity)
3. Adds a "Balance Sheet Difference" row to the equity array
4. Returns the **old** `totalEquity` that was computed **before** adding the difference row

This means the "Total Equity" and "Total Liabilities & Equity" displayed in the UI never include the balancing adjustment, so the totals appear unbalanced.

### Fix

In both files, recalculate `totalEquity` after potentially adding the difference line, so the returned total always matches the sum of all equity rows.

**File: `src/components/reports/BalanceSheetContent.tsx` (lines 217-240)**

- Move `totalEquity` calculation (or add a recalculation) to after the difference line is potentially added
- Change `return { ... totalEquity }` to use the updated value

**File: `src/pages/BalanceSheet.tsx` (lines 172-197)**

- Same fix: recalculate `totalEquity` after the difference line addition

Concretely, in both files, after the `if (Math.abs(difference) > 0.01)` block, add:

```typescript
const finalTotalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);
```

And return `finalTotalEquity` instead of `totalEquity`.

### Why This Works

The difference line adds exactly `totalAssets - totalLiabilities - totalEquity` to equity. So:

finalTotalEquity = totalEquity + difference = totalEquity + (totalAssets - totalLiabilities - totalEquity) = totalAssets - totalLiabilities

Therefore: totalLiabilities + finalTotalEquity = totalAssets. Always balanced.

### Files Changed
| File | Change |
|------|--------|
| `src/components/reports/BalanceSheetContent.tsx` | Recalculate totalEquity after difference line, return updated value |
| `src/pages/BalanceSheet.tsx` | Same fix |
