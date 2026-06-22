## Goal
Make the "Deposit To (Bank Account)" field on Make Deposits show the project's renamed default bank account (e.g. "John Marshall Bank") instead of the underlying base name ("Atlantic Union Bank"), and ensure the dropdown options only ever list bank accounts that are enabled on this project — using the project's renamed labels.

## What's actually happening
- 1010 is the project's default deposit account, and its project-level name override is "John Marshall Bank". The deposit page IS auto-selecting account 1010 — it's just rendering it as `1010 - Atlantic Union Bank` (the base `accounts.name`), so it looks like the wrong account.
- The dropdown component (`AccountSearchInput` with `bankAccountsOnly`) already honors `project_account_exclusions` and project name overrides for the options it renders. The bug is only in the auto-fill / reset codepaths that build the displayed string from `acct.code - acct.name`.

## Changes

1. **`src/components/transactions/MakeDepositsContent.tsx`**
   - Load project name overrides via `useProjectAccountNames(projectId)` (same hook `AccountSearchInput` uses).
   - Replace the three places that build `` `${acct.code} - ${acct.name}` `` for the bank field (lines ~104, ~260, ~423) with the override-aware label: `` `${acct.code} - ${overrides?.get(acct.id) ?? acct.name}` ``.
   - Also apply this to the `onAccountSelect` handler at ~973 so picking an option from the dropdown writes the override name back into the input, not the base name.

2. **`src/pages/MakeDeposits.tsx`** (the older standalone page that still ships the same field at lines 444–450)
   - Same override-aware substitution for the `onAccountSelect` handler so behavior matches the embedded version.

3. **`src/components/transactions/WriteChecksContent.tsx`** (for parity, since it has the identical auto-fill bug at lines 149, 517, 1213)
   - Apply the same override-aware label substitution so renamed bank accounts also display correctly on Write Checks.

4. **Verification on `/project/350e5951.../accounting/transactions`** (Make Deposits tab)
   - Confirm the Deposit To field auto-fills as `1010 - John Marshall Bank` (the override) instead of `1010 - Atlantic Union Bank`.
   - Confirm the dropdown only lists in-project bank accounts (John Marshall Bank, Capital One) and that selecting one preserves the renamed label.
   - Spot-check Write Checks for the same behavior.

## Non-goals
- No changes to default-bank resolution logic, exclusions, or `subtype` filtering — those are already correct.
- No schema/migration changes.
