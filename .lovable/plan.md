

## Standardize Budget Details Dialog to Match shadcn/ui Table Defaults

The dialog's inline tables use custom `<table>` elements with `p-3` padding, `bg-muted` headers, and `text-lg` totals — all inconsistent with the main budget table which uses the default shadcn/ui `Table` component with `p-2` cell padding, `h-10` headers, and standard `text-sm` sizing.

### What to fix

All 5 tabs have the same issues:
- **Cell padding**: `p-3` should be `p-2` (shadcn default)
- **Header height**: Custom `bg-muted` on raw `<thead>` instead of using shadcn `TableHeader`/`TableHead` components
- **Font sizing**: Total Budget uses `text-lg font-semibold` — should be `text-sm font-semibold` to match table density
- **Selected row**: `bg-blue-50` highlight should use `bg-muted` for consistency
- **Input heights**: Quantity edit inputs use custom styling instead of standard `h-8` sizing
- **Total footer spacing**: `pt-4` is excessive — should be `pt-2`

### Changes

**`src/components/budget/BudgetDetailsModal.tsx`**

Replace all raw `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements with the shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` components across all 5 tabs (Estimate, Vendor Bid, Manual, Historical inline tables). This automatically applies:
- `p-2` cell padding
- `h-10` header row height
- `text-muted-foreground` header text color
- `font-medium` header weight
- `border-b` row separators
- Proper `hover:bg-muted/50` on data rows

Additional normalizations:
- Total Budget footer: change `text-lg` to `text-sm`, reduce `pt-4` to `pt-2`
- Selected rows: change `bg-blue-50` to `bg-primary/5`
- Empty state padding: reduce `py-8` to `py-6`
- Total label: consistent "Total Budget:" wording across all tabs (PO tab currently says "Total Amount:")

**`src/components/budget/BudgetDetailsPurchaseOrderTab.tsx`**

Same treatment — replace raw table elements with shadcn Table components, normalize padding and total footer sizing.

### Files
1. `src/components/budget/BudgetDetailsModal.tsx` — replace raw tables with shadcn Table components, normalize spacing/fonts across all tabs
2. `src/components/budget/BudgetDetailsPurchaseOrderTab.tsx` — same shadcn Table standardization

