

## Remove All `text-xs` Overrides from BatchBillReviewTable (Enter with AI)

### Problem
The "Enter with AI" tab (`BatchBillReviewTable.tsx`) has `text-xs` (12px) classes on the content inside nearly every `TableCell` -- on `<span>`, `<Badge>`, and other elements. The other tabs (Rejected, Approved, Paid) do not have these overrides, so they inherit the default `text-sm` (14px) from the shadcn/ui `<Table>` component. This is why the font sizes look different between tabs.

### Fix
Remove `text-xs` from all cell content elements inside `BatchBillReviewTable.tsx` so it inherits the same default `text-sm` as every other table. This is approximately 15-20 instances across the file.

### Specific removals (all in `BatchBillReviewTable.tsx`)

**Vendor column:**
- Line 700: `text-xs text-destructive font-medium` -> `text-destructive font-medium`
- Line 704: `h-5 px-1.5 text-xs font-normal ...` -> `h-5 px-1.5 font-normal ...`
- Line 718: `h-5 px-1.5 text-xs font-normal ...` -> `h-5 px-1.5 font-normal ...`
- Line 729: `text-xs block truncate` -> `block truncate`

**Cost Code column:**
- Line 742: `text-xs h-5` -> `h-5` (Badge)
- Line 747: `text-xs block truncate cursor-default` -> `block truncate cursor-default`

**Amount column:**
- Line 785: `text-xs font-medium` -> `font-medium`
- Line 787: `text-xs h-5` -> `h-5` (Badge)

**Reference column:**
- Line 793: `text-xs block truncate` -> `block truncate`

**Note:** `text-xs` inside TooltipContent (lines 755, 760, 823) and the tiny delete button (line 869) will be left as-is -- those are tooltip/decorative elements, not table cell content.

### Result
All bill tabs will render cell text at the same default `text-sm` size, producing identical font rendering across Enter with AI, Rejected, Approved, Paid, and Review.
