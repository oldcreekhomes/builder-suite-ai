# Remove duplicate memorized checks and stop it happening again

## What happened
Each time you clicked Memorize before the fix, the app saved the check's name and amount first, then failed when saving the 19 lot lines. The two failed tries left behind entries with no lines. That's why you now see three "Erica Gray - Monthly Interest" entries.

## Fix
1. **Clean up:** Delete the two broken Erica Gray entries (the ones with no lines). Keep the working one, which has all 19 lots.
2. **Prevent it:** If saving the lines fails, the app deletes the half-saved entry right away, so a failed Memorize leaves nothing behind.

## Technical details
- Data cleanup (run_sql): delete `recurring_transactions` rows named "Erica Gray - Monthly Interest" for project 691271e6-e46f-4745-8efb-200500e819f0 that have zero `recurring_transaction_lines`.
- `src/hooks/useRecurringTransactions.ts` `createRecurring`: on `lineError`, delete the parent row by id before throwing.
