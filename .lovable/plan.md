

## Fix: Update Transaction Details After Description Save

### Problem
After saving a new description, the register table data refreshes (via query invalidation), but the `TransactionDetailDialog` still shows the old description because it reads from a stale `selectedTransaction` state object that was set when the row was clicked.

### Fix: `src/components/accounting/AccountDetailDialog.tsx`

Add an `onDescriptionSaved` callback to `EditDescriptionDialog` that updates `selectedTransaction` in place with the new description text. After the save succeeds:

1. Update `selectedTransaction` state: `setSelectedTransaction(prev => prev ? { ...prev, description: newDescription } : null)`
2. Also update `editDescriptionTxn` to null (close the edit dialog)

This requires:
- Adding an `onSaved?: (newDescription: string) => void` prop to `EditDescriptionDialog`
- Calling it after successful save in `EditDescriptionDialog.tsx`
- Wiring it in `AccountDetailDialog.tsx` to update `selectedTransaction`

### Changes

**`src/components/accounting/EditDescriptionDialog.tsx`**
- Add `onSaved?: (newDescription: string) => void` to props
- After successful save (after `queryClient.invalidateQueries`), call `onSaved?.(description)`

**`src/components/accounting/AccountDetailDialog.tsx`**
- Pass `onSaved` to `EditDescriptionDialog` that updates `selectedTransaction` with the new description

