

## Make Payment Group Rows Match Standard Table Row Styling

The payment header rows (e.g., "JZ Structural Con... | 2 items | $0.00 | Payment") currently use different styling than regular bill rows -- different font weights, smaller text for "2 items", bold amount, muted "Payment" text, and a background color that makes them visually distinct.

The fix is to make the payment header row use the exact same cell classes, font sizes, and spacing as `renderBillRow`, with only two differences:
1. A chevron arrow to the left of the vendor name
2. The cost code column shows "{N} items" in the same font style as cost codes

### Changes in `src/components/bills/BillsApprovalTable.tsx`

**Payment header row (lines 1230-1268):**
- Remove `bg-muted/30` background from the TableRow -- use the same default styling as regular rows
- Vendor cell: Keep the same `w-32 max-w-[128px]` and truncate classes, add chevron inline but use regular `block truncate` span (no `font-medium` -- match regular rows)
- Cost code cell: Change from `text-muted-foreground text-sm` to match regular cost code cell classes (`w-36 max-w-[144px] overflow-hidden`), display "{N} items" as a regular `block truncate` span with no special color
- Date cells: Same `w-20` with no extra styling
- Amount cell: Remove `font-medium` -- just display the currency value like regular rows
- Reference cell: Change from `text-muted-foreground text-sm` "Payment" to regular `w-24 max-w-[96px]` with `block truncate`, displaying "Payment" in default text color
- All remaining cells (memo, files, notes, etc.): Use identical classes as `renderBillRow`

**Child rows (lines 1272-1318):**
- Remove `bg-muted/10` background
- Use the same cell classes as regular rows but with left padding indent on the vendor cell
- "Credit Memo" and "Bill" type labels: use same default text styling (remove `text-green-600` and `text-muted-foreground`)
- Amount, reference, files cells: match regular row styling

This ensures every row in the table looks identical in font, spacing, and weight -- the only visual cue for grouped payments is the chevron arrow.

