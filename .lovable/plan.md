## Plan

1. **Shorten the report type label**
   - In the Job Cost actual detail dialog, change manual journal rows from `Journal Entry` to `JE` so the Type column no longer runs into the Date column.

2. **Make Edit Bill amounts easier to read**
   - In the Edit Bill job-cost table, format Unit Cost and Total with comma separators and two decimals (for example `$6,300.00`).
   - Keep the existing fields and behavior otherwise unchanged.

3. **Fix the Woodstock split-line data**
   - Consolidate the duplicated Lot 1 split rows for 1639 N Woodstock so each transaction is represented as one Lot 1 line instead of two half-lines.
   - Apply this to the affected `bill_lines` and matching `journal_entry_lines`, preserving the same total amounts and leaving the bill totals balanced.
   - This will remove the duplicated $3,150 rows and show the Anchor Loans bills as single $6,300 Lot 1 lines.

4. **Verify after implementation**
   - Re-query the Woodstock data to confirm the Land Carrying Costs lines are no longer duplicated.
   - Confirm Lot 2 still has no transaction references so you can delete Lot 2 from Edit Project.