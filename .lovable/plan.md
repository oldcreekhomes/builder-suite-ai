

## Add PO Details Dialog on Badge Click in Extracted Bills Table

When users click the "Matched" (or other) PO Status badge in the "Enter with AI" table, open the existing PODetailsDialog showing the full PO breakdown -- PO Amount, Billed to Date, This Bill, Remaining -- so they can confirm the match before submitting.

### Changes

**File: `src/components/bills/BatchBillReviewTable.tsx`**

1. **Import** `PODetailsDialog` and `useVendorPurchaseOrders` hook
2. **Add state**: `poDialogBillId` to track which bill's PO dialog is open
3. **Fetch POs**: Use the `usePendingBillPOStatus` hook's query data to find the matched PO ID for the selected bill. Call `useVendorPurchaseOrders` with the selected bill's vendor/project to get detailed PO data for the dialog.
4. **Wire onClick**: Add `onClick` to the `POStatusBadge` to set `poDialogBillId` when clicked (only for non-"no_po" statuses)
5. **Render dialog**: Add `PODetailsDialog` at the bottom of the component, passing:
   - The matched PO from `useVendorPurchaseOrders`
   - `pendingBillLines` mapped from the bill's lines (cost_code_id + amount) so the "This Bill" column shows the current invoice allocation
   - `currentBillReference` and `currentBillAmount` from the bill data

### Technical Details

- The `usePendingBillPOStatus` hook already fetches PO data by vendor+project+cost_code. We will reuse that to identify which PO ID to display.
- We need to also fetch the full PO details (with line items, billed amounts) via `useVendorPurchaseOrders` to populate the dialog.
- The `pendingBillLines` prop on `PODetailsDialog` will map the extracted bill's lines to `{ cost_code_id, amount }` so the dialog shows the "This Bill" column with projected remaining balances.
- Only bills with a status other than "no_po" will have a clickable badge.
