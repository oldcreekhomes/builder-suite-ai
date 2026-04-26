## Goal
Make the Purchase Orders cost-code hover tooltip use the exact same clean format as the Manage Bills tooltip (e.g. `2120: Permit Fees   $299.11` per row, then a `Total:` row).

## Current behavior (PO)
`src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx` renders each grouped cost code as a two-line block: a bold `code: name` header, then an indented `Unassigned: $amount` sub-row, then the Total. This is visually busier than the bills tooltip.

## Target behavior (matches Manage Bills)
From `src/components/bills/BillsApprovalTable.tsx` (lines ~772–788):
- One row per cost code: left = `code: name`, right = formatted amount
- Bottom border-separated `Total:` row
- No "Unassigned:" sub-line, no nested indentation

## Change
In `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx`, replace the `TooltipContent` body (lines ~84–102) with the bills-style flat layout:

```tsx
<TooltipContent className="max-w-xs">
  <div className="space-y-1">
    {groupedLines.map((g, i) => (
      <div key={i} className="flex justify-between gap-4 text-xs">
        <span>{g.code}: {g.name}</span>
        <span>${g.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    ))}
    <div className="border-t pt-1 flex justify-between gap-4 font-medium text-xs">
      <span>Total:</span>
      <span>${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
    </div>
  </div>
</TooltipContent>
```

No data/grouping logic changes — only the presentation inside the tooltip.

## Files modified
- `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx` (tooltip JSX only)