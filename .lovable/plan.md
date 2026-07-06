## Goal

Delete the incorrect PO for Old Creek Homes at Nob Hill without changing application code.

## One-off data fix

1. Verify the target PO is exactly:
   - Project: `691271e6-e46f-4745-8efb-200500e819f0`
   - PO Number: `2026-100N-0025`
   - Company: Old Creek Homes, LLC
   - Amount: `$46,954.33`
2. Delete that single `project_purchase_orders` row directly from the database.
3. Do not modify code, email behavior, storage files, or any other purchase orders.
4. Refresh the Purchase Orders page and confirm it no longer appears.

## Technical details

This should be a data-only operation using the Supabase data tool, not a schema migration and not a frontend/backend code edit.