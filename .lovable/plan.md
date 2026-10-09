# Fix "View as entered" order on the PO Status Summary

## What's wrong (confirmed)
"View as entered" sorts rows by the time each line was saved. All lines on bill 26753 were saved at the exact same moment, so the order falls back to a random ID. That's why Storm Install and Fine Grade jumped to the top after this morning's penny fix.

The bill already stores each line's position (line 1, 2, 3...), which matches the invoice order: Remaining Mobilization, Erosion Control, Cut to Fill, Fine Grade, Storm Install, Storm Materials, Water Install, Water Materials, 2 Waterline Extension.

## Change
- "View as entered" orders rows by each line's position on the bill (smallest line number in the group), falling back to save time only when the position is missing.
- "View grouped" stays the same.
- Applies on every tab where the summary opens.

## Technical details
- `src/components/bills/BillPOSummaryDialog.tsx`: add `line_number` to `BillLine`; `groupFirstEntry` ranks by min `line_number`, then `created_at`, then id.
- Make sure the bill_lines passed into the dialog include `line_number` (check the callers' selects).
