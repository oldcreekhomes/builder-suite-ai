# Bank Account Subtype + Default Selection

## Problem
Bank accounts are currently identified by heuristics (account code in 1000-1039 range or names containing "bank/cash/checking"). With multiple real bank accounts plus loan accounts (1040, 1050, 1060) and equity accounts all sharing the "asset/liability/equity" type, the app can't reliably distinguish them, and there's no way to pick a default bank account for new transactions.

## Solution

### 1. Chart of Accounts schema
Add two columns to `public.accounts`:
- `subtype text` — values: `bank`, `loan`, `credit_card`, `equity`, `other` (nullable; only meaningful for asset/liability/equity rows)
- `is_default_bank boolean default false` — only one row per tenant (`owner_id`) may have this true

Enforce single default via a partial unique index:
`create unique index accounts_one_default_bank_per_owner on public.accounts(owner_id) where is_default_bank;`

Backfill: mark existing rows with code 1000-1039 OR keyword match as `subtype='bank'`; mark 1040-1069 as `subtype='loan'`; credit card type rows as `subtype='credit_card'`; equity-type rows as `subtype='equity'`.

### 2. Chart of Accounts UI (`ChartOfAccountsTab.tsx` + Add/Edit Account dialogs)
- Add a new **Subtype** column (visible when account type is asset/liability/equity). Editable via dropdown in Add/Edit dialogs.
- Add a new **Default** column. For rows where `subtype = 'bank'`, render a radio/star toggle. Selecting one clears the flag on any other bank row for the same owner.

### 3. Bank account picker — replace heuristic
In `src/components/AccountSearchInput.tsx`, change `bankAccountsOnly` logic to filter on `account.subtype === 'bank'` (fallback to current heuristic only if no row has subtype set, for graceful migration).

In `src/components/PayBillDialog.tsx`, replace the `name.includes('bank')` filter with the same subtype check (keep credit card branch for credit_card subtype).

### 4. Default-bank auto-fill
On mount, when no `bankAccountId` is set yet, look up the `is_default_bank` account for the current tenant and preselect it. Apply to:
- `src/components/transactions/WriteChecksContent.tsx` (Write Checks)
- `src/components/transactions/MakeDepositsContent.tsx` (Make Deposits)
- `src/components/PayBillDialog.tsx` (Pay Bill modal — currently a dropdown with no default)
- `src/components/transactions/ReconcileAccountsContent.tsx` (Reconcile Accounts)
- `src/components/checks/EditCheckDialog.tsx` and `src/components/deposits/EditDepositDialog.tsx` only when creating new, not when editing existing records (those keep their stored `bank_account_id`)

Only preselect when the form is in "new" mode and the field is empty — never override a user's manual choice or an existing transaction's saved account.

### 5. Other surfaces audited
Searched the codebase for any other bank account selection point. Found these and they will all use the same default logic:
- Write Checks, Make Deposits, Pay Bill, Reconcile Accounts (above)
- Recurring Transactions (if it has a bank picker — verify during implementation in `useRecurringTransactions.ts` / related UI)

No default needed on `AccountDetailDialog` (read-only view) or `BankReconciliation` history page (always tied to a specific reconciliation).

## Technical notes
- Migration adds columns, partial unique index, GRANTs already exist on `accounts`.
- `useAccounts` hook returns the new fields automatically via `select('*')`.
- Add a small helper `useDefaultBankAccountId()` that reads from cached accounts and returns the single `is_default_bank` row's id.
- No change to journal entry math or any posting logic — this is purely classification + UX.
