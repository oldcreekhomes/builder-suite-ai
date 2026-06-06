Fix two bank-account UI bugs across the entire app (not project-specific). Database is already correct.

## Bug 1 — Bank dropdown only shows the currently selected bank

In `AccountSearchInput`, when the field already has a value like `1015 - Capital One` and the user clicks to change it, the component treats that value as a search query and tokenizes it (`1015`, `capital`, `one`), which filters the list down to that one account. Result: Write Checks (and any other `bankAccountsOnly` picker) shows only the currently selected bank.

Fix: when the dropdown opens, if the current input value exactly matches a known account's `code - name`, treat it as "no active search" and show the full allowed list. The user can then either pick a different option or start typing to filter. This is global — applies to every account picker (banks, expenses, etc.).

## Bug 2 — Make Deposits doesn't auto-fill the project default bank

In `MakeDepositsContent`, an effect on `parentActiveTab === 'make-deposits'` calls `createNewDeposit()` which clears `bankAccount`/`bankAccountId`. The auto-fill effect should refill from `useProjectDefaultBankAccountId`, but `defaultBankAccountId` may not be resolved at that moment and the auto-fill condition (`!bankAccountId && defaultBankAccountId`) silently skips. Write Checks works because it doesn't run a similar reset on tab activation.

Fix: after `createNewDeposit()` clears the bank, the existing auto-fill effect already covers the case once `defaultBankAccountId` resolves — but we need to make sure it re-runs after the reset. Adjust by:
- Having `createNewDeposit()` immediately seed the bank fields from `defaultBankAccountId` + `accounts` when both are available, instead of leaving them empty.
- Keep the existing effect as a fallback for when the default hook resolves later.

## Files touched (frontend only)

- `src/components/AccountSearchInput.tsx` — show full list when input value matches an existing account (per-field, not just bank).
- `src/components/transactions/MakeDepositsContent.tsx` — seed default bank inside `createNewDeposit()` when available.

No database, RLS, or schema changes.