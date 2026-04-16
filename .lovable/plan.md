

## Add Allocation Mode to Manual Tab in Budget Details

### Problem
The Vendor Bid tab has an "Allocation Mode" toggle that lets users divide a total across lots. The Manual tab lacks this, so users with multi-lot projects can't split a manual budget entry across lots.

### Changes

**File: `src/components/budget/BudgetDetailsModal.tsx`**

1. **Add manual allocation state** — new `manualAllocationMode` state (`'full' | 'per-lot'`), defaulting to `'full'`. Add an `useEffect` to infer the saved mode on dialog open (same pattern as vendor bid: compare saved `unit_price` against `total / lotCount`).

2. **Add Allocation Mode UI to Manual tab** — After the table and before the Total line (~line 746), insert the same `RadioGroup` block used in the Vendor Bid tab. Show it only when `hasMultipleLots` and the manual total > 0. Display:
   - "Full amount" with the computed total
   - "Divide by N lots" with the per-lot math

3. **Update the Total Budget label** — Change the existing total display to show "Total Budget (per lot):" when `per-lot` is selected, and show the divided amount.

4. **Update `handleApply` for manual source** (~line 287) — When `manualAllocationMode === 'per-lot'` and `lotCount > 1`:
   - Calculate the total from inputs (`qty * unitPrice`)
   - Compute `perLot = Math.floor((total / lotCount) * 100) / 100`
   - Query all budget rows for this `project_id` + `cost_code_id`
   - Update each row with `quantity: 1, unit_price: perLotAmount, budget_source: 'manual'`
   - Use remainder math on the last lot to maintain cent precision

   When `full` mode, keep the existing single-row update logic.

### Technical details
- The per-lot write logic mirrors `useBudgetBidSelection.ts` lines 44-67 (query sibling rows, loop-update each)
- Cent-precise math: `Math.floor((total / lotCount) * 100) / 100`, remainder on last lot
- The inference `useEffect` checks if saved `unit_price` ≈ `(qty * price) / lotCount` to restore the toggle state
- Single file change only

