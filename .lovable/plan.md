
Plan: Fix the checkbox alignment and stop the review dialog from resizing.

What I found
- The checkbox is currently rendered directly inside the table cell, so it is no longer visually centered.
- The dialog width is conditional again: `sm:max-w-md` on upload, `sm:max-w-4xl` on review. That is the source of the resize/glitch.

Implementation
1. Re-center the checkbox in `src/components/budget/BudgetExcelImportDialog.tsx`
   - Restore a centered wrapper inside the first `TableCell`, using a simple flex container.
   - Explicitly set the checkbox to `h-4 w-4` so it matches the default shadcn size exactly.
   - Keep the checkbox column narrow and consistent so it stays centered relative to the row.

2. Remove the resize glitch in `src/components/budget/BudgetExcelImportDialog.tsx`
   - Change `DialogContent` back to a fixed large width: `sm:max-w-4xl`.
   - Do not use conditional width classes for upload vs review.
   - This ensures the dialog opens at the final review width immediately, so there is no small-to-large jump.

Expected result
- Checkbox matches the default shadcn checkbox size and is visually centered in its cell.
- The import dialog no longer shows a smaller layout first and then expands later.
- No unrelated styling changes beyond those two fixes.
