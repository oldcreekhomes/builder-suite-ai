## Plan

Replace the Type column label `Journal Entry` with `JE` everywhere it appears in transaction-style detail dialogs so it never collides with the Date column again.

**Files to update:**

1. `src/components/accounting/TransactionDetailDialog.tsx` (line 88) — `case 'manual': return 'JE';`
2. `src/components/accounting/AccountDetailDialog.tsx` (line 1480) — same change in the Type cell renderer.
3. `src/components/transactions/ReconciliationReviewDialog.tsx` — lines 330 and 375, change `'Journal Entry'` to `'JE'` in both the Debits and Credits tables.

**Left unchanged (not Type-column labels):**
- `src/pages/JournalEntry.tsx` — page title.
- `src/components/transactions/TransactionsTabs.tsx` — sidebar tab label.
- `src/hooks/useBankReconciliation.ts` — fallback payee/source description text.
- `src/components/reports/JobCostActualDialog.tsx` — already returns `JE` from the prior change.

No data or business logic changes.
