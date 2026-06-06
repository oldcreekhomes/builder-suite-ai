Fix the bank-account behavior exactly as intended:

1. **Correct Longview Drive’s project default**
   - Update Longview Drive’s per-project default bank from Capital One to Atlantic Union Bank, because Atlantic Union is currently the company-wide default bank for that tenant.
   - Keep Capital One available as another selectable bank account.

2. **Fix the Make Deposits bank selector**
   - Replace the current type-ahead account field for “Deposit To (Bank Account)” with the same bank-only selector behavior used for bank accounts elsewhere.
   - The dropdown will show only accounts with `subtype = 'bank'` and not excluded from the project.
   - For Longview Drive, that means the deposit dropdown should show Atlantic Union Bank and Capital One, not `1020 - Deposits`, `1030 - Clearing`, or other asset accounts.
   - Deposits will still default to the project default bank when starting a new deposit, but the user can freely choose another bank from the dropdown.

3. **Make default-bank changes reliably refresh the transaction screens**
   - When the star is changed in Edit Project → Chart of Accounts, invalidate the same query keys used by Write Checks, Make Deposits, Pay Bill, and Reconcile so those screens pick up the new project default without stale cached data.

4. **Clean up confusing copy in Edit Project**
   - Adjust the wording so it does not imply deposits are posted to a non-bank “Deposits” account by default.
   - Clarify that the star is only for the project’s default bank account, while Make Deposits still lets the user choose any available bank account.

Technical details:
- Modify `src/components/transactions/MakeDepositsContent.tsx` to use a bank-only selector for the Deposit To field.
- Extend/reuse `AccountSearchInput` behavior so empty focus opens bank options and bank-only filtering is enforced by `subtype = 'bank'`.
- Update `src/components/ProjectAccountsTab.tsx` query invalidation and instructional text.
- Apply a targeted data correction to `project_default_bank_accounts` for Longview Drive so its project default points to Atlantic Union Bank.