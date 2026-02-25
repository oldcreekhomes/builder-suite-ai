
## Fix: Price History Changes Should Update Table, Edit Dialog, and Chart Instantly

### Problem
When adding a historical price in the Price History Manager (the Sheet/side panel opened from the Edit Cost Code dialog), the database is updated but nothing in the UI refreshes -- the table, the edit dialog's price field, and the price chart all show stale data until a manual page refresh.

### Root Cause
`PriceHistoryManager` component has no callback prop to notify parent components that a price was added. It updates the database (both `cost_code_price_history` and `cost_codes.price`) but never triggers a re-fetch of the cost codes list or chart data.

### Fix

**1. `src/components/settings/PriceHistoryManager.tsx`**
- Add an `onPriceUpdate` callback prop to the interface
- Call `onPriceUpdate()` after successfully adding a historical price (after the DB updates on line ~240)

**2. `src/components/EditCostCodeDialog.tsx`**
- Add an `onPriceUpdate` callback prop to the interface
- Pass it through to `PriceHistoryManager` as `onPriceUpdate`
- When `onPriceUpdate` fires, also update the local `formData.price` state so the price field in the edit dialog reflects the new price immediately

**3. `src/pages/Settings.tsx`**
- Pass the existing `fetchCostCodes` function (or equivalent refetch) as `onPriceUpdate` to `EditCostCodeDialog`, so the table refreshes when a historical price is added

### Data Flow After Fix
```text
User adds price in PriceHistoryManager
  -> DB updated (history + cost_codes.price)
  -> onPriceUpdate() called
    -> EditCostCodeDialog updates its local price field
    -> Settings.tsx re-fetches cost codes -> table updates
    -> PriceHistoryModal chart will show new data on next open
```

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/PriceHistoryManager.tsx` | Add `onPriceUpdate` prop, call it after successful price insert |
| `src/components/EditCostCodeDialog.tsx` | Add `onPriceUpdate` prop, pass to PriceHistoryManager, update local form state |
| `src/pages/Settings.tsx` | Pass `fetchCostCodes` as `onPriceUpdate` to EditCostCodeDialog |
