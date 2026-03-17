

## Plan: Fix Table Double-Container Resize Glitch

### Root Cause
The shadcn `Table` component wraps the `<table>` in a `<div>` with `"relative w-full overflow-auto"` by default. The import dialog also wraps the `Table` in an outer `<div className="flex-1 overflow-auto border rounded-md">` (line 391). These two nested overflow containers cause the table to render at natural width first (small), then resize once the dialog constrains it (big) — creating the visible flash.

### Fix
Remove the outer wrapper div's scroll responsibility and let the `Table` component's built-in container handle everything. Merge the styling (`flex-1 border rounded-md overflow-auto`) into the Table's `containerClassName` prop, and remove the redundant outer div.

### Changes — `src/components/budget/BudgetExcelImportDialog.tsx`

1. **Remove the outer wrapper div** (line 391 `<div className="flex-1 overflow-auto border rounded-md">` and its closing tag)
2. **Move those styles to Table's containerClassName**:
   ```tsx
   <Table className="table-fixed" containerClassName="flex-1 overflow-auto border rounded-md">
   ```

This eliminates the double-container and the resize flash — the table renders directly in a single scrollable container.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` — remove outer div wrapper, add `containerClassName` to Table

