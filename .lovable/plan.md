## Problem

Two bugs in the Bank Account dropdown on Write Checks (and Make Deposits / Credit Cards, which use the same component):

1. **Capital One (1015) is missing.** The "bank accounts only" filter in `AccountSearchInput` hard‑codes detection to codes `1010`/`1030` plus name keywords (`bank`, `checking`, `savings`, `clearing`). "Capital One" matches none of these, so the account never appears even though it is enabled for the project.

2. **Atlantic Union Bank (1010) shows even though it is unchecked** in this project's Chart of Accounts. `AccountSearchInput` never consults `project_account_exclusions`, so the project-level COA filter is ignored on transaction forms.

## Fix

### 1. Broaden bank account detection
In `src/components/AccountSearchInput.tsx`, replace the hard-coded code list with:
- any asset account whose code is in the cash/bank range `1000–1039`, OR
- name contains `bank`, `checking`, `savings`, `clearing`, `cash`, `money market`, or `capital one` / `chase` / `wells` / `bofa` style — keep it generic by also matching common card/bank issuer keywords.

Range `1000–1039` covers the standard cash/bank block (Atlantic 1010, Capital One 1015, Deposits 1020, Clearing 1030) without pulling in loans (1040+), WIP, etc. Keyword fallback stays for non-standard codings.

### 2. Apply project COA exclusions
- Add an optional `projectId?: string` prop to `AccountSearchInput`.
- When `projectId` is set, fetch `project_account_exclusions` for that project (React Query, cached) and filter out any excluded account ids from the dropdown list — same data source the Edit Project → Chart of Accounts dialog uses.
- Pass `projectId` from `WriteChecksContent`, `MakeDepositsContent`, and `CreditCardsContent` (Bank Account field) and from the row-level `AccountSearchInput` used for the Account column so project-excluded expense accounts are also hidden in the line items.

### 3. Verify
- Granada → Write Checks → Bank Account: dropdown shows `1015 - Capital One` and `1030 - Clearing`, hides `1010 - Atlantic Union Bank`.
- Line-item Account picker on the same form hides any asset/expense accounts unchecked for the project.
- Make Deposits and Credit Cards behave the same.
- Company-level (no `projectId`) screens still show every account.

## Technical notes

- No schema change. Uses existing `project_account_exclusions` table.
- `AccountSearchInput` becomes project-aware; the existing `bankAccountsOnly` flag is preserved, just with a wider matcher.
- Cache key: `['project-account-exclusions', projectId]` — already used by `ProjectAccountsTab`, so toggling an account in Edit Project will invalidate and immediately refresh transaction dropdowns.
