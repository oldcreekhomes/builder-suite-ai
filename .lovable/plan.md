# Rename "Reverse Payment" to "Delete" and update confirmation copy

## Goal
Make the consolidated bill-payment action in the bank register use user-facing "Delete" language and a permanent-delete warning, while keeping the underlying reversing-entry behavior unchanged.

## Changes
1. In `src/components/accounting/AccountDetailDialog.tsx`:
   - Change the row-action label from `"Reverse Payment"` to `"Delete"`.
   - Change the confirmation title from `"Reverse Payment"` to `"Delete Payment"`.
   - Change the confirmation description to a plain delete warning, e.g.:  
     `"This payment will be permanently deleted from the application and the related bills will be returned to unpaid. Continue?"`

## Notes
- The actual behavior remains a reversing journal entry + allocation cleanup; only the user-facing copy changes.
- No database or edge-function changes are required.
