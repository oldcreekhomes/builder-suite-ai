

## UI Refinement: Cleaner Pending Column and Smarter Remaining Colors

### What changes

All changes are scoped to **content styling within `src/components/bills/PODetailsDialog.tsx`** only. No base table components (`table.tsx`, `TableHead`, `TableCell`, etc.) are modified. The `SettingsTableWrapper` pattern and all other 77+ tables remain untouched.

### Changes

**File: `src/components/bills/PODetailsDialog.tsx`**

1. **Rename column header** (line 174): "This Bill" becomes "Pending"
2. **Rename summary header label** (line 143): "This Bill" becomes "Pending (REF)" using `currentBillReference` so the user knows exactly which bill these amounts are from
3. **Summary pending amount** (line 145): Remove `text-green-700`, use default text color
4. **Summary remaining** (lines 150-156): Only apply `text-destructive` when `projectedRemaining < 0` (actually over budget). Otherwise use default text -- no green, no amber
5. **Line item pending cells** (line 206): Remove `text-green-700 bg-green-100` background highlight. Use plain `font-medium` (same as already used on remaining values in this dialog)
6. **Line item remaining cells** (lines 212-216): Only `text-destructive` when `lineProjectedRemaining < 0`. Remove green/amber coloring for the pending case
7. **Totals row pending** (line 248): Remove `text-green-700`
8. **Totals row remaining** (lines 252-257): Only red when negative, otherwise default

### What stays the same

- All base table components (table.tsx, TableHead, TableCell, etc.)
- SettingsTableWrapper pattern
- Every other table in the application
- The green highlighting on "Billed" column tooltips (existing approved bill indicators)
- Dialog width (already set to max-w-4xl)

### Result

- Red only appears as a genuine warning when the PO would go over budget
- "Pending (INV0021)" label immediately tells the user what bill these amounts belong to
- Clean, professional look with less color noise
- Zero impact on any other table in the application

