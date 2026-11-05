# Fix 6119 Civil Engineering showing double on lot reports

## What's going on
The spreadsheet is right: total Civil Engineering (2050) at 6119 is **$28,462.00**.

Breakdown in the books:
- Lot 1: $2,616.00
- Lot 2: $2,616.00
- No lot assigned: $23,230.00 (13 bill lines)

The Job Costs report, when you pick a lot, adds the full "no lot" amount to that lot. So Lot 1 shows $2,616 + $23,230 = $25,846, and Lot 2 shows the same $25,846. The $23,230 is counted twice. Every other cost code with unassigned lines has the same problem.

## Fix
1. **Data (6119):** split the 13 unassigned 2050 lines 50/50 between Lot 1 and Lot 2 (cent-exact, remainder on the last lot), on both the bill lines and their journal entry lines. Also check other cost codes at 6119 for unassigned lines and split them the same way. Totals stay unchanged; closed months stay locked and are not touched beyond the lot tag.
2. **Report:** when a lot is selected, any remaining "no lot" amount is divided evenly across the project's lots instead of added in full to each one. Same for the PDF and emailed Job Costs. Then Lot 1 + Lot 2 always equals the project total.
3. **Test:** add a small test that two lots with an unassigned $23,230 show $11,615 each, and the lots sum to the total.

## Result
Civil Engineering: Lot 1 $14,231.00, Lot 2 $14,231.00, total $28,462.00, matching the spreadsheet.

## Technical details
- `src/components/reports/JobCostsContent.tsx` currently uses `lot_id.eq.X OR lot_id.is.null` (lines ~195, 279); replace with lot-matched lines plus null-lot lines allocated by lot count via a shared helper in `src/lib/`.
- Apply the same helper in `JobCostsPdfDocument.tsx` and `SendReportsDialog.tsx`.
- Data fix updates `bill_lines.lot_id` / split amounts and matching `journal_entry_lines`, keeping each entry balanced.
