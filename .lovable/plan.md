

## Match PO Details Billed Tooltip to Bills Table Style

### What's Wrong
The current tooltip in the PO Details Dialog uses a custom layout ("Invoices Billed" header, then a 3-column row per invoice). The user wants it to match the existing bills table tooltip pattern -- which uses grouped entries with bold labels, indented "label: $amount" rows, and a "Total:" footer separated by a border-top.

### Changes

**`src/components/bills/PODetailsDialog.tsx`** -- Update the `BilledAmountWithTooltip` component

Rewrite the tooltip content to match the bills table pattern (lines 862-880 of `BillsApprovalTable.tsx`):

- Group invoices by reference number (each invoice becomes a "group")
- For each invoice, show the reference number as a bold label (like the cost code name in the bills tooltip)
- Below each label, show an indented row with the date as the label and the amount as the value (matching the "Unassigned: $amount" pattern)
- At the bottom, add a `border-t pt-1` separator with "Total:" and the sum, matching the exact same classes used in the bills table tooltip
- Use `space-y-2` for the outer container, `font-medium text-xs` for headers, `pl-2 space-y-0.5` for indented rows, and `text-muted-foreground` for labels -- all identical to the bills table pattern
- Use `toLocaleString('en-US', { minimumFractionDigits: 2 })` for currency formatting to match the bills tooltip (instead of `Intl.NumberFormat`)

### Visual Result

Hovering over "$7,000.00" will show:

```text
INV0010
  11/19/25:    $7,000.00

Total:         $7,000.00
```

For multiple invoices it would show:

```text
INV0010
  11/19/25:    $4,000.00
INV0011
  12/01/25:    $3,000.00
---
Total:         $7,000.00
```

This exactly matches the grouped cost code tooltip style from the bills table.
