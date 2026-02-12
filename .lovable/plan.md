
# Add Purchase Order Dropdown to Edit Bill Dialog

## What Changes
Add a "Purchase Order" dropdown column to the Job Cost line items grid in the Edit Bill dialog, matching the exact same component (`POSelectionDropdown`) used in the manual bill entry form.

## Changes Required

### 1. Update the `ExpenseRow` interface (EditBillDialog.tsx)
Add a `purchaseOrderId` field to track the selected PO per line item.

### 2. Load existing `purchase_order_id` from bill lines
When populating job cost rows from the database, read `line.purchase_order_id` into the new `purchaseOrderId` field.

### 3. Add the Purchase Order column to the Job Cost grid
- Add a "Purchase Order" header column between "Total" and "Address" (or before "Action" if no address column)
- Adjust grid column spans to accommodate the new column (matching the manual entry layout: 4 cols for PO)
- Render `POSelectionDropdown` for each row, passing `projectId`, `vendorId` (from the bill's selected vendor), `value`, and `onChange`

### 4. Wire up the save logic
- **Draft bills** (`handleSave` / `updateBill`): Include `purchase_order_id` in the `BillLineData` objects
- **Approved bills** (`handleConfirmedSave` / `updateApprovedBill`): Add `purchase_order_id` to the line update type and the Supabase update call in `useBills.ts`

### 5. Update `updateApprovedBill` in useBills.ts
Add `purchase_order_id` to the allowed fields in the line update so approved/posted/paid bills can also have their PO assignment changed.

## Grid Layout (Job Cost tab)

**With Address column** (multi-lot): grid-cols-28
| Cost Code (4) | Memo (5) | Qty (2) | Cost (2) | Total (2) | Address (4) | Purchase Order (4) | Split (1) | Action (1) |

**Without Address column** (single-lot): grid-cols-24
| Cost Code (4) | Memo (7) | Qty (2) | Cost (2) | Total (2) | Purchase Order (4) | Action (1) |

## Technical Details

### Files Modified
1. **`src/components/bills/EditBillDialog.tsx`** -- Add `purchaseOrderId` to `ExpenseRow`, add PO column to grid, wire up save
2. **`src/hooks/useBills.ts`** -- Add `purchase_order_id` to `updateApprovedBill` line update type and Supabase call

### Key Behavior
- The dropdown uses the bill's currently selected `vendor` and `billData.project_id` to fetch applicable POs
- Existing `purchase_order_id` values from the database are pre-populated when editing
- Auto-match by cost code is the default when POs exist (same as manual entry)
- The info button next to the dropdown opens the PO details dialog (built into the component)
