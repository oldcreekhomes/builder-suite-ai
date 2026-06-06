## Lock reconciled transactions and fix lock tooltip

### Problem
1. In the Account Detail register, reconciled deposits / checks / journal-entry rows still show the actions menu (3-dot) and can be edited or deleted. They should be locked once reconciled.
2. The lock tooltip on consolidated bill-payment rows reads "Consolidated Payment — Cannot be edited individually", which doesn't reflect the real reason. The user wants the original wording: either "Transaction Reconciled — Cannot be edited or deleted" or "Books Closed — Cannot be edited or deleted".

(The Dominion Energy and City Concrete "Paid" rows are correctly unreconciled in the DB — `bill_payments.reconciled = false`, no reconciliation_id/date, and the underlying bank JE lines are unreconciled. No change needed there; the user said they'd verify those manually.)

### Changes
File: `src/components/accounting/AccountDetailDialog.tsx`

1. **Lock condition** — include `txn.reconciled`:
   - Replace `isDateLocked(txn.date) || isConsolidated` with `isDateLocked(txn.date) || isConsolidated || txn.reconciled` so any reconciled row hides the actions menu and shows the red lock.

2. **Tooltip text** — drop the "Consolidated Payment" wording, use reason-based copy:
   - If `isDateLocked(txn.date)` → `Books Closed / Cannot be edited or deleted` (unchanged).
   - Else (reconciled or consolidated) → `Transaction Reconciled / Cannot be edited or deleted`.

### Scope
- Single file, UI-only change. No DB, no RLS, no logic affecting the underlying mutation paths.
- No changes to status pill / "Paid" vs "Cleared" derivation.