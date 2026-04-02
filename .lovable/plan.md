

## Fix: Sort Reconciliation Transactions by Date by Default

### Problem
After the optimistic update patches the date, the transactions don't reorder because the sort only activates when the user clicks a column header. By default, `checksSortColumn` and `depositsSortColumn` are `null`, so `.sort()` returns `0` (original fetch order). The updated date stays visually out of order.

### Fix
In `src/components/transactions/ReconcileAccountsContent.tsx`:

1. Change the default sort state from `null` to `'date'`:
   - `checksSortColumn` initial value: `null` → `'date'`
   - `depositsSortColumn` initial value: `null` → `'date'`

This ensures transactions are always sorted by date ascending, and after an optimistic date edit the row immediately moves to its correct position.

### Files changed
- `src/components/transactions/ReconcileAccountsContent.tsx` — change two `useState` initializers

