
## Plan: Income Statement cleanup

### Changes to `src/pages/apartments/ApartmentIncomeStatement.tsx`
1. Remove the **CapEx Reserve** row from the Operating Expenses section (it's no longer in Inputs).
2. Rename the **"Per Unit"** column header to **"Monthly"**.
3. Update the per-unit cells to display **monthly per-unit** values instead of annual per-unit:
   - Replace `perUnit(v) = v / units` with `monthly(v) = v / units / 12`.
   - Apply to all rows including totals (NOI, EGI, Cash Flow After Debt, etc.) so the column is internally consistent.
   - The `% of EGI` column and Annual column remain unchanged.

### Out of scope
- No changes to Inputs page, calculations, or DB.
- No changes to the Reserves row (that's the per-unit reserve, separate from CapEx).

### Validation
1. CapEx Reserve row no longer appears on Income Statement.
2. Column header reads "Monthly".
3. Insurance Monthly shows `$65` (matches Inputs); Annual still `$14,040`.
4. Totals (EGI, NOI) show correct monthly per-unit values.
