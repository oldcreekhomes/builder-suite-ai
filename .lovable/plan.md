

## Single-line rows in Job Cost Actual dialog

### What changes
In the actual-detail dialog (e.g. 2120 - Permit Fees), force every row onto a single line. Long values like "Department Of Environmental Quality" or "Receipt for Responsible Land Disturber certification" truncate with ellipsis instead of wrapping to two lines.

### Implementation (one file)
`src/components/reports/JobCostActualDialog.tsx`, in the body row at lines 451–490:

1. Add `className="whitespace-nowrap"` to the `<TableRow>` so all cells default to no-wrap.
2. For the **Name** cell (line 458) and **Description** cell (line 461):
   - Add `className="max-w-0 truncate"` to the `<TableCell>` (the `max-w-0` + table-layout lets flex/percent widths drive truncation rather than content).
   - Wrap the inner `<span>` in a `title={...}` attribute so the full text shows on hover tooltip.
   - Use `truncate block` on the span for ellipsis.
3. Set explicit column widths on the header (line 423) so truncation has a target:
   - Type 7%, Date 9%, Name 18%, Description 28%, Files 8%, Amount 10%, Balance 10%, Cleared 5%, Actions 5%.
4. Add `className="table-fixed"` to the `<Table>` (line 422) so the percent widths are honored.
5. No data, query, or sort changes. Footer unaffected.

### Verification
- Open Job Costs → Permit Fees actual dialog: every row is exactly one line tall.
- "Department Of Environmental Quality" and "Receipt for Responsible Land Disturber certification" show truncated with ellipsis; hovering shows full text.
- Files / Amount / Balance / Cleared / Actions columns remain aligned and fully visible.

### Files touched
- `src/components/reports/JobCostActualDialog.tsx` only.

