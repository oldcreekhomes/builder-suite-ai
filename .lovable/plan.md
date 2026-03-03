

## Fix: Show Cents in Total Project Budget Row

The `BudgetProjectTotalRow.tsx` file uses `Intl.NumberFormat` but explicitly sets `minimumFractionDigits: 0` and `maximumFractionDigits: 0`, which strips cents.

**Change in `src/components/budget/BudgetProjectTotalRow.tsx` (lines 21-27):**

Replace the `formatCurrency` function to use 2 decimal places:
```typescript
const formatCurrency = (amount: number | null) => {
  if (amount === null) return '-';
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};
```

This removes the `minimumFractionDigits: 0` and `maximumFractionDigits: 0` overrides, letting the default `currency: 'USD'` formatting show 2 decimal places.

Single file, single function change.

