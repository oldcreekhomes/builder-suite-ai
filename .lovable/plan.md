# Clickable Rows on Job Cost Actual Dialog

Make each transaction row in the Job Cost Actual dialog (e.g., "2100 - MEP Engineering") clickable to open the existing **Transaction Details** popover (same one used in Account Detail Dialog), showing full details: Type, Date, Name, Account, Description, Debit, Credit, Amount, Balance, Cleared, and Attachments.

## Changes

**File:** `src/components/reports/JobCostActualDialog.tsx`

1. Import `TransactionDetailDialog` from `@/components/accounting/TransactionDetailDialog`.
2. Add state: `selectedTxn` (the clicked line) and derive `selectedBalance` (the row's running Balance value already shown in the table).
3. On each `<TableRow>` (line ~505):
   - Add `className="cursor-pointer hover:bg-muted/40"` and `onClick={() => setSelectedTxn(line)}`.
   - Stop propagation on the Files cell, Action menu cell, and Description sort affordances so those continue to work without opening the dialog.
4. Map the journal line into the `Transaction` shape expected by `TransactionDetailDialog`:
   - `source_id` → `bill_id || deposit_id || check_id || journal_entry source_id`
   - `source_type` → existing `source_type` ('bill' | 'deposit' | 'check' | 'manual' | etc.)
   - `journal_entry_id`, `date` (entry_date), `memo`, `description`, `reference` (vendor name / reference_number), `accountDisplay` (`${costCode} - ${costCodeName}`), `debit`, `credit`, `reconciled`, `reconciliation_date`.
5. Pass `accountType="expense"` (job cost rows are expense accounts) so the Amount sign follows the existing convention.
6. Render `<TransactionDetailDialog>` controlled by `selectedTxn` with the row's Balance value.

## Out of scope

- No changes to the underlying query, Status badge logic, lock logic, or row actions.
- No edits to `TransactionDetailDialog.tsx` itself — it already handles all source types and attachments.
