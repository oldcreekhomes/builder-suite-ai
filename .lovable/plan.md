

## Redesign PO Details Dialog -- Line-Item Level Tracking

### The Problem

The current PO Details Dialog shows aggregate numbers (total PO amount, total billed, total remaining) and a flat list of "Related Bills." It does not show what each line item on the PO is, how much has been billed against each specific line, or what remains per line. For a PO with 22 line items like this one ($42,343 total), the dialog is essentially useless.

Additionally, there is no database column to link a bill line to a specific PO **line item** -- only to the PO itself. So the system currently cannot track billing at the line-item level.

### What Changes

**1. Database: Add `purchase_order_line_id` column to `bill_lines`**

Add a nullable foreign key `purchase_order_line_id` referencing `purchase_order_lines(id)` on the `bill_lines` table. This allows each bill line to be linked to a specific PO line item (e.g., "2nd floor" on PO 2025-115E-0006), not just the PO as a whole.

**2. Redesign `PODetailsDialog.tsx` -- Line-Item Focused Layout**

Replace the current layout (3 summary cards + progress bar + related bills list) with:

- **Header**: PO number badge + status badge (On Track / Near Limit / Over Budget)
- **Summary row**: Three compact values inline -- PO Total | Billed to Date | Remaining
- **Main table**: Every PO line item as a row with these columns:
  - **Description** (e.g., "Ground floor", "2nd floor", "Windows")
  - **Cost Code** (e.g., 4370, 4395)
  - **PO Amount** (the line's budgeted amount)
  - **Billed** (sum of bill_lines linked to this specific PO line)
  - **Remaining** (PO Amount minus Billed)
- Each line shows a visual indicator: checkmark if fully billed, partial indicator if partially billed, empty if untouched
- **Totals row** at the bottom summing all columns

The "Related Bills" section is removed entirely from this dialog. The line-item table tells the full story.

**3. Update `POSelectionDropdown.tsx` -- Add PO Line Selection**

When a user selects a PO, if that PO has multiple line items, show a secondary dropdown or sub-menu allowing them to pick the specific line item (e.g., "2nd floor - $11,008"). This sets both `purchase_order_id` and `purchase_order_line_id` on the bill line.

For POs with a single line item, auto-assign the line without an extra step.

**4. Update bill save logic in `useBills.ts`**

When saving/updating bill lines, persist the `purchase_order_line_id` alongside the existing `purchase_order_id`. The `updateApprovedBill` mutation already handles safe field updates -- this adds one more safe field.

**5. Update `useVendorPurchaseOrders.ts`**

Extend the hook to also fetch PO line items and calculate per-line billed amounts using the new `purchase_order_line_id` column, so the dialog has all the data it needs.

### Technical Details

```text
bill_lines table change:
+---------------------------+------+-------------------------------------+
| Column                    | Type | Reference                           |
+---------------------------+------+-------------------------------------+
| purchase_order_line_id    | uuid | purchase_order_lines(id) ON DELETE SET NULL |
+---------------------------+------+-------------------------------------+
```

Files to modify:
- `src/components/bills/PODetailsDialog.tsx` -- full redesign
- `src/components/bills/POSelectionDropdown.tsx` -- add line-level selection
- `src/hooks/useVendorPurchaseOrders.ts` -- fetch line-level billing data
- `src/hooks/useBills.ts` -- persist `purchase_order_line_id`
- `src/components/bills/ManualBillEntry.tsx` -- pass line ID through
- `src/components/bills/EditBillDialog.tsx` -- pass line ID through
- `src/components/bills/EditExtractedBillDialog.tsx` -- pass line ID through
- Database migration: add column + foreign key

