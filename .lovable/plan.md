

## Plan: Match shadcn Default Table Exactly

### Root Cause
The rows are tall because the `SelectTrigger` has a default `h-10` (40px) height, and the checkbox is wrapped in an extra flex div. The shadcn default table rows are compact because they only contain text. To match while keeping inline selects, we need to shrink the select trigger height to fit within the default row padding.

### Changes — `src/components/budget/BudgetExcelImportDialog.tsx`

1. **Compact Select triggers**: Add `className="h-8"` to each `SelectTrigger` so the dropdown fits within the natural row height instead of inflating it to 40px+.

2. **Remove checkbox flex wrapper**: Replace the `<div className="flex items-center justify-center">` around the Checkbox with just the Checkbox itself. The `TableCell` already has `align-middle` from the base component (`p-2 align-middle`), which centers inline content. The Checkbox is an inline-block element and will center naturally without a wrapper.

3. **Remove `sticky top-0 bg-muted z-10` from TableHeader**: The shadcn default table header has no sticky behavior or background color. It uses the default `[&_tr]:border-b` only. Remove these overrides to match.

4. **Remove `border rounded-md` from container**: The shadcn default table has a clean bottom border on rows, no outer border or rounded corners on the container. Change `containerClassName` to just `"flex-1 overflow-auto"`.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx`

