

## Plan: Fix Manual modal default allocation + Total

### Bug
For cost code 2310, the budget rows show $7,506.66/lot across 19 lots ($142,626 total). When opening Budget Details → Manual:
- It defaults to **Full amount** (should default to **Divide by 19 lots**, since that's what's actually saved on the rows).
- Total Budget shows $142,626.00 (should show $7,506.63 per-lot to match the row).

### Root cause
Two independent hydration paths run in `BudgetDetailsModal.tsx`:

1. **`manualLineRows`** (sub-lines from `project_budget_manual_lines`) → seeds `manualLines` array. The total of these lines (`manualTotalCents`) drives the displayed Total.
2. **`siblingRows`** (per-lot rows from `project_budgets`) → infers `manualAllocationMode` ('full' vs 'per-lot') by checking if the lot rows match a split pattern.

The two are not cross-checked. In this case:
- `siblingRows` inference *should* detect per-lot (18× $7,506.63 + 1× $7,506.66 = $142,626). If it does, mode flips to 'per-lot' and Total Budget shows $7,506.63. ✓
- But if the saved `project_budget_manual_lines` row stores the **per-lot** amount ($7,506.63) instead of the **full** amount ($142,626), then:
  - `manualTotalCents` = $7,506.63
  - In per-lot mode, Total displays $7,506.63 / 19 = $395.08 (wrong)
  - In full mode, Total displays $7,506.63 (matches the row, but the radio shows "Full amount" misleadingly)

The current code is inconsistent about whether `project_budget_manual_lines.unit_price` stores the full or per-lot amount.

### Fix

In `src/components/budget/BudgetDetailsModal.tsx`:

1. **Standardize storage**: `project_budget_manual_lines` always stores the **full (un-divided) total**. The per-lot split happens only when writing to `project_budgets` rows.

2. **Hydration coherence**: When the modal opens, after both `manualLineRows` and `siblingRows` resolve, reconcile:
   - If `siblingRows` total matches `manualLines` total → keep allocation mode from sibling inference.
   - If `siblingRows` total ≈ `manualLines` total × `lotCount` → the saved sub-lines are per-lot values; multiply each line's `unit_price` by `lotCount` for display so `manualTotalCents` reflects the full amount, then set mode to `per-lot`.
   - Defensive: prefer `siblingRows` reconstructed total as the source of truth when it disagrees with the sub-lines.

3. **Default allocation mode**: When `lotCount > 1` and the saved per-lot rows in `project_budgets` indicate a split (sibling inference returns `per-lot`), default `manualAllocationMode` to `'per-lot'` and show "Divide by N lots" selected.

4. **Total Budget display**: Already correct — `manualDisplayAmount` returns per-lot amount when mode = 'per-lot'. After the fix in step 2, `manualTotalCents` will correctly be $142,626 → Total Budget displays $7,506.63.

5. **One-time data normalization** (defensive, no migration needed): on first open after this fix, if we detect per-lot-stored sub-lines, the next Apply will re-save them as full-amount, self-healing the row.

### Files to change
- `src/components/budget/BudgetDetailsModal.tsx` — hydration reconciliation logic in the `useEffect` that sets `manualLines` and `manualAllocationMode`.

### Out of scope
- No DB schema changes.
- No changes to other tabs or to the per-lot write logic in `handleApply`.

### Validation
1. Open Budget Details on cost code 2310 (or any manual per-lot row). Modal opens with **Divide by 19 lots** selected.
2. Total Budget shows **$7,506.63** (matches the budget row).
3. Switch to Full amount → Total shows **$142,626.00**.
4. Click Apply with no changes → all 19 lot rows remain at $7,506.63 / $7,506.66 (no drift).
5. Add a new sub-line, Apply → rows update consistently and reopen still defaults to per-lot.

