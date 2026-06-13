Edit Check dialog cleanup:

1. Header row spacing
   - Change the 4-column header grid template so Pay To consumes the leftover space evenly, making the gaps between Date↔Pay To, Pay To↔Check #, and Check #↔Bank Account visually equal. Use `grid-cols-[max-content_2fr_1fr_1fr]` (or equivalent auto sizing on Date) so Date only takes its natural width and Pay To absorbs the rest.

2. Description ↔ Action gap
   - Shrink the Action column span and grow the Description column span so there is no extra whitespace between the Description input and the +/trash buttons. Match the visual gap to the existing Account↔Amount and Amount↔Description gaps.
   - Applies to both header cells and row cells in expense and job-cost tabs.

3. Footer total consolidation
   - Remove the per-tab footer row ("Expense Total" / "Job Cost Total") entirely.
   - Remove the separate "Check Total: $X" line in the dialog footer.
   - In its place, render a single line at the bottom of the table that reads `Total   $X.XX` (no "Check" / "Expense" / "Job Cost" prefix), in the same styled muted footer band currently used by the per-tab total.
   - The dialog footer keeps only Cancel and Save Changes buttons, right-aligned.

Technical details:
- Only `src/components/checks/EditCheckDialog.tsx` changes.
- No save logic, no data, no totals math changes — only column spans, header grid template, and footer markup.