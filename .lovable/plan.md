## Revert description sort, add "entry order" view

**What to change in `src/components/bills/BillPOSummaryDialog.tsx`:**

1. Remove the description sort toggle button, `descriptionSort` state, `ArrowUp`/`ArrowDown`/`ArrowUpDown` imports, and the description-sort branch in the sort logic.
2. Restore the Description header to plain text.
3. Add a new sort control on the **Cost Code** header (small grey `ArrowUpDown` button matching app convention) that toggles between:
   - **Default** — current cost-code ascending sort (grouped, as it is now)
   - **Entry order** — the original order the lines were entered on the bill (using each line's `created_at` ascending, falling back to line `id` for stability)

   Icon states: neutral `ArrowUpDown` = default cost-code sort; `ArrowDown` (or similar) = entry order active. Click toggles between the two.
4. When "entry order" is active, bypass the grouped-by-cost-code rendering and render each `bill_line` as its own row in original entry sequence, so the user sees the bill exactly as it was entered (no dedupe, no grouping, no re-sort).
5. Do NOT touch the numbers, hover popovers, lot logic, totals, or any other behavior.

### Technical notes
- Group construction stays intact for the default view.
- Entry-order view iterates `bill.bill_lines` sorted by `created_at asc, id asc` and renders one `TableRow` per line using the same cell components already used for the representative row.
- No changes to data fetching, mutations, or other files.
