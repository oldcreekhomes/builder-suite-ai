

## Problem
The Source column in the PDF export ("Project_Budget-2026-04-17.pdf") doesn't match the Budget screen for Nob Hill. Examples:

| Cost Code | UI (correct) | PDF (wrong) |
|---|---|---|
| 1010 Lot Costs | Actual | Manual |
| 1020 Closing Costs | Actual | Manual |
| 1040 Land Taxes | Actual | Manual |
| 3180 Sediment & Erosion | Purchase Order | Estimate |
| 3220 Demolition | Purchase Order | Estimate |
| 3340 Earthwork | Purchase Order | Manual |
| 3380 Sanitary | Purchase Order | Manual |

## Root cause
The PDF `getSourceLabel()` switch in two files is missing the `'actual'` and `'purchase-orders'` cases. When `budget_source` is one of those values, the switch returns `undefined`, so the legacy fallback runs and prints the wrong label.

The on-screen `BudgetSourceBadge.tsx` already handles all 7 sources correctly — it's just the print/PDF paths that are stale.

## Fix
Add the two missing cases to `getSourceLabel` in:
1. `src/components/budget/pdf/BudgetPdfDocument.tsx`
2. `src/components/budget/BudgetPrintView.tsx`

```ts
case 'actual': return 'Actual';
case 'purchase-orders': return 'Purchase Order';
```

Also fix the ordering bug in `BudgetPdfDocument.tsx` where the legacy "selected_bid + selected_bid_id → Vendor Bid" check runs *before* `budget_source`. This can mislabel an item whose `budget_source` was changed away from `'vendor-bid'` but still has a `selected_bid_id`. Move the `budget_source` switch ahead of that legacy check (matching the on-screen badge logic).

## Validation
After the change, regenerating the PDF for Nob Hill should show the same Source labels as the on-screen Budget table for every row.

