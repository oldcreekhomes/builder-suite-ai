
## Fix: Table and Price Graph Not Updating After "Update Cost Code"

### Problem
After clicking "Update Cost Code" in the edit dialog, the table price and the price history graph don't reflect the new value until a manual page refresh.

### Root Cause
In `EditCostCodeDialog.tsx`, the `handleSubmit` function calls `onUpdateCostCode()` **without awaiting it**, then immediately closes the dialog. The database update and state refresh happen in the background, but the dialog closure and re-render timing cause the UI to show stale data. Additionally, the `onUpdateCostCode` prop is typed as returning `void` instead of `Promise<void>`, hiding the async nature.

### Fix

**File: `src/components/EditCostCodeDialog.tsx`**

1. Update the `onUpdateCostCode` prop type from `void` to `Promise<void>`
2. Make `handleSubmit` an async function
3. `await` the `onUpdateCostCode` call before closing the dialog

This ensures the database write and `fetchCostCodes()` complete before the dialog closes, so the table immediately reflects the new price.

**File: `src/hooks/useCostCodes.tsx`** (no change needed -- `updateCostCode` already calls `setCostCodes` and `fetchCostCodes` which will re-render the table with the updated price)

**File: `src/components/settings/PriceHistoryModal.tsx`** (no change needed -- the graph re-fetches history each time it opens, and the new price history entry is already inserted during `updateCostCode`)

### Summary
One file changed, three lines modified. The table and graph will update instantly after clicking "Update Cost Code."
