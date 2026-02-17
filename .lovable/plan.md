

## Standardize PO Details Table to Default shadcn/ui

### Problem
The PODetailsDialog table uses `text-xs` on every TableHead and TableCell, making it visually inconsistent with the PO Summary table (which uses default shadcn sizing).

### Fix (single file: `src/components/bills/PODetailsDialog.tsx`)

Remove all `text-xs` class overrides from TableHead and TableCell elements in the line items table. This brings the detail dialog in line with the summary dialog and the project's "Default Only" table policy.

Specifically:
- 6 TableHead elements (lines 186-191): remove `className="text-xs"`
- All TableCell elements in the data rows, unallocated row, and totals row: remove `text-xs` from className strings
- Keep semantic classes like `text-green-700`, `text-destructive`, `font-semibold` (those are functional, not style overrides)
- Keep the `SettingsTableWrapper`-equivalent border wrapper (`div className="border rounded-lg overflow-hidden"`) which is already correct

### Result
Both the PO Summary and PO Details dialogs will render with identical default shadcn table typography (14px text, default padding).

