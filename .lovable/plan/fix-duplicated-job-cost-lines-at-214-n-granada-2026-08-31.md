# Fix duplicated job cost lines at 214 N Granada

## What I found

214 N Granada now has exactly **one lot** (Lot 1). The bills themselves are already correct — for example the Amazon bill 111-0368044-0951477 has a **single** bill line of $25.27 on Lot 1.

The problem is in the accounting entries behind those bills. The old two-lot split was never merged there, so each of these bills still has **two job cost lines**:

- 111-0368044-0951477 "Plastic knives, wall hooks, disposable spoon" — $12.64 + $12.63 (both already on Lot 1)
- 113-7114045-6367469 "Printer ink" — $12.72 + $12.71
- 113-1994699-8541844 "Key Lock box" — $8.47 + $8.46

That is why the Job Cost / account detail report shows two rows per transaction even though the bill shows one. The totals are correct; only the row count is wrong.

This is not limited to Amazon. Scanning the whole project, roughly 20 bills still carry split job cost lines from the two-lot era (Certified Mail $31.85, several $5,100 draws, 231.35, 176.28, and others).

## What I will do

1. For every bill at 214 N Granada, compare its bill lines to its journal entry job cost lines.
2. Where a bill has one line for a cost code but the journal entry has two or more lines for that same cost code, **merge them into a single line** carrying the full amount, on Lot 1.
3. Leave alone any bill that genuinely has multiple bill lines for the same cost code (those splits are real, not leftovers).
4. Confirm every affected journal entry still balances and every bill total is unchanged.

## Note

Your last sentence said every transaction should be on two lots, but the project is set to one lot and the earlier merge moved everything to Lot 1. I am proceeding with **one lot (Lot 1)** for everything, matching the rest of your message. Say the word if you actually want two lots restored instead.

## Technical detail

Data-only change: consolidate redundant `journal_entry_lines` rows (same journal entry, same account/cost code, same memo, all `lot_id` = Lot 1) into one row per bill line, keeping the summed debit. No offsetting AP credit lines change; no schema or code changes.
