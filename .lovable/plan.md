## One-time DB delete — no email, no code/UI changes

**Target PO:**
- `id`: `1947a15b-e94b-4ba7-bcff-6a2e77881b8f`
- `po_number`: `2026-214N-0001`
- Vendor: RC Fields & Associates, Inc.
- Cost Code: 2050 Civil Engineering
- Amount: $33,000
- Project: `b967fc5a-6ac6-4129-afe7-b67d51a5db05`

### What I will do
Run a single hard delete against `project_purchase_orders`. The existing FK from `purchase_order_lines.purchase_order_id` should cascade (or I'll delete lines first if needed). No email is sent because we are bypassing the `cancelAndDeletePurchaseOrder` mutation entirely and going straight to the database.

### SQL
```sql
-- Remove any line items first (safe even if cascade exists)
DELETE FROM public.purchase_order_lines
WHERE purchase_order_id = '1947a15b-e94b-4ba7-bcff-6a2e77881b8f';

-- Delete the PO header
DELETE FROM public.project_purchase_orders
WHERE id = '1947a15b-e94b-4ba7-bcff-6a2e77881b8f';
```

### What I will NOT do
- ❌ No call to `send-po-email` edge function → RC Fields will **not** receive a cancellation email
- ❌ No code changes
- ❌ No UI changes
- ❌ No changes to the other PO (`2026-214N-0002` — Good Life House Plans) — left untouched

### After delete
The PO will disappear from the Purchase Orders table on next refresh, freeing PO number `2026-214N-0001` from your active list (the project PO counter is not decremented, which matches existing behavior).
