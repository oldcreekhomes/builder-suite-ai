## Add "Created By" column to Purchase Orders table

Add a new column between **Company** and **Amount** on the project Purchase Orders table that shows the initials of the user who created each PO.

### Changes

1. **`src/hooks/usePurchaseOrders.ts`**
   - Collect unique `created_by` user IDs from fetched POs.
   - Fetch matching rows from `profiles` (id, first_name, last_name) and build a lookup map.
   - Attach `created_by_profile: { first_name, last_name }` to each enriched PO.

2. **`src/components/purchaseOrders/PurchaseOrdersTableHeader.tsx`**
   - Insert a new `<TableHead>Created By</TableHead>` between Company and Amount.

3. **`src/components/purchaseOrders/PurchaseOrdersTableRow.tsx`**
   - Insert a new `<TableCell>` in the same position rendering initials (e.g. "MG") from `item.created_by_profile`.
   - Compute initials: first letter of `first_name` + first letter of `last_name`, uppercased; fallback to "—" if unavailable.
   - Wrap in a small avatar-style badge (muted background circle) with a tooltip showing the full name for clarity.

4. **`src/components/purchaseOrders/PurchaseOrdersGroupHeader.tsx`** (if it uses a fixed `colSpan`)
   - Bump `colSpan` by 1 so the group header row spans the new column correctly.

### Notes

- No DB migration needed — `project_purchase_orders.created_by` already exists and is auto-stamped.
- Purely presentational; no business logic changes.
