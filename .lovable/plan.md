## Plan

1. **Fix the remaining cleared-state gap for Atlantic Union Bank**
   - Treat the last completed reconciliation for 1010 - Atlantic Union Bank as the cutoff.
   - For project `103 East Oxford`, stamp every bank-register transaction dated on or before that cutoff as cleared when it belongs to account `1010 - Atlantic Union Bank`.
   - This includes the two row types still showing incorrectly in the screenshots:
     - `Bill Pmt - Check` rows from `bill_payments`
     - `Journal Entry` rows from `journal_entry_lines`

2. **Use the right reconciliation marker**
   - Attach those uncleared rows to the appropriate completed monthly reconciliation by transaction date.
   - Set the row to cleared with `reconciled = true`, `reconciliation_id`, and `reconciliation_date`.
   - Preserve existing reconciled rows and do not overwrite rows already attached to another reconciliation.

3. **Prevent this from coming back**
   - Update the reconciliation sync/backfill logic so future completed reconciliations mark all bank-side register rows consistently, not just source tables like `checks` and `deposits`.
   - Specifically include legacy/backfilled `bill_payments` and bank-side `journal_entry_lines`, because those are what the Account Detail dialog uses for the visible register.

4. **Verify after applying**
   - Run a read-only check for 103 East Oxford / Atlantic Union Bank showing:
     - zero `Paid` bill-payment rows dated on or before the last completed reconciliation that remain uncleared
     - zero `Approved` bank journal-entry rows dated on or before the last completed reconciliation that remain uncleared
     - checks and deposits still remain cleared

## Technical notes

- The earlier fix correctly stamped `checks` and `deposits`, which is why those show green `Cleared`.
- The attached screenshots are coming from `AccountDetailDialog`, which reads the bank register primarily from `journal_entry_lines` plus synthetic/consolidated `bill_payments` rows.
- Current database check shows the remaining issue is concentrated in:
  - `bill_payments`: all visible legacy rows are still missing reconciliation flags
  - `journal_entry_lines`: the bank-side lines behind many register rows are still missing reconciliation flags
- This should be a data correction plus a reconciliation-sync hardening change, not a frontend-only display workaround.