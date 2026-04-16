
Do I know what the issue is? Yes.

The Manual tab is still using the saved lot row as its source of truth, then dividing that value again in the UI. Purchase Orders works because it does not do that — it keeps one canonical full total and only derives the per-lot display from that full total.

What is actually wrong:
1. Manual still initializes from `budgetItem.unit_price` and `budgetItem.quantity`, which are already split values on lot rows.
2. The current sibling-row patch is too brittle, so if the sibling set is not exactly what the effect expects, the modal falls back to the single divided row.
3. The Manual cards and total label are still driven by the editable row values, so reopen logic can still double-divide.

Fix
File: `src/components/budget/BudgetDetailsModal.tsx`

1. Mirror the PO tab concept for Manual:
   - create one canonical Manual full amount for reopen/display
   - if the cost code is lot-split, reconstruct that full amount from sibling budget rows using cent-precise math
   - otherwise use the current row total

2. Make the sibling reconstruction robust:
   - when multiple lots exist, prefer the non-null `lot_id` rows for that cost code
   - ignore any project-wide `lot_id = null` row so it cannot break detection
   - remove the brittle “exact row count must equal lotCount” fallback that leaves the modal on the single split row

3. Rehydrate Manual from that canonical full amount:
   - `manualAllocationMode = 'per-lot'` only when the sibling rows match a true split pattern
   - `manualQuantityInput = "1"`
   - `manualUnitPriceInput = original full amount`
   - Manual “Full amount”, “Divide by 19 lots”, and “Total Budget” should all read from that same full amount, just like PO

4. Keep save behavior the same:
   - Full amount saves full amount
   - Per-lot mode splits once across the lot rows with cent-precise remainder handling
   - reopening never divides twice

Technical details
- Use cent math for all manual reconstruction and comparisons
- Derive:
  - `basePerLot = floor(fullTotal / lotCount to cents)`
  - `remainderPerLot = fullTotal - basePerLot * (lotCount - 1)`
- Use a single source of truth for Manual display state to avoid contradictory state

Validation
1. Enter Manual full amount `$142,626` and choose `Divide by 19 lots`
2. Reopen from:
   - a normal lot row
   - the remainder lot row
   - the Job Costs budget dialog
3. Confirm Manual shows:
   - Full amount = `$142,626.00`
   - Divide helper = `$142,626.00 ÷ 19 = $7,506.63/lot`
   - no second division
4. Click Apply without changes and confirm nothing changes unexpectedly

Scope
- Single-file fix
- No database changes
- No UI redesign
