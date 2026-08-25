# Fix: Historical budget source saves the label but not the amount

## What's wrong (confirmed in the data)

Nob Hill's 2120 Permit Fees row now reads:

- source: Historical
- historical project/lot: 6330 Stevenson Ave - Lot 501 (saved correctly)
- amount: still **$20,468.32** — the value left over from the previous source

The dialog correctly shows the historical actual cost of **$11,055.59**, but Apply never writes it.

Cause: in `src/hooks/useBudgetSourceUpdate.ts`, the `historical` branch writes only `budget_source`, `historical_project_id`, and `historical_lot_id`. Unlike the `manual` and `purchase-orders` branches, it ignores `manualQuantity` / `manualUnitPrice`, so `quantity`/`unit_price` keep their stale values. The budget table's total calculation prefers a non-zero `unit_price` over the looked-up historical cost, so the old number sticks.

## The fix

1. **`src/hooks/useBudgetSourceUpdate.ts`** — in the `historical` branch, write `quantity` and `unit_price` when they are supplied, exactly like the manual branch does. The modal already passes them.

2. **`src/components/budget/BudgetDetailsModal.tsx`** — the displayed historical amount falls back to the amount already saved on the row when the lookup returns 0. Restrict that fallback to the case where the selected project/lot is unchanged from what's saved, so switching to a different historical project can never re-save the stale number. If the lookup genuinely returns 0 for a newly chosen source, Apply writes 0 rather than the old value.

3. Correct the existing Nob Hill 2120 row so it shows $11,055.59 instead of $20,468.32.

## Result

Choosing Historical in Budget Details saves both the source and the amount, and the budget row's Total Budget matches the Actual Cost shown in the dialog.
