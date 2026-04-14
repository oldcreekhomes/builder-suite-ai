

## Fix: "This Bill" column not attributing amount to PO line item

### Problem
When a bill line is linked to a PO by `purchase_order_id` but has no `purchase_order_line_id`, the "This Bill" column at the line-item level shows "—" instead of the bill amount. This happens because:

1. **Tier 1** (explicit line match) fails — `purchase_order_line_id` is NULL
2. **Tier 2** (cost code match) fails — the bill uses cost code `3180.2` (Silt Fence) while the PO line uses `3180` (Sediment & Erosion Control) — different IDs despite being parent/child

The **Total** row is correct because it sums `pendingBillLines` directly, bypassing the per-line matching logic.

### Fix

Update `getPendingForLine` in `src/components/bills/PODetailsDialog.tsx` to add a fallback tier:

**New Tier 3 — Single-line PO fallback**: If a pending bill line has no `purchase_order_line_id` AND the cost code didn't match any PO line, but there is only **one** PO line in total, attribute the amount to that single line. This is safe because the bill line was already filtered to this specific PO before being passed in.

**New Tier 2.5 — Parent/child cost code matching**: Before the single-line fallback, add a check for parent-child cost code relationships (e.g., bill cost code `3180.2` starts with PO line cost code `3180`). This handles multi-line POs where subcodes are used on bills.

### Changes
- **File**: `src/components/bills/PODetailsDialog.tsx`
- **Scope**: Only the `getPendingForLine` function (~lines 122-154)

### Logic update
```text
Tier 1: Explicit purchase_order_line_id match (unchanged)
Tier 2: Exact cost_code_id match (unchanged)
Tier 2.5: Parent/child cost code match (NEW) — check if bill line's
          cost code string starts with PO line's cost code string
Tier 3: Single PO line fallback (NEW) — if only one line item exists
         and no other tier matched, attribute directly
```

### Technical details
- The parent/child check compares cost code strings (e.g., `"3180.2".startsWith("3180")`) using the cost code data already available in `lineItems`
- The single-line fallback only triggers when `lineItems.length === 1`, making it safe for multi-line POs
- No changes to `useVendorPurchaseOrders.ts` or any other file
- The total row calculation remains unchanged (it's already correct)

