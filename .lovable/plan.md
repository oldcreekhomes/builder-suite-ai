# Fix the false -$3,200 balance blocking 1010 at 1416 N Longfellow

## What's actually wrong

Bill 260799 ($3,200) was first paid from **1010 Atlantic Union Bank**, then that payment was reversed and re-paid from **1015 Capital One**.

The register shows $0.00 because it nets the reversal. The Edit Project guard shows -$3,200 because of a real data defect:

- Original payment lines (credit 1010 $3,200) carry `project_id = Longfellow`.
- The **reversal** lines (debit 1010 $3,200) were written with `project_id = NULL`.

So when the guard sums this project's lines for 1010, it sees the credit but not the offsetting reversal debit.

Root cause: the database function `reverse_bill_payment` copies account, amounts and memo onto the reversal lines but does **not** copy `project_id`, `cost_code_id`, or `lot_id`. (The sibling function `reverse_consolidated_bill_payment` does copy them, which is why this only shows up sometimes.) There are 19 such reversal entries / 38 lines across the database with NULL project on their lines.

## The fix

1. **Repair the function** — recreate `reverse_bill_payment` so reversal lines inherit `project_id`, `cost_code_id` and `lot_id` from the line they reverse, matching the consolidated version.
2. **Backfill Longfellow only** — set `project_id` (and cost code / lot) on the reversal lines of the two reversal entries for bill 260799 from the lines they reverse. After that, Longfellow 1010 nets to exactly $0.00 and the account can be disabled.
3. Leave every other project's data untouched. The remaining orphaned reversal lines elsewhere are reported to you separately; say the word and they get the same backfill.

## Technical notes

- Migration recreates `public.reverse_bill_payment` with the three extra columns in the `INSERT INTO public.journal_entry_lines` inside its reversal loop; no signature change, no caller changes.
- Backfill is a scoped `UPDATE public.journal_entry_lines l SET project_id = o.project_id, cost_code_id = o.cost_code_id, lot_id = o.lot_id FROM public.journal_entry_lines o WHERE l.reverses_line_id = o.id AND l.project_id IS NULL` restricted to the two reversal entries `52699a40-...` and `e7fc4180-...`.
- No change to `ProjectAccountsTab.tsx` — its guard is correct once the underlying lines are correct.

## Verification

Re-sum Longfellow's 1010 journal lines (expect debit = credit, balance $0.00), then toggle 1010 off in Edit Project → Chart of Accounts and confirm no error. Confirm the Longfellow general ledger and balance sheet are unchanged.
