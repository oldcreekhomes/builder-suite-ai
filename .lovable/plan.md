## Cost Code "Multiple" → Hover Breakdown

In `src/components/transactions/ReconciliationReviewDialog.tsx`, replace the current "Multiple" label in the Cost Code column with an inline pill showing the first cost code + a `+N` badge. On hover (shadcn `HoverCard` / `Tooltip`), show a breakdown table:

- Cost Code (e.g. `4200 - Excavation, Backfill`)
- Amount for that cost code (sum of line amounts on that transaction with that cost code)
- Total row at the bottom matching the transaction's total

### Data changes
- Instead of collapsing lines into a distinct string of cost codes, build `costCodeBreakdown: { code: string; amount: number }[]` per transaction by grouping `bill_lines` / `check_lines` by `cost_code_display` and summing `amount` (cent-precise).
- Keep single-cost-code rendering as-is (plain text).
- For 2+ codes: render first code + `+{n-1}` trigger; hover reveals breakdown with currency formatted to 2 decimals and a Total row.

### Scope
- Applies to Checks, Bill Payments, and Deposits sections (all use the same Cost Code column).
- No DB or edge function changes.
- No changes to Description logic from the previous turn.