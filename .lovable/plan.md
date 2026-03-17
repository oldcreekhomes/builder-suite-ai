

## Plan: Restore Conditional Dialog Width

The dialog was changed to always use `sm:max-w-4xl` to prevent a resize flash between steps. But this makes the upload step unnecessarily wide. The fix is to bring back the conditional sizing.

### Change — `src/components/budget/BudgetExcelImportDialog.tsx`

Line 326: Change the fixed width back to conditional:
```tsx
<DialogContent className={`${step === 'review' ? 'sm:max-w-4xl' : 'sm:max-w-md'} max-h-[90vh] flex flex-col`}>
```

This restores the compact upload dialog while keeping the wide review table. The original "glitch" concern is negligible since the steps are user-triggered (clicking "Parse & Match"), not an automatic transition.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` (1 line)

