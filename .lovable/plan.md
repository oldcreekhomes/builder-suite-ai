# Redo the 6119 Job Costs lot report so Lot 1 + Lot 2 = job total

## Why it still looks wrong
The report can only show what's tagged in the books. At 6119, 39 job cost lines ($902,963.76) were saved with **no lot** — for example the Anchor Loans interest bills from Aug 2025 to Feb 2026 ($4,950 each), the $825,000 lot purchase, and $23,230 of Civil Engineering. Whatever the report does with untagged lines (add in full, split, or show separately), the lot totals can't be right until each line has its lot.

Your own later bills show how 6119 was split: Anchor Loans from Feb 2026 on is $2,475 Lot 1 / $2,475 Lot 2, every month.

## Fix
1. **Tag every untagged 6119 line to its lots.** Split each of the 39 lines 50/50 between Lot 1 and Lot 2 (to the penny, odd cent on Lot 2), on both the bill line and its accounting entry, the same way the later Anchor Loans bills are split. The job total, dates, payments, and reconciliations don't change. These are in closed months, so I'll unlock them only to change the lot, then lock them again.
2. **Before I change anything**, I'll send you the list of the 39 lines (vendor, invoice, cost code, amount, Lot 1 / Lot 2 split). If any line belongs to only one lot, tell me and I'll put it there instead.
3. **Report check:** after tagging, Lot 1 + Lot 2 must equal the whole-job report for every cost code, with nothing left in "Unassigned". I'll confirm this against the books, e.g. Civil Engineering: Lot 1 $14,231.00 + Lot 2 $14,231.00 = $28,462.00.
4. **Re-issue the 6119 spreadsheet** with the Lot column filled in on every line.

## Other jobs
Oxford, Nob Hill, Nelson, and Potomac are not touched. I'll give you their untagged lines separately so you can say which lot each belongs to.

## Already done (stays)
- New bills can't be saved without a lot on job cost lines (jobs with 2+ lots).
- Lot reports no longer guess. Untagged costs show in a separate "Unassigned" group that isn't counted in the lot's totals.

## Technical details
- Data change via SQL on `bill_lines` and `journal_entry_lines` (WIP and matching lines) for project `a50ae540-...`: for each null-lot job cost line, update it to Lot 1 at half and insert a Lot 2 copy for the remainder, keeping each journal entry balanced. Skip the closed-period guard only for this change.
- Verify with a query comparing per-lot sums with the project sum for each cost code.
