## What is happening

The earlier fix did not fully work because the database column that stores reconciled transaction IDs is an array, but the backfill/trigger treated it like JSON. That means parts of the process silently produced an empty list and skipped many transactions instead of stamping them as cleared.

For 103 East Oxford / Atlantic Union Bank, I confirmed the database still has completed reconciliation IDs pointing at transactions that are not marked cleared:

- Bills: 55 still missing cleared markers
- Checks: 18 still missing cleared markers
- Deposits: 11 still missing cleared markers
- Journal entry lines: 1 still missing cleared marker

That is why the register still shows regular business statuses like Approved or Paid instead of Cleared.

## Plan

1. Correct the reconciliation sync function
   - Update `sync_reconciliation_row_flags()` so it reads `checked_transaction_ids` as an actual UUID array.
   - Keep the same safety behavior: only completed reconciliations stamp rows, and rows already tied to a different reconciliation are not overwritten.

2. Run a corrected global data backfill
   - Re-process every completed reconciliation across all jobs, builders, and bank accounts.
   - Stamp only these cleared-marker fields:
     - `reconciled = true`
     - `reconciliation_id`
     - `reconciliation_date`
     - `updated_at`
   - Do not change money amounts, dates, vendors, accounts, descriptions, or balances.

3. Fix the visible register status if needed
   - Review the report/register code path that displays the status badge.
   - Ensure a transaction with `reconciled = true` displays as Cleared instead of Approved/Paid.

4. Verify the result
   - Re-check 103 East Oxford / Atlantic Union Bank specifically.
   - Confirm completed reconciliation transaction IDs have no missing cleared markers.
   - Confirm future completed reconciliations will auto-stamp correctly.