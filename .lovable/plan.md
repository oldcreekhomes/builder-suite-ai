

## Move Edit Description to Transaction Detail Dialog

### Summary
Remove the "Edit Description" option from the Actions column in the register table. Instead, add a 3-dot (MoreHorizontal) menu next to the Description value inside the Transaction Details dialog, allowing users to edit the description from there.

### Changes

**1. `src/components/accounting/AccountDetailDialog.tsx`**
- Remove the `Edit3` import and the pencil button for locked rows (lines ~1295-1307)
- Remove the `"Edit Description"` action from the `TableRowActions` menu for unlocked rows (lines ~1315-1318)
- Keep the `editDescriptionTxn` state and `EditDescriptionDialog` render — but move the trigger to TransactionDetailDialog via a callback
- Pass an `onEditDescription` callback prop to `TransactionDetailDialog` that sets `editDescriptionTxn`

**2. `src/components/accounting/TransactionDetailDialog.tsx`**
- Accept a new prop: `onEditDescription?: () => void`
- For the Description row, instead of rendering it as a plain `details` array item, render it specially: show the description text followed by a `MoreHorizontal` (3-dot) icon button
- Clicking the 3-dot button calls `onEditDescription`, which triggers the edit dialog back in the parent
- The 3-dot button uses the standard `TableRowActions` dropdown with a single "Edit Description" action, consistent with the app's pattern

### Result
- The Actions column in the register stays clean (lock icon only for locked rows, no extra pencil)
- Users click a transaction row to open the detail dialog, then use the familiar 3-dot menu next to Description to edit it
- Works for both locked and unlocked transactions

