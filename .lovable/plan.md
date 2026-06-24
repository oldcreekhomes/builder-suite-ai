Add a tooltip to the Reference column in the Manage Bills table so hovering reveals the full invoice number when it is truncated.

## Technical details
- **File:** `src/components/bills/BillsApprovalTable.tsx`
- **Change:** Wrap the `<span className="block truncate">{bill.reference_number || '-'}</span>` at line 1098 in a `<Tooltip>` (using the already-imported TooltipProvider/Tooltip/TooltipTrigger/TooltipContent from `@/components/ui/tooltip`).
- The tooltip will show the full `bill.reference_number` text. If no reference number exists, it shows "-" and no tooltip is needed.
- This applies to all tabs using `BillsApprovalTable` (Draft, Review, Approved, Paid, etc.) since the Reference column is rendered once for all rows.