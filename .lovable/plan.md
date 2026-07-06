## Goal

Delete the incorrect PO `2026-100N-0025`. The bills on Manage Bills are NOT connected — the blocker is 19 rows in a staging table (`pending_bill_lines`, un-approved upload draft) that still point at the PO.

## Steps

1. Clear the PO pointers on those 19 staging rows only (`purchase_order_id`, `purchase_order_line_id`, `po_assignment` set to null). No bill data changes.
2. Delete the one `purchase_order_lines` row for this PO.
3. Delete PO `2726b35b-4858-4dfe-b23f-e1018616f55c` from `project_purchase_orders`.
4. Confirm it's gone.

No code changes. No touching approved bills.