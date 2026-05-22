## Problem

When opening **Edit Purchase Order** for `2026-103E-0008` (Floor Joists, $12,334.12), the dialog shows an empty Cost Code, empty Description, and $0.00 Amount.

Root cause: this PO was created from a bid package and stored its values only on the header (`project_purchase_orders.cost_code_id` + `total_amount`). It has zero rows in `purchase_order_lines`. The dialog's seeding effect in `src/components/CreatePurchaseOrderDialog.tsx` only populates line items when `existingLines.length > 0`, so it falls back to one blank line.

## Fix

In `src/components/CreatePurchaseOrderDialog.tsx`, update the edit-mode seeding logic so that when an existing PO has no line items, the dialog seeds a single line from the PO header.

1. Keep the current effect that seeds lines from `existingLines` when `existingLines.length > 0`.
2. Add a sibling effect that runs when `open && editOrder && !hasInitializedRef.current && existingLines.length === 0` AND the `usePurchaseOrderLines` query is no longer loading. It seeds one line using:
   - `cost_code_id` = `editOrder.cost_code_id`
   - `cost_code_display` = `${editOrder.cost_codes.code} - ${editOrder.cost_codes.name}` (when available)
   - `description` = `editOrder.notes`-derived only if useful, otherwise empty
   - `quantity` = 1
   - `unit_cost` = `editOrder.total_amount ?? 0`
   - `amount` = `editOrder.total_amount ?? 0`
   - `extra` = `editOrder.extra ?? false`
   Then set `originalLinesSnapshot` to this seeded array and mark `hasInitializedRef.current = true`.
3. Expose `isLoading` from `usePurchaseOrderLines` (already returned) and gate the fallback on `!isLoading` so it doesn't race the real-lines effect.

No backend, schema, or other component changes. The Notes field, Company, and Attachments already populate correctly from `editOrder` in the existing init effect.

## Verification

- Open Edit on `2026-103E-0008` (Floor Joists, $12,334.12): dialog shows one line with cost code `4340 - Floor Joists`, qty 1, unit cost $12,334.12, amount $12,334.12, subtotal $12,334.12.
- Open Edit on a PO that already has multiple `purchase_order_lines` rows: behavior unchanged — all existing lines load as before.
- Lock behavior (sent POs) still applies: the seeded fallback row counts as an "original" line and Qty/Unit Cost remain locked once `sent_at` is set.
