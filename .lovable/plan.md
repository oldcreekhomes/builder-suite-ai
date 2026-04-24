## Plan

Update the `Edit Extracted Bill` table layout so Quantity and Unit Cost are easy to read without changing the invoice-style math you already approved.

### What will change
1. Keep the current grouped invoice-row behavior.
   - No change to the cost code behavior.
   - No change to the address tooltip.
   - No change to the new `Lot Cost` column concept.

2. Rebalance the Job Cost table widths.
   - Give `Quantity` and `Unit Cost` more room so values like `0.499999` and `$1,402.50` are fully visible.
   - Use the available horizontal space more efficiently instead of letting those numeric fields stay cramped.
   - Keep the dialog wide enough to support the invoice-style layout.

3. Make the inputs fill their columns properly.
   - Ensure the numeric inputs use the full cell width.
   - Prevent the current clipped appearance in the screenshot.

### Files to update
- `src/components/bills/EditExtractedBillDialog.tsx`

## Technical details
- Adjust the fixed table column widths in the Job Cost header and row cells.
- Likely reduce width from lower-priority columns such as Cost Code, Description, and/or Address.
- Increase `Quantity` and `Unit Cost` to larger widths that fit real invoice values.
- Keep `Total`, `Lot Cost`, `Purchase Order`, `Match`, and `Actions` aligned with the existing layout.
- Preserve all existing grouping, PO assignment, tooltips, save logic, and cent-precise math.

## Result
The dialog will keep the invoice-style presentation you liked, but the Quantity and Unit Cost values will be readable at a glance.