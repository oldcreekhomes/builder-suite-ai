

## Allow Editing Descriptions on Locked/Reconciled Transactions

### Problem
When a transaction is reconciled or in a closed period, the entire row is locked with no edit actions. The user needs to correct descriptions (memos) on these transactions — a non-financial field that doesn't affect accounting balances.

### Approach
Add an "Edit Description" action that is always available, even on locked rows. This opens a small inline dialog to update the memo/description on the source transaction's first line. The lock icon and tooltip remain, but instead of showing only the lock, locked rows will show the lock icon plus a small "Edit Description" option.

### Changes

**1. New component: `src/components/accounting/EditDescriptionDialog.tsx`**
- Simple dialog with a textarea for the description and Save/Cancel buttons
- Accepts `sourceType`, `sourceId`, `journalEntryId`, and current description
- On save, updates the appropriate source table's first line memo:
  - `bill` → `bill_lines.memo` (first line by line_number)
  - `check` → `check_lines.memo` (first line)
  - `deposit` → `deposit_lines.memo` (first line)
  - `credit_card` → `credit_card_lines.memo` (first line)
  - `manual` → `journal_entry_lines.memo`
- Also updates the corresponding `journal_entry_lines.memo` to keep ledger description in sync
- Invalidates the account-transactions query on success

**2. Update: `src/components/accounting/AccountDetailDialog.tsx`**
- For locked rows (reconciled or date-locked), replace the lock-icon-only display with a layout that shows both the lock icon and a small "Edit Description" button (pencil icon or text link)
- For unlocked rows, add "Edit Description" as an additional action in the existing `TableRowActions` menu
- Add state for the edit description dialog (`editDescriptionTxn`)
- Render the new `EditDescriptionDialog` component

### What stays the same
- Lock icon still shows on reconciled/closed rows
- Full edit (Edit Bill, Edit Deposit, etc.) and Delete remain blocked on locked rows
- No financial data is modified — only memo/description text

