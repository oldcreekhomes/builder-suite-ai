

## Plan: Restore Default-Size Import Dialog

The dialog is currently forced to `sm:max-w-4xl` on line 326. The user wants it back to the standard shadcn default size (`max-w-lg`, ~512px) for **both** steps — upload and review.

### Change — `src/components/budget/BudgetExcelImportDialog.tsx`

**Line 326**: Remove the `sm:max-w-4xl` override so the dialog uses the shadcn default `max-w-lg`:

```tsx
// Before
<DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">

// After
<DialogContent className="max-h-[90vh] flex flex-col">
```

That is the only change. Nothing else is modified.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` (1 line)

