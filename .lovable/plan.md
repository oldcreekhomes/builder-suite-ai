
Do I know what the issue is? Yes.

The current Manual reopen logic is wrong in two ways:

1. It tries to infer “per-lot” from the already-divided row values, so it effectively divides twice.
2. Even if that inference worked, `savedPrice * lotCount` is still wrong on the remainder lot, which is why values drift on examples like `$142,626 ÷ 19`.

That is why Vendor Bid behaves correctly and Manual does not: Vendor Bid still has a true original total source (`matchingBid.price`), while Manual is trying to rebuild the total from one split row.

## Fix

**File:** `src/components/budget/BudgetDetailsModal.tsx`

1. Add a query for all sibling `project_budgets` rows for the same `project_id + cost_code_id` when the dialog opens.
2. Reconstruct the Manual full amount from the sibling rows, not from the currently opened row:
   - sum all sibling row totals with cent-precise math
   - compute expected `basePerLot` and `remainderPerLot` from that summed total
   - detect per-lot mode only if the sibling rows match that split pattern
3. Replace the current broken Manual inference effect with a rehydration effect that, when the sibling pattern confirms a split:
   - sets `manualAllocationMode = 'per-lot'`
   - sets `manualQuantityInput = "1"`
   - sets `manualUnitPriceInput` to the reconstructed full total
4. If the sibling rows do not match the split pattern, leave Manual in normal full mode and use the current row’s saved values.
5. Keep the existing save/write behavior for the actual lot-row updates; this fix is about correct reopen/display behavior.

## Why this fixes your exact bug

For a 19-lot manual allocation:
- each lot row stores either the standard per-lot amount or the last-row remainder
- reopening from the remainder row must use the **sum of all 19 lot rows** as the full amount
- it must **not** use `currentRowAmount * 19`

So reopening will correctly show:
- Full amount = `$142,626.00`
- Divide by 19 lots = based on `$142,626.00`
- no drift depending on which lot row was opened

## Technical details
- Use cent math when summing sibling rows
- Match against both:
  - `basePerLot = floor(total / lotCount to cents)`
  - `remainderPerLot = total - basePerLot * (lotCount - 1)`
- This keeps Budget and Job Costs in sync because the stored lot rows stay the same; only the dialog rehydration logic changes

## Validation
1. Enter Manual full amount `$142,626` with `Divide by 19 lots`
2. Reopen from:
   - a normal lot row
   - the remainder lot row
   - the Job Costs budget dialog
3. Confirm all reopen states show:
   - full amount still `$142,626`
   - divide helper based on `$142,626 ÷ 19`
   - correct total budget display
4. Confirm clicking Apply without changes does not alter the numbers

## Scope
- Single-file fix
- No database changes
- No UI redesign
