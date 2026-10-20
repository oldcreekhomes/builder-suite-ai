# Move Oceanwatch $3,863.65 Resort Realty deposit to 3130 - Income

## What changes
- The 04/01/2026 Resort Realty ACH deposit at Oceanwatch is saved to 9150 - Ask Owner. It moves to 3130 - Income, both on the deposit and in the books.
- The bank side doesn't change. Atlantic Union Bank, the April reconciliation, and the deposit's cleared status stay exactly as they are.
- The amount and date stay the same.

## Effect on reports
- Balance Sheet: 9150 - Ask Owner goes from -$2,119.78 to +$1,743.87. That's the two OCH bills ($523.17 + $1,220.70) that are left.
- Balance Sheet: Current Year Earnings goes up by $3,863.65. Total Assets, Total Liabilities & Equity, bank and A/P don't change.
- Income Statement: 3130 - Income goes up by $3,863.65 in April 2026.
- Closed books: if April is closed, the change goes straight into the saved data without reopening it, and the lock stays on. That's the same way the 1020 Princess fix was done.

## Technical details
- Update `deposit_lines.account_id` for `d3ebec25-8856-450b-8a0a-c9762b5eda36` to 3130 (`5dfe07e2-1ba6-463d-93dd-5ae169d7ee5e`).
- Update `journal_entry_lines.account_id` for `e12dec75-a624-483c-8f89-9bdae9ed0978` (credit $3,863.65, JE `41dafef9…`) to the same account.
- Then confirm the bank line on that JE didn't change, the JE still balances, and 9150 and 3130 show the new balances.
