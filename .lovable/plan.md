I will fix Edit Project so it has the bank-account dropdown the screenshot is missing.

Plan:
1. In `Edit Project → Chart of Accounts`, add a dedicated dropdown labeled `Deposit To Bank Account` above the account list.
2. Populate it only with active, included bank accounts where `accounts.subtype = 'bank'`, so for Longview Drive it should show `1010 - Atlantic Union Bank` and `1015 - Capital One`, not `1020 - Deposits`, `1030 - Clearing`, or other assets.
3. When a bank is picked from that dropdown, save it to the existing project bank setting used by Make Deposits, Write Checks, Pay Bill, and Reconcile.
4. Keep the account checklist for showing/hiding accounts, but stop relying on the tiny star as the primary way to choose the deposit bank; the dropdown will be the clear control.
5. After saving, invalidate the relevant cached queries so Make Deposits immediately sees the chosen bank list/default without stale data.

Technical details:
- Update `src/components/ProjectAccountsTab.tsx` only.
- Reuse the existing `project_default_bank_accounts` table and current mutation logic.
- Filter dropdown options to `account.type === 'asset'`, `account.subtype === 'bank'`, and not excluded for the project.