

## Center the "..." Actions Button Across All Tables

### Problem
The three-dot actions button is left-aligned (or right-aligned via wrapper divs) in table cells, appearing off-center in the Actions column.

### Solution
Add `mx-auto` to the trigger `Button` inside the shared `TableRowActions` component. Since every table uses this single component, this one-line change centers the dots across all 77+ tables at once.

### Change

**`src/components/ui/table-row-actions.tsx`** (line 59)

Change:
```tsx
<Button variant="ghost" className="h-8 w-8 p-0">
```
To:
```tsx
<Button variant="ghost" className="h-8 w-8 p-0 mx-auto">
```

This also requires removing any `justify-end` wrapper divs around `TableRowActions` in individual table files (like BankStatementsDialog) so the centering isn't overridden. The Actions `TableHead` already uses `text-right` or similar -- those headers should switch to `text-center` to match.

### Files Modified
- `src/components/ui/table-row-actions.tsx` -- add `mx-auto` to button
- `src/components/accounting/BankStatementsDialog.tsx` -- change Actions header to `text-center`, change wrapper div from `justify-end` to `justify-center`
- Any other table files with `justify-end` wrappers around `TableRowActions` will be updated to `justify-center` for consistency

