# Fix zero-balance account disabling

## Confirmed cause

For **6119 11th Street N / 1010 Atlantic Union Bank**, the current disable guard totals every project journal line, including reversal history, and therefore calculates **($9,900.00)**. The Balance Sheet applies the live-ledger rules—excluding reversal entries and entries linked to a reversal—and correctly calculates **$0.00**.

## Plan

1. Update the account-disable balance check in Edit Project → Chart of Accounts to use the same project scope and reversal filters as the Balance Sheet:
   - `is_reversal = false`
   - `reversed_by_id IS NULL`
   - `reversed_at IS NULL`
2. Calculate the result with cent-precise integer arithmetic so a true zero balance is not blocked by floating-point drift.
3. Keep the protection for accounts with a genuine live balance; only zero-balance accounts will become eligible to hide.
4. Verify that 1010 can be unchecked for **6119 11th Street only**, its project exclusion is saved, and the Balance Sheet remains balanced with the account hidden.

## Technical scope

Frontend logic only in the project Chart of Accounts disable guard. No journal entries, balances, or other projects' account settings will be changed.
