

## Plan: Add Border Back to Import Table

The shadcn default table wraps in a `rounded-md border`. We removed it in the last change — need to add it back.

### Change — `src/components/budget/BudgetExcelImportDialog.tsx`

Line 391: Change `containerClassName="flex-1 overflow-auto"` to `containerClassName="flex-1 overflow-auto rounded-md border"`.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` (1 line)

