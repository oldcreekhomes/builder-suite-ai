# Flip the 1020 Princess survey fee entry (12/18/2025)

## What changes

Journal Entry #2, "OCH short on deposit because we paid survey fees", is currently recorded backwards. It will be flipped so it raises both survey costs and equity:

- 2055 Surveying (WIP 1430): **debit** $187.50 on each of Lots 1–4, $750.00 in total. This raises survey costs.
- 2905.1 OCH Equity: **credit** $750.00. This raises equity.

Nothing else changes: the date, description, lots and amounts stay the same. The entry belongs only to 1020 Princess.

## Expected result (Balance Sheet as of 12/31/2025)

- 1430 WIP: $9,490.00 becomes $10,990.00
- 2905.1 OCH Equity: -$750.00 becomes $750.00
- Total Assets = Total Liabilities & Equity = $10,990.00

Every closed month through July 2026 picks up the same $1,500 swing. Closed months stay locked, and bank reconciliations are not affected.

## Technical details

- A data-only fix on the 5 `journal_entry_lines` of journal entry `9a01c476-7bad-4f70-b94f-a1fd1e1c43f2`: swap the `debit` and `credit` amounts on each line.
- Afterward, check that the Balance Sheet balances at 12/31/2025 and 7/31/2026.
- No code changes.
