Fix the "View as entered" toggle in `src/components/bills/BillPOSummaryDialog.tsx` to keep the exact same grouped row shape as the default view — one row per cost-code + description with the "All N lots" cell and hover — but ordered in the sequence the lines were originally typed on the bill.

## Change
- Replace the current `enteredRows` (one row per raw bill_line, which was expanding lots) with a re-sorted version of the existing `sortedGroups`.
- Sort order for entered mode: by the `created_at` (then `id`) of the **first bill_line** that landed in each group. This mirrors the order the user typed rows on the bill editor.
- Grouped mode remains untouched (default cost-code ordering).
- No other behavior, columns, totals, tooltips, or files change.
