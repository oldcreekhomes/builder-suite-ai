# Fix the falsely unbalanced Nob Hill journal entry

## Confirmed cause

The saved Nob Hill opening entry is balanced in the database:

- Debits: **$1,954,000.00**
- Credits: **$1,954,000.00**
- Difference: **$0.00**
- Lines: **765**

The Journal Entry screen currently requests lines for every manual entry in one Supabase query. That result is capped at 1,000 rows, while the current company has 1,303 manual journal lines. The Nob Hill entry is therefore loaded only partially in the browser, producing the false **$60,871.06** imbalance shown in the screenshot.

## Changes

1. Update the journal-entry loader to retrieve all journal lines with pagination and safely batch the journal-entry IDs.
2. Keep the database entry unchanged because its complete saved lines are already balanced and correct.
3. Preserve the existing account, cost-code, lot, reconciliation, and line-order data exactly.
4. Verify the Nob Hill entry renders all 765 lines and shows **Debits $1,954,000.00 | Credits $1,954,000.00** with no difference warning.
5. Verify navigation to other manual journal entries still loads their complete line sets.

## Technical details

Use the project’s established Supabase pagination utilities so neither the 1,000-row response limit nor long `.in()` URL limits can truncate journal lines as data grows.
