# Fix the split Draw 1 row on bill 1036316-056 (N Potomac)

## What's actually wrong

Nothing "created a new line item" — the bill has 6 lines (3 lots x 2 draws), all the same cost code (4370 Framing Labor), all $3,696.88, all on PO 2026-2401N-0014. The Draw 1 rows are inconsistent in the data:

| Draw | Lot | Linked PO line |
|---|---|---|
| Draw 1 | 2405 A | none |
| Draw 1 | 2405 B | none |
| Draw 1 | 2405 C | PO line 1 |
| Draw 2 | 2405 A / B / C | PO line 1 |

The summary groups rows by (PO, PO line, description). Because 2405 C carries a PO line link and A/B do not, Draw 1 breaks into two rows: one with "+2" ($7,393.76) and one with "2405 C" ($3,696.88).

Second issue found: all links point at PO line 1, which is "2401 Framing Labor". These are 2405 lots, and 60% of PO line 2 ("2405 Framing Labor", $36,968.80) is exactly $22,181.28 — the bill total. The lines belong on PO line 2.

## The fix

1. Data correction (this bill only): point all 6 lines at PO line 2, "2405 Framing Labor". Amounts, totals and journal entries are untouched — only the PO line link changes.
2. Display fix so this cannot show up again: when lines share the same PO, cost code and description, lines with no PO line link group together with their linked siblings instead of forming a separate row.

## Result

Draw 1 and Draw 2 each show as one row with 3 lots ($11,090.64 each), bill total stays $22,181.28.

## Technical details

- SQL update on `bill_lines` for bill reference 1036316-056: set `purchase_order_line_id = bfb7c083-96e1-4f89-8758-468371d6ce36` on all 6 lines.
- `src/components/bills/BillPOSummaryDialog.tsx`: the grouping key currently is `poId::(purchase_order_line_id || cost_code_id)::memo`. Change to resolve a group's PO line per (poId, cost_code_id, memo) bucket first — if any line in that bucket has a `purchase_order_line_id`, lines with a null link join it; distinct non-null PO line ids still stay separate. Apply the same key in the "as entered" ordering map so both views match.
