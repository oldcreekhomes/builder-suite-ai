

## Add red Delete action to Job Costs Actual dialog

### Problem
On Reports → Job Costs → click Actual cell, the per-transaction action menu only shows "Edit Bill" / "Edit Deposit" / "Edit Check". There is no way to delete a duplicate bill from this dialog. You spotted two duplicate Cabinets bills on Oceanwatch Court and need to remove one without leaving the dialog.

### Fix
Add a red "Delete" item under Edit in the actions menu for each row in `JobCostActualDialog.tsx`. It will hard-delete the bill (and its journal entries), or reverse a deposit/check, mirroring exactly the pattern already used in `AccountDetailDialog`. The lock icon already covers the not-allowed cases (reconciled or closed period), so Delete only appears for safe-to-delete rows.

### Behavior

For Bill rows:
- Action menu shows: `Edit Bill` then a separator then red `Delete`.
- Clicking Delete opens the standard confirmation dialog ("Are you sure? This will permanently delete this bill and its journal entries.").
- On confirm, calls the existing `delete_bill_with_journal_entries(bill_id)` RPC (the same hard-delete already used elsewhere — releases the reference number, removes journal entries, fully removes from system).
- Invalidates: `job-cost-actual-details`, `job-costs`, `balance-sheet`, `income-statement`, `account-transactions`, `bills-for-payment`, `bill-approval-counts`.
- Closes the row optimistically and shows a success toast.

For Deposit rows:
- Red `Delete` calls `delete_deposit_with_journal_entries(deposit_id)`.

For Check rows:
- Red `Delete` uses the existing `useChecks` deletion path (matches what `AccountDetailDialog` uses today).

For locked rows (reconciled or closed period):
- No change. The red lock icon stays, no Edit, no Delete. Same guard already in place.

### Styling
The existing `TableRowActions` component already renders `variant: 'destructive'` items in red and inserts the separator between edit and delete groups. No new UI primitives needed — matches the screenshot reference.

### Files changed

1. `src/components/reports/JobCostActualDialog.tsx`
   - Add a `handleDeleteTransaction(line)` function that branches on `bill_id` / `deposit_id` / `check_id`, calls the matching RPC/hook, invalidates queries, and shows toast.
   - Extend the `TableRowActions actions=[...]` array for each row to append a `{ label: 'Delete', variant: 'destructive', requiresConfirmation: true, confirmTitle, confirmDescription, onClick: () => handleDeleteTransaction(line) }` item.

No database, RLS, or schema changes. The required RPCs (`delete_bill_with_journal_entries`, `delete_deposit_with_journal_entries`) already exist.

### Out of scope
- Doesn't change the lock logic.
- Doesn't change the Edit dialogs.
- Doesn't touch other reports — only the Job Costs Actual dialog as you requested.

### Verification
- Open Reports → Job Costs on Oceanwatch Court, click Actual on `4630 - Cabinets`.
- Each unlocked row's "…" menu shows Edit Bill then a red Delete.
- Clicking Delete on the duplicate $10,978.78 Fabuwood bill (03/19/2026) prompts to confirm, then the row disappears, the Cabinets total drops by $10,978.78, and the bill is fully gone from Manage Bills, A/P Aging, Account Detail, and the Balance Sheet.
- Locked/reconciled rows still show the red lock with no menu.

