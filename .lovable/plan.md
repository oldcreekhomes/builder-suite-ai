# Make per-project account renames flow everywhere

The override system works, but only the standalone `/project/.../balance-sheet` and `/project/.../income-statement` pages were wired. The actual **Reports** page uses different components (`BalanceSheetContent`, `IncomeStatementContent`, `AccountsPayableContent`, `JobCostsContent`) and PDF exports — that's why "3120 - Income" still shows as "Construction Management Fees" there. Bills, transactions, registers, dropdowns, and reconciliation also still show the global name.

## What I'll wire up

For every project-scoped surface that shows an account name, resolve through `useProjectAccountNames(projectId)` so the override (when present) replaces `account.name` at render time. Global pages (the company-wide Reports views with no `projectId`, the master Chart of Accounts in Settings, the master Edit/Add Account dialogs) keep using the global name.

### Reports (the actual ones rendered in the Reports page)
- `src/components/reports/IncomeStatementContent.tsx`
- `src/components/reports/BalanceSheetContent.tsx`
- `src/components/reports/AccountsPayableContent.tsx`
- `src/components/reports/JobCostsContent.tsx` (account-related rows only — cost-code labels stay as-is)

### Report PDFs
- `src/components/reports/pdf/IncomeStatementPdfDocument.tsx`
- `src/components/reports/pdf/BalanceSheetPdfDocument.tsx`
- `src/components/reports/pdf/AccountsPayablePdfDocument.tsx`
- `src/components/reports/pdf/JobCostsPdfDocument.tsx`
  Each PDF component takes an optional `accountNameOverrides: Record<string,string>` prop; the parent Content component fetches the overrides via the hook and passes them in.

### Registers & detail
- `AccountDetailDialog` — title bar account name + the related-account column (the `accountsDisplayMap` already pulls overrides when `projectId` is present; I'll also update the title bar).
- `ReconcileAccountsContent.tsx` and `BankReconciliation.tsx` / `useBankReconciliation.ts` — account name shown in the picker, header, and printout.

### Transaction entry surfaces (account dropdowns, line tables)
- `AccountSearchInput.tsx` and `AccountSearchInputInline.tsx` — the shared account pickers used by bills, checks, deposits, credit cards, journal entries, POs. Both accept an optional `projectId` (most callers already have one in scope). When provided, the rendered name in the dropdown options and the selected-label uses the override.
- `WriteChecks` / `WriteChecksContent`, `MakeDeposits` / `MakeDepositsContent`, `CreditCardsContent`, `EditCheckDialog`, `EditDepositDialog`, `PayBillDialog`, `EditExtractedBillDialog`, `ManualBillEntry`, `JournalEntryForm` — pass `projectId` through and use override-aware display strings for any place an account name is rendered outside the picker (e.g. summary rows, table cells, headers).

### Standalone report pages
- `src/pages/BalanceSheet.tsx` and `src/pages/IncomeStatement.tsx` are already wired (from the previous step) and stay as-is.

### Out of scope (intentional)
- `Settings/ChartOfAccountsTab`, `Settings/AddAccountDialog`, `Settings/EditAccountDialog` — these manage the global accounts; they keep showing global names.
- `SendReportsDialog` — uses the same Content components for body rendering, so it inherits the change automatically; I'll just verify nothing else needs touching.

## Mechanics

1. Add a shared `useProjectAccountNames(projectId)` (already exists) to each Content component and any entry-form surface.
2. Replace every literal `account.name` (or `${account.code} - ${account.name}`) on a project-scoped surface with `overrides?.get(account.id) ?? account.name`.
3. For PDF components, accept the resolved name from the parent rather than fetching inside the document.
4. Add the override query key (`['project-account-overrides', projectId]`) to React Query invalidation triggered by the rename mutation in `ProjectAccountsTab` so all open report views refresh immediately after a save (it already invalidates Balance Sheet and Income Statement; I'll add Accounts Payable, Job Costs, Account Detail, bank reconciliation, and registers).

## Verification

After the change, in project `115 E. Oceanwatch Court`:
- Reports → Income Statement shows "3120 - Income" (not "Construction Management Fees").
- Reports → Balance Sheet, Accounts Payable, Job Costs all show the new name where 3120 appears.
- Account dropdowns in Manage Bills, Write Checks, Make Deposits, Journal Entry, and Credit Cards all list "3120 - Income".
- Account Detail register opened on 3120 shows "3120 - Income" in the title.
- PDF export of each report shows the new name.
- Switching to a different project where 3120 has no override still shows "3120 - Construction Management Fees".
