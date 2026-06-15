## Problem

The name shown in the screenshot ("Atlantic Union Bank" vs "John Marshall Bank") is not the global Chart of Accounts name — it's a **per-project override** stored in `project_account_overrides`. I confirmed this in the database: for project `2401 N Potomac`, account `1010` has `display_name = "John Marshall Bank"` while the global `accounts.name = "Atlantic Union Bank"`.

Today, only two surfaces honor overrides:
- Balance Sheet / Income Statement reports
- The Project Accounts editor itself

Every other surface — bank pickers, account search inputs, transaction registers, deposit/check dialogs — renders the raw `accounts.name`, which is why the Make Deposits dropdown still shows "1010 - Atlantic Union Bank".

## Fix

Make project-scoped UI consistently resolve account display via `useProjectAccountNames(projectId)` + `resolveAccountName(account, overrides)`. Search/match logic must also accept the override name so typing "John Marshall" finds account 1010.

### Components to update

1. `src/components/AccountSearchInput.tsx`
   - Accept the existing `projectId` prop, call `useProjectAccountNames(projectId)`.
   - Build a helper `displayName(acc) = resolveAccountName(acc, overrides)`.
   - Use `displayName` in: dropdown rows (line 273), selected-value formatting in `handleSelectAccount` (line 220), `matchesSelectedAccount` check, token search filter, and `attemptAutoSelect` full-string matching.

2. `src/components/AccountSearchInputInline.tsx`
   - Add a `projectId` prop (already passed by callers like `MakeDeposits.tsx`).
   - Same override wiring: dropdown row text, selected value on select, search filter, and `attemptAutoSelect` exact/contains comparisons.

3. `src/components/deposits/EditDepositDialog.tsx` (bank dropdown ~line 476/487)
   - Use overrides for the selected label and each `SelectItem`.

4. `src/components/transactions/ReconcileAccountsContent.tsx` (bank list ~line 1089)
   - Render override name in the picker.

5. Any `<AccountSearchInput …>` callers that already have a `projectId` in scope but don't pass it (audit list below — pass `projectId` so the component can resolve overrides):
   - `src/components/transactions/WriteChecksContent.tsx` (bank + line-item pickers)
   - `src/components/transactions/MakeDepositsContent.tsx` (bank + line-item pickers)
   - `src/components/transactions/CreditCardsContent.tsx`
   - `src/components/bills/ManualBillEntry.tsx`, `EditExtractedBillDialog.tsx`, `EditBillDialog.tsx`, `BatchBillLineItems.tsx`, `BillsReviewLineItemsTable.tsx`
   - `src/components/journal/JournalEntryForm.tsx`
   - `src/pages/WriteChecks.tsx`, `src/pages/MakeDeposits.tsx`

### What stays unchanged

- The database. The override row is already correct; no schema change needed.
- Global / non-project surfaces (e.g. company-overhead Journal Entry with no project, global COA editor) keep showing the canonical `accounts.name`.
- Reports already use overrides — no change.
- Saved transactions: historical journal-entry/line records that snapshot an account name in text are not retroactively rewritten; only live "look up the account" displays follow the override.

### Out of scope (call out, not changing now)

- Transaction registers / Account Detail / A/P / A/R lists also display account names. If you also want override names there, that's a second pass — let me know and I'll extend the same pattern to those tables. This plan focuses on the pickers where you saw the bug.

## Technical notes

- `useProjectAccountNames` returns `Map<account_id, display_name>`; `resolveAccountName({id,name}, map)` returns the override if present, else the global name. Both already exist in `src/hooks/useProjectAccountNames.ts`.
- Search/filter must compare against `displayName` (not raw `account.name`) so typing the new name still finds the row.
- For pickers nested in dialogs without a direct `projectId` prop, the prop is already threaded from the parent page — the audit above only adds the prop pass-through.
