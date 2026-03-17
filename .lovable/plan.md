

## Plan: Fix Table Flash, Remove Legend, Update Status Colors

### Issues Identified
1. **Table flash/resize**: The `Table` component has `containerClassName="relative w-full"` which removes the default `overflow-auto`, causing the table to render at full natural width before the dialog constrains it. This creates the 2-3 second flash of an unstyled narrow table.
2. **Sub-heading legend**: Lines 380-384 show "Direct code match", "Mapped from sub-code", "No match found" — remove this entirely.
3. **Blue → Yellow**: Change "mapped" status color from blue to yellow/amber and rename label to "Needs Review".

### Changes — `src/components/budget/BudgetExcelImportDialog.tsx`

1. **Fix table container**: Remove `containerClassName="relative w-full"` from `<Table>` so it uses the default `"relative w-full overflow-auto"`. The outer `div` already handles overflow, so either remove `containerClassName` or keep it but add `overflow-auto`.

2. **Remove legend sub-heading** (lines 380-384): Delete the entire second row of the summary bar with the icon explanations.

3. **Update summary bar** (line 365-366): Change `text-blue-500` → `text-yellow-600`, change label from "mapped" → "needs review".

4. **Update status icon in table rows** (line 449-450): Change `text-blue-500` → `text-yellow-600` for the mapped status checkmark.

5. **Rename status type display**: "mapped" becomes "needs review" anywhere visible to the user (the internal `matchStatus` value stays `'mapped'` — only the UI label/color changes).

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx`

