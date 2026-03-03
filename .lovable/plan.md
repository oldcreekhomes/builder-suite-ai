

## Fix: Vendor Bid Per-Lot Amount Not Reflecting in Budget Table

### Root Cause
The `calculateBudgetItemTotal` function in `src/utils/budgetUtils.ts` (line 31-32) always returns `selectedBid.price` (the full bid amount from the `project_bids` table) when `budget_source` is `'vendor-bid'`. It completely ignores the `unit_price` that was carefully set to the per-lot amount ($1,072.73) by the allocation mutation.

So the DB is being updated correctly (`unit_price = 1072.86, quantity = 1`), but the display logic bypasses those fields and shows the full bid price ($20,382.00).

### Fix

**`src/utils/budgetUtils.ts`** — In the `'vendor-bid'` case of `calculateBudgetItemTotal`:
- Change the logic to use `quantity * unit_price` when those values are set (which happens after per-lot allocation), falling back to `selectedBid.price` only when they are not.
- Specifically: if `item.unit_price > 0 && item.quantity > 0`, return `item.quantity * item.unit_price`. Otherwise, fall back to `selectedBid.price`.

This ensures:
- **Full bid allocation** (no lot division): `unit_price` is not updated by the mutation, so it falls back to `selectedBid.price` — correct.
- **Per-lot allocation**: `unit_price` is set to the per-lot amount, so `quantity * unit_price` returns the divided amount — correct.

### Files to Change
1. `src/utils/budgetUtils.ts` — update `'vendor-bid'` case logic (lines 30-33)

