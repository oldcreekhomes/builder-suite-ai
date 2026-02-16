

## Add Billing Tooltip to PO Details Dialog

### What Changes

When a PO line item has billing against it (even just 1 invoice), hovering over the "Billed" amount will show a tooltip listing each invoice with its reference number, date, and amount.

### Changes Required

**`src/hooks/useVendorPurchaseOrders.ts`**

- Expand the `bill_lines` query that fetches line-level billing to also join the parent `bill` record: `reference_number`, `bill_date`, and `id`
- Add a new `billed_invoices` array to the `POLineItem` interface:
  ```
  billed_invoices: Array<{ bill_id: string; reference_number: string; bill_date: string; amount: number }>
  ```
- Group fetched bill lines by `purchase_order_line_id` and populate each line item's `billed_invoices` array
- Similarly, for unallocated PO-level billing, add `unallocated_invoices` to the `VendorPurchaseOrder` interface so the Unallocated row can also have a tooltip

**`src/components/bills/PODetailsDialog.tsx`**

- Import `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` from `@/components/ui/tooltip`
- Wrap the Billed cell content in a `Tooltip` when `line.billed_invoices.length > 0`
- Tooltip content shows a small table/list:
  - Header: "Invoices Billed"
  - Each row: Reference number, date, and amount (e.g., "INV0010 | 02/15/2026 | $7,000.00")
  - Footer: Total if more than 1 invoice
- Style the billed amount with a dotted underline (`border-b border-dotted`) to hint it's hoverable
- Apply the same tooltip pattern to the Unallocated row if it has invoices

### Result
- Hovering over "$7,000.00" on the "2nd floor" row shows: "INV0010 | 02/15/2026 | $7,000.00"
- Works for any line with 1 or more invoices billed against it
- Consistent with existing tooltip patterns used elsewhere in the app (bank register, etc.)
