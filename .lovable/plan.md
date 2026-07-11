## Plan: put Bank Reconciliations back the way it should work

I found the issue: the Accounting page's **Bank Reconciliations** card/dialog is reading uploaded PDFs from `project_files` under `Bank Reconciliations/`. But the actual reconciliations created from the bank ledger live in the `bank_reconciliations` table. That is why the ledger can show cleared through 6/1/2026 while the card says no reconciliations.

### What I will restore
1. **Change the Accounting overview card metrics**
   - Make the Bank Reconciliations card count actual reconciliation sessions from `bank_reconciliations` for the current project.
   - Use the latest `statement_date` / completed date instead of uploaded PDF date.

2. **Change the Bank Reconciliations dialog list**
   - Show rows from `bank_reconciliations`, not uploaded PDF files.
   - Include the useful reconciliation fields: statement date, ending balance, status, and last updated/completed date.

3. **Keep existing reconciliation behavior intact**
   - Do not change bank ledger clearing logic.
   - Do not delete or move any data.
   - Do not change how reconciliations are created/completed.

4. **Do not add new functionality beyond restoring the correct source**
   - No database migration.
   - No bulk data edits.
   - No changes to the reconciliation engine.
   - Only make the Accounting card/dialog reflect the actual reconciliations again.

### Technical details
- Update `src/pages/Accounting.tsx` so `bank-reconciliations-metrics` queries `bank_reconciliations` scoped by `project_id`.
- Update `src/components/accounting/BankReconciliationsDialog.tsx` so the table queries `bank_reconciliations` scoped by `project_id`.
- Remove the PDF-upload-style assumptions from this dialog for the reconciliation list.
- Keep row actions minimal and consistent with the app; if there is no actual PDF attached to a reconciliation record, it will not pretend there is one.