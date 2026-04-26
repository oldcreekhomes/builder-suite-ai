## Plan: Make Manage Bills Description Tooltips One Line Per Item

I’ll update the Manage Bills description tooltip behavior so each bill line description appears as its own row, with no bullet separators and no wrapping.

### Scope
This will apply across the Manage Bills tabs:
- Enter with AI
- Review
- Rejected
- Approved
- Paid

### Changes
1. **Enter with AI tab**
   - Update `BatchBillReviewTable` so description summaries are stored/rendered as an array of unique description lines instead of one bullet-joined string.
   - Remove the `•` separator.
   - Remove the tooltip max-width limit that forces wrapping.
   - Render each description as its own non-wrapping row.

2. **Review / Rejected / Paid tabs**
   - Confirm the existing `BillsApprovalTable` tooltip uses the same one-row-per-description format.
   - Remove any width constraint or wrapping behavior if still present.
   - Keep each unique description on a separate `whitespace-nowrap` row.

3. **Approved tab**
   - Check `PayBillsTable` for description/memo tooltip behavior.
   - If the Approved tab is missing the Description column/tooltips or uses different tooltip logic, align it with the same non-wrapping one-row-per-item behavior.

### Technical Notes
- The current visible issue is in `src/components/bills/BatchBillReviewTable.tsx`: `getMemoSummary` still returns `uniqueMemos.join(' • ')`, and the tooltip uses `max-w-xs` plus `whitespace-pre-wrap`, which creates the bullet and wrapping shown in your screenshot.
- The fix will replace that with array rendering like:

```text
Item #2 - Expanded Housing Option (EHO) Plat
Item #8 - Stormwater and Environmental Management
```

No database, business logic, or UI layout changes beyond the tooltip formatting.