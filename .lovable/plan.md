

## Match PO Cost Code Column to Bills Pattern

### Change: `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx`

Update the `renderCostCodeCell` function to exactly match the bills table pattern:

**Display text:**
- 1 unique cost code: show `code: name` (no change)
- Multiple unique cost codes: show just `+N` (e.g., `+3`) instead of `firstCostCode +2`

**Tooltip content:**
- Replace the `<table>` markup with the same `div`-based layout used in `BillsApprovalTable`:
  - Each cost code as a bold heading (`font-medium text-xs`)
  - Under each, show "Unassigned:" with the amount (since POs don't have lots, use a single "Unassigned" sub-line per cost code)
  - A `border-t` total row at the bottom with `flex justify-between`
- Use `max-w-xs` on `TooltipContent` instead of `p-0`
- Use `space-y-2` container like bills do

This makes the PO table visually identical to the bills table for multi-cost-code display.
