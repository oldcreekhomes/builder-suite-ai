

## Show Cents in Budget Currency Formatting

### Problem
Every `formatCurrency` function across 16 budget component files uses `Math.round(amount)` which strips cents. For example, `$1,847.83` displays as `$1,848`.

### Fix
Replace all `Math.round(amount).toLocaleString()` patterns with proper formatting that preserves cents using `Intl.NumberFormat` or `.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.

The consistent replacement pattern:
```typescript
// Before
const formatCurrency = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`;
};

// After  
const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};
```

### Files to Update (16 total)

1. `src/components/budget/BudgetTableRow.tsx`
2. `src/components/budget/BudgetGroupHeader.tsx`
3. `src/components/budget/BudgetGroupTotalRow.tsx`
4. `src/components/budget/BudgetTableFooter.tsx`
5. `src/components/budget/BudgetPrintView.tsx`
6. `src/components/budget/HistoricalOnlyRow.tsx`
7. `src/components/budget/ActualTableFooter.tsx`
8. `src/components/budget/ActualGroupHeader.tsx`
9. `src/components/budget/ActualTableRow.tsx`
10. `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`
11. `src/components/budget/ViewBudgetDetailsModal.tsx`
12. `src/components/budget/BudgetDetailsModal.tsx`
13. `src/components/budget/SelectVendorBidModal.tsx`
14. `src/components/budget/creation/FromBidsTab.tsx`
15. `src/components/budget/creation/FromHistoricalTab.tsx`
16. `src/components/budget/creation/LumpSumTab.tsx`

Note: `BudgetProjectTotalRow.tsx` already uses `Intl.NumberFormat` correctly -- no change needed there.

No database or backend changes required. This is purely a UI formatting fix.

