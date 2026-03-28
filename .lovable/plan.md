

## Fix: Edit Description Not Persisting for Bill Payment Transactions

### Problem
Two issues prevent the edited description from showing:

1. **Display logic overrides memo**: In `AccountDetailDialog.tsx` line ~704, for `bill_payment` transactions, the description is set to `bill.reference_number || description`. So even though `journal_entry_lines.memo` gets updated in the DB, when the register re-renders it overwrites the description with the bill's reference number ("58202").

2. **Missing source type handling**: `EditDescriptionDialog.tsx` doesn't handle `bill_payment` or `consolidated_bill_payment` in `getLineTable()`/`getParentColumn()`, so the source table update is skipped (though the JE lines update does run).

### Fix (2 changes in 2 files)

**1. `src/components/accounting/AccountDetailDialog.tsx`**
- For `bill` and `bill_payment` source types (~line 704), change the description priority: use `line.memo` first (the JE line memo), fall back to `bill.reference_number`, then fall back to default. This way, when a user edits the description (which updates `journal_entry_lines.memo`), it takes priority over the bill's reference number.
- Same change for `consolidated_bill_payment` (~line 772): prefer the JE line memo or consolidated payment memo that was edited.

**2. `src/components/accounting/EditDescriptionDialog.tsx`**
- Add `bill_payment` and `consolidated_bill_payment` cases to `getLineTable()` — both map to `'journal_entry_lines'` since bill payments don't have their own line tables.
- Add corresponding cases to `getParentColumn()` — both map to `'journal_entry_id'`.
- Add error logging on the supabase update calls to catch silent failures.

### Result
After saving a new description, the `journal_entry_lines.memo` is updated. When the register re-renders, it now prefers that memo over the bill's reference number, so the edited description persists and displays correctly.

