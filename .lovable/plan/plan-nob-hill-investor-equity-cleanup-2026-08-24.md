# Plan: Nob Hill investor equity cleanup

## Goal
Confirm and, only if needed, correct the Nob Hill equity allocation so:

- The 26 entries that were in **2905** are in **2905.1 Equity Partner #1**.
- **2905.2 Equity Partner #2** keeps its separate **$300,000** investor entry.
- No additional changes are made to 2905.2.

## Confirmed from the database
For Nob Hill (`691271e6-e46f-4745-8efb-200500e819f0`), the current equity journal line totals show:

- **2905.1** has the opening entry plus the moved 26 entries:
  - $731,000 opening balance
  - $265,000 moved from 2905
  - Total: **$996,000**
- **2905.2** has the separate **$300,000** entry dated 07/14/2026.
- No journal lines are currently showing on plain **2905** for Nob Hill in the equity account query.

## Steps
1. Re-check Nob Hill detail rows for accounts 2905, 2905.1, and 2905.2 across the related source tables, not just journal lines.
2. Verify the original 26 entries moved from 2905 are all on 2905.1 and still total exactly **$265,000**.
3. Verify the 07/14/2026 investor entry remains credited to **2905.2** for exactly **$300,000**.
4. If the database already matches this, make no data changes and report that no fix is required.
5. If anything from the 26-entry move accidentally hit 2905.2, update only those mistaken rows back to 2905.1.
6. Do not change, delete, reverse, or reclassify the separate 2905.2 $300,000 entry.

## Technical details
- This is a data-only verification/fix.
- Use `run_sql` only if a correction is required.
- No schema migration and no app code changes.
- Scope all queries and updates to Nob Hill only.
