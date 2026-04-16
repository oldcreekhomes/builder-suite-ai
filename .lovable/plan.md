

## Fix: Manual allocation "Full amount" showing divided value instead of original total

### Problem
When a manual budget item is saved with "Divide by N lots" mode, the system stores `unit_price = perLotAmount` and `quantity = 1` on each lot row. When the dialog reopens, it initializes `manualUnitPriceInput` from `budgetItem.unit_price` (the per-lot value) and `manualQuantityInput` from `budgetItem.quantity` (1). This means `manualTotal = 1 × perLotAmount`, showing the divided amount as the "Full amount" — which is wrong.

The Vendor Bid tab doesn't have this problem because it reads the original bid price from `matchingBid.price`, which is never overwritten.

### Fix

**File: `src/components/budget/BudgetDetailsModal.tsx`**

In the manual allocation mode inference `useEffect` (lines 190–206), when per-lot mode is detected, reconstruct the original full values by setting the input fields back to the pre-division amounts:

1. When the inference detects per-lot mode (`isNear(savedPrice, basePerLot)` is true), update `manualUnitPriceInput` to `savedPrice * lotCount` and `manualQuantityInput` to `1` — effectively restoring the original total so the UI shows the correct full amount.

Actually, the simpler and more correct approach: since the save stores `quantity=1, unit_price=perLot`, the reconstruction is `originalTotal = savedPrice * lotCount`. Set `manualUnitPriceInput = (savedPrice * lotCount).toString()` and keep `manualQuantityInput = "1"`.

Specifically, inside the inference `useEffect` at ~line 202, after `setManualAllocationMode('per-lot')`, add:
```ts
// Reconstruct original full amount for display
const reconstructedTotal = savedPrice * lotCount;
setManualUnitPriceInput(reconstructedTotal.toString());
```

This way:
- "Full amount" shows the correct original total (e.g. $7,506.66)
- "Divide by 19 lots" shows the correct per-lot amount
- The inputs still reflect the original values the user entered
- On save, the division math produces the same correct per-lot amounts

### Scope
- Single file change
- No database changes
- No new dependencies

