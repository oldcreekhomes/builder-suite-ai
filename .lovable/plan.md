Update the Transactions > Reconcile Accounts screen app-wide so it uses the project’s default bank account and only offers reconcilable accounts.

Plan:
1. **Default selection**
   - Change the Reconcile Accounts initial selection so the project default bank account (`project_default_bank_accounts`, falling back to global `accounts.is_default_bank`) takes priority over the saved local browser selection.
   - If the saved browser selection is no longer valid for the project/reconcilable list, replace it with the project default.
   - This will make 126 Longview Drive default to Capital One when Capital One is the project default.

2. **Dropdown filtering**
   - Replace the current broad `asset` filter with a reconcilable-account filter:
     - include active project bank accounts (`accounts.subtype = 'bank'`), respecting project chart-of-account exclusions;
     - include active project credit card accounts (`accounts.subtype = 'credit_card'`), respecting exclusions.
   - Exclude non-reconcilable accounts like Deposits, Clearing, Loans, Land, WIP, Ask Owner, etc.

3. **Label and naming**
   - Change the field label from **Bank Account** to **Account**.
   - Change the dropdown placeholder from “Select a bank account...” to “Select an account...”.

4. **Validation/compatibility**
   - Keep the existing reconciliation transaction logic intact; only change the account selector/default behavior in this pass.
   - Keep stored selection behavior only as a fallback after validating it against the allowed accounts and project default.