

## Show Line Count with Tooltip Breakdown on PO Table

### Changes

**1. `src/hooks/usePurchaseOrders.ts`** -- Fetch full line data instead of just counts
- Change the `purchase_order_lines` query to select `cost_code_id, amount, description` (not just count)
- Group lines by PO and enrich each line with its cost code info from the existing `costCodeMap`
- Store full line objects on `purchase_order_lines` instead of empty arrays

**2. `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx`** -- Replace "Multiple" with `+N` tooltip
- Import Tooltip components
- Group PO lines by unique cost code (like bills do)
- For single cost code: show `code: name` as before
- For multiple cost codes: show first cost code + `+N` (e.g., "4370: Framing Labor +2")
- On hover, show tooltip with each cost code and its amount, plus a total row
- Matches the exact pattern from `PayBillsTable.tsx`

**3. `src/components/purchaseOrders/components/PurchaseOrdersTableRowActions.tsx`** -- Center the dots
- Add `text-center` to the `TableCell` so the `mx-auto` on the button properly centers it under the "Actions" header

