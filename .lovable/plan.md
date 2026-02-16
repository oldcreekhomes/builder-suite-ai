

## Fix PO Details Dialog: Remove Circles + Show Billed Amounts Per Line

### Two Issues

**1. Remove the status circles column**
The circles (empty, partial, checkmark) on the left side of each row add no value -- they're redundant with the Billed/Remaining columns. Remove that entire column.

**2. Distribute PO-level billing to line items by cost code**
Right now, the bill line for INV0010 ($7,000) has `purchase_order_id` set but `purchase_order_line_id` is NULL. The hook puts this into a PO-level bucket that only updates the header total, not individual line items. The "2nd floor" row shows $0.00 billed even though it shares the same cost code as the $7,000 bill line.

**Fix**: When bill lines are linked to a PO but NOT to a specific PO line, distribute them to matching PO lines by cost code. If the bill line's cost code matches a PO line's cost code, attribute that billing to that PO line.

### Changes

**`src/components/bills/PODetailsDialog.tsx`**
- Remove the status icon column (Circle, CircleDot, CheckCircle2) from the table
- Remove the empty first `TableHead` and `TableCell` with the icons
- Remove the imports for Circle, CircleDot, CheckCircle2

**`src/hooks/useVendorPurchaseOrders.ts`**
- After computing `billedByPoIdOnly` (bill lines with `purchase_order_id` but no `purchase_order_line_id`), distribute those amounts to PO line items by matching on `cost_code_id`
- For each such bill line, find the PO line(s) with the same cost code and attribute the billing there
- This way the "2nd floor" line (cost code 4370) picks up the $7,000 from INV0010
- If multiple PO lines share the same cost code, distribute proportionally or to the first match
- Update line-level `total_billed` and `remaining` accordingly
- Also fetch cost_code_id from the PO-level bill lines query so we can do the matching

### Result
After this fix:
- No circles cluttering the left side
- The "2nd floor" row will show: PO Amount $11,008.00 | Billed $7,000.00 | Remaining $4,008.00
- The header will continue showing: Billed to Date $7,000.00 | Remaining $35,343.00
