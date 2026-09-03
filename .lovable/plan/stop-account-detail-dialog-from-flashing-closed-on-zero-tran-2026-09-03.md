# Stop Account Detail dialog from flashing closed on zero transactions

## Problem
When a user opens the account detail/register dialog for an account with no transactions (e.g., from the Balance Sheet or Reports), the dialog opens briefly, the query returns an empty list, and an `useEffect` immediately calls `onOpenChange(false)`. The dialog closes in less than a second, making users think something errored or that transactions exist.

## What to change
- File: `src/components/accounting/AccountDetailDialog.tsx`
  - Remove the auto-close `useEffect` at lines 1157-1162 that calls `onOpenChange(false)` when `transactions && transactions.length === 0 && open`.
  - Update the existing empty-state copy at lines 1557-1563 from `"No transactions found for this account."` to `"No transactions yet for this account."` so the user sees a clear, friendly message instead of a closed dialog.
  - Keep the existing `isLoading` skeleton state and the "All bills are paid" message when `hidePaid` filters the list to zero.

## Verification
- Typecheck the project with `npx tsgo --noEmit -p tsconfig.app.json`.
- Open the Balance Sheet, click an account with no transactions, and confirm the dialog remains open showing "No transactions yet for this account."
- Confirm accounts with transactions still open normally and are not affected.
