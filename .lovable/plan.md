

## Plan: Split Import into Two Separate Dialogs

The current single dialog tries to be both small (upload) and large (review table), causing the resize glitch. The fix is to use **two separate `Dialog` components** — one stays compact for upload, the other opens wide for review.

### Approach

Split the existing component so it renders **two `<Dialog>` elements**:

1. **Upload Dialog** — standard default size (`max-w-lg`), contains file picker and "Parse & Match" button. When parsing completes, this dialog closes and the review dialog opens.

2. **Review Dialog** — wide (`sm:max-w-4xl`), contains the summary bar, search, review table, and import button. "Back" closes this and reopens the upload dialog.

### Changes — `src/components/budget/BudgetExcelImportDialog.tsx`

- Add a second piece of state: `reviewOpen` (boolean).
- When `handleParse` succeeds: call `onOpenChange(false)` to close the upload dialog, then set `reviewOpen = true`.
- When "Back" is clicked in review: set `reviewOpen = false`, call `onOpenChange(true)` to reopen upload.
- When review is closed or import succeeds: set `reviewOpen = false` and reset state.
- Render two `<Dialog>` components side by side in the return:
  - First `<Dialog open={open}>` with `<DialogContent>` containing only the upload step (default width).
  - Second `<Dialog open={reviewOpen}>` with `<DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">` containing only the review step.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx`

No other files change. The parent component's `open`/`onOpenChange` props continue to control the upload dialog as before.

