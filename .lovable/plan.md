## Fix misleading "Transaction Reconciled" tooltip on bank register

### The bug
In `src/components/accounting/AccountDetailDialog.tsx` (around line 1616), the lock icon in the Actions column appears for three independent reasons:

1. The date is inside a closed accounting period
2. The row is a consolidated bill payment (`source_type === 'consolidated_bill_payment'`)
3. The transaction is genuinely reconciled (`txn.reconciled === true`)

But the tooltip only differentiates case 1 vs everything else. Cases 2 and 3 both display **"Transaction Reconciled — Cannot be edited or deleted"**, which is wrong for case 2. That is why yesterday's Capital One bill payments — which are not reconciled — still show that label.

Verified in DB: all 9 payments have `bill_payments.reconciled = false`, no `reconciliation_id`, no `reconciliation_date`. They are correctly unreconciled; only the tooltip text is wrong.

### Fix (single-file UI change)
Update the tooltip block in `AccountDetailDialog.tsx` to branch into three messages:

- **Closed period** (`isDateLocked(txn.date)`) → "Books Closed / Cannot be edited or deleted" (unchanged)
- **Reconciled** (`txn.reconciled`) → "Transaction Reconciled / Cannot be edited or deleted" (unchanged copy, but now only shown when truly reconciled)
- **Consolidated bill payment** (`isConsolidated` and not reconciled / not in a closed period) → "Consolidated Payment / Edit or delete from the bill's Payments tab"

Priority order: closed period > reconciled > consolidated, so a row that is also reconciled or in a closed period still shows the stronger message.

No DB or business-logic changes. The lock itself still appears in all three cases — only the tooltip copy changes so it accurately describes why the row is read-only inline.

### Scope
- Files: `src/components/accounting/AccountDetailDialog.tsx` only
- No migration, no data update, no changes to the actual reconciliation/lock behavior elsewhere.