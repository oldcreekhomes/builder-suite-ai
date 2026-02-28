

# Add Bulk Delete for Chart of Accounts

## What Changes

**File: `src/components/settings/ChartOfAccountsTab.tsx`**

1. Add a bulk delete handler that loops through all selected account IDs and deletes them via the Supabase client, with proper error handling and toast feedback.

2. Add state for a bulk delete confirmation dialog (`showBulkDeleteConfirm`).

3. Between the search bar and the table, show a "Delete Selected (N)" button (using the existing `BulkActionBar` component pattern) whenever `selectedIds.size > 0`. Clicking it opens a `DeleteConfirmationDialog` warning that this is permanent.

4. On confirm, delete all selected accounts from the database, clear the selection, invalidate the accounts query, and show a success toast.

5. Import `DeleteConfirmationDialog` from `@/components/ui/delete-confirmation-dialog`.

## Technical Details

- Add `showBulkDeleteConfirm` boolean state and `isBulkDeleting` boolean state.
- Add a `handleBulkDelete` async function that:
  - Sets `isBulkDeleting = true`
  - Loops through `selectedIds`, calling `supabase.from('accounts').delete().eq('id', id)` for each
  - On success: clears selection, invalidates `['accounts']` query, shows success toast
  - On error: shows error toast with count of failures
  - Sets `isBulkDeleting = false` and closes the dialog
- Between the search bar `div` and the `SettingsTableWrapper`, render:
  - A destructive `Button` with trash icon showing "Delete Selected (N)" when `selectedIds.size > 0`
  - A `DeleteConfirmationDialog` with title "Delete Selected Accounts" and description warning that N accounts will be permanently deleted
- After successful bulk delete, clear `selectedIds`.

