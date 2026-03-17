

## Plan: Fix Double-Glitch and Center Checkbox

### Problem 1: Double Glitch (Dialog Resize Flash)
The dialog uses `sm:max-w-md` for upload step and `sm:max-w-4xl` for review step (line 326). When transitioning from upload → review, the dialog visibly resizes, causing a flash. The upload step also briefly appears before the review table renders.

**Fix**: Always use the large dialog size (`sm:max-w-4xl`) regardless of step. This eliminates the resize animation between steps.

### Problem 2: Checkbox Not Vertically Centered
The `TableCell` has `text-center align-middle` but the checkbox still sits high because `align-middle` only works for inline content. The checkbox is a block-level element that needs flex centering.

**Fix**: Wrap the checkbox cell content in a flex container with `items-center justify-center`, or change the TableCell to use flex layout for vertical centering:
```tsx
<TableCell>
  <div className="flex items-center justify-center">
    <Checkbox ... />
  </div>
</TableCell>
```

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx`
  1. Line 326: Change conditional class to always use `sm:max-w-4xl max-h-[90vh] flex flex-col`
  2. Lines 424-430: Wrap Checkbox in a `<div className="flex items-center justify-center">` for true vertical centering

