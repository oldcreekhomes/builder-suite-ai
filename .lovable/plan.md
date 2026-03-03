
Problem confirmed and root cause:
- I verified the current flow in `BudgetDetailsModal` + `useBudgetBidSelection` + `calculateBudgetItemTotal`.
- In full-allocation mode, Apply currently updates only `selected_bid_id` for the row.
- Your table total for `vendor-bid` now prioritizes `unit_price * quantity` when those exist.
- So if that row was previously split per-lot (example: `unit_price = 2169.22, quantity = 1`), selecting “full amount” does not overwrite those values, and the table keeps showing the old split value.
- DB check confirms this for Knob Hill Court demolition (`3220`): row still has `unit_price: 2169.22` and old `updated_at`, so full amount was not persisted.

Implementation plan:
1) Update vendor-bid mutation to persist allocation intent
- File: `src/hooks/useBudgetBidSelection.ts`
- Extend mutation input to include allocation mode and selected bid total.
- In mutation:
  - Always resolve current row (`project_id`, `cost_code_id`, `lot_id`).
  - If mode = `per-lot`: keep existing all-lots split behavior.
  - If mode = `full`: update current lot row with:
    - `selected_bid_id = bidId`
    - `quantity = 1`
    - `unit_price = bidTotal` (full selected bid amount)
  - This ensures DB always reflects what user chose in the dialog.

2) Pass correct payload from dialog Apply
- File: `src/components/budget/BudgetDetailsModal.tsx`
- In `handleApply` vendor-bid branch:
  - Pass `allocationMode` and `selectedBidPrice` to `selectBid`.
  - Continue using `lotCount` only for per-lot mode.
- Result: Apply writes either full or split values explicitly instead of relying on fallback behavior.

3) Tighten immediate refresh behavior for budget + job costs
- File: `src/hooks/useBudgetBidSelection.ts`
- Keep invalidation, but target project-specific key:
  - `['project-budgets', projectId]` (covers lot-filtered variants by prefix)
  - `['job-costs']`
- This preserves mirror sync between Budget and Job Costs and refreshes right after Apply.

4) Preserve existing calculation contract (no further formula change)
- File: `src/utils/budgetUtils.ts` (no new logic required)
- Current rule is correct once DB is written correctly:
  - vendor-bid uses `unit_price * quantity` when populated (allocated values),
  - falls back to selected bid price otherwise.

Validation checklist after implementation:
- In demolition row (3220), choose full $41,215 and click Apply:
  - DB row for selected lot updates to `unit_price=41215`, `quantity=1`, new `updated_at`.
  - Budget table updates immediately without manual refresh.
- Reopen dialog, choose divide across 19:
  - All lot rows for that cost code are split with remainder-safe cents.
  - Current lot shows per-lot amount in Budget table.
- Confirm Job Costs view reflects the same number as Budget for that lot/cost code.
