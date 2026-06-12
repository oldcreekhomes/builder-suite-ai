## Plan

1. **Fix the Write Checks update path**
   - Update the shared `useChecks` update mutation so `bank_account_id` is an allowed update field.
   - When an existing check is saved, persist the selected bank account to `checks.bank_account_id`.
   - Ensure recreated journal entry bank-credit lines use the updated bank account, so the bank register and accounting reports move with the check.

2. **Wire every Write Checks save button to pass the bank account**
   - Add `bank_account_id` to the update payload for:
     - `Save & New`
     - `Save & Close`
     - `Save Entry`
   - Apply this to the current Transactions Write Checks screen and the standalone Write Checks page for consistency.

3. **Harden bank account selection before save**
   - Resolve the bank account from the displayed text when possible, so selecting/typing `1015 - Capital One` cannot leave the hidden account id stuck on Atlantic Union.
   - Keep validation if no valid bank account can be resolved.

4. **Correct the current affected check shown in your screenshot**
   - Move check `OCH at Custis, LLC` dated `05/22/2026` for `$24,899.65` on project `1639 N Woodstock St` from Atlantic Union Bank to Capital One.
   - Update both:
     - the `checks` row
     - the related journal entry bank-credit line

## Technical notes

- Root cause found: existing-check updates currently save date, check number, payee, and amount, but they do **not** include `bank_account_id`, so the visible bank-account change is ignored.
- The current database row still points to `1010 - Atlantic Union Bank`; Capital One is account `1015 - Capital One`.