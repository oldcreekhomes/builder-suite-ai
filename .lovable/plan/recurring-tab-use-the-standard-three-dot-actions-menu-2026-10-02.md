# Recurring tab: use the standard three-dot Actions menu

## Problem
Right now, each row on the Memorized Transactions (Recurring) list shows a pause icon and a red trash icon in the Actions column. The rest of the app uses one three-dot (⋯) button that opens a dropdown menu.

## Change
- In the Actions column, replace the pause icon and the trash icon with the standard three-dot (⋯) button.
- Clicking it opens a dropdown with:
  - **Enter Now**, shown only when the recurring payment is due
  - **Pause**, or **Resume** when the payment is paused
  - a divider, then **Delete** in red, which asks you to confirm before deleting
- Line the Actions header and the ⋯ button up the way the other standard tables do.
- Nothing else changes: same columns, same Active/Paused badges, same due-row highlight.

## Technical details
- `src/components/transactions/RecurringTransactionsContent.tsx`: swap the inline `Button` (Pause/Play) and `DeleteButton` for `TableRowActions` from `@/components/ui/table-row-actions`. The actions are:
  - `{ label: "Enter Now", onClick: () => onEnterTransaction(rt), hidden: !due || !onEnterTransaction }`
  - `{ label: rt.is_active ? "Pause" : "Resume", onClick: () => toggleActive.mutate(...) }`
  - `{ label: "Delete", variant: "destructive", requiresConfirmation: true, confirmTitle: "Delete Recurring Transaction", confirmDescription: ..., onClick: () => deleteRecurring.mutateAsync(rt.id), isLoading: deleteRecurring.isPending }`
- Center the Actions header and cell, and give the column a narrow fixed width to match other tables. Remove the unused `Trash2`, `Play`, `Pause`, `Button` and `DeleteButton` imports.
- No database changes.
