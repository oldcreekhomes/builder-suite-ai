

## Fix Table Styling to Match shadcn/ui Default Exactly

### Problem
Two deviations from the shadcn/ui default table remain:

1. **TableHead component** (`src/components/ui/table.tsx`): Uses `text-foreground` (dark/black headers) instead of the shadcn default `text-muted-foreground` (muted gray headers). This is why the headers look bold compared to the reference screenshot.

2. **`font-medium` on cell data**: The shadcn default table has NO `font-medium` on any body cell -- only headers use it. But our tables add `font-medium` to amount values:
   - `BatchBillReviewTable.tsx` line 785: Amount span has `font-medium`
   - `BatchBillReviewTable.tsx` line 700: Unmatched vendor name has `font-medium`
   - `PayBillsTable.tsx` line 986: Amount TableCell has `className="font-medium"`

### Changes

#### 1. `src/components/ui/table.tsx` -- Fix TableHead globally
- Change `text-foreground` to `text-muted-foreground` in the TableHead component (line 86)
- This single change fixes headers across the entire application to match shadcn default

#### 2. `src/components/bills/BatchBillReviewTable.tsx` -- Remove font-medium from cells
- Line 785: Change `font-medium` to nothing on amount span (keep just the tag)
- Line 700: Remove `font-medium` from unmatched vendor name span (keep `text-destructive truncate max-w-20`)

#### 3. `src/components/bills/PayBillsTable.tsx` -- Remove font-medium from Amount cell
- Line 986: Remove `font-medium` from the Amount TableCell className

### Result
Headers will be muted gray (matching the shadcn reference screenshot exactly), and all body cell text will be regular weight -- no bold anywhere in cell data, just like the default shadcn/ui table.
