

## Fix Row Heights for Payment Group Rows

The payment header rows and child rows use `h-[41px]` which doesn't match the natural height of regular bill rows. Regular rows are taller because they wrap content in `TooltipProvider > Tooltip > TooltipTrigger` components, which adds vertical space.

### Fix

In `src/components/bills/BillsApprovalTable.tsx`:

1. **Remove `h-[41px]`** from both the payment header `TableRow` (line 1233) and child `TableRow` (line 1282).

2. **Wrap content in Tooltip components** in the payment header and child rows — matching the exact same `TooltipProvider > Tooltip > TooltipTrigger > span.block.truncate` pattern used in `renderBillRow`. This ensures the DOM structure and natural padding/height are identical.

Specifically, wrap the following cells in tooltips (same as `renderBillRow`):
- **Header row**: Vendor name, "{N} items" text, amount, "Payment" reference
- **Child rows**: "Credit Memo"/"Bill" label, cost code, amounts, reference number

This makes every row structurally identical to standard bill rows, producing uniform natural height without any hardcoded pixel values.

