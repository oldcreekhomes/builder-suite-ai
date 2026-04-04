

## Fix Apartments Page Crashing

### What I found
After reviewing all apartments files, the code is syntactically correct and the calculations have proper guards. The table exists in Supabase types. The RLS policies are correct.

The most likely crash causes are:

1. **Missing data guard**: When the pro forma is loaded from the database, the `inputs` JSON column could be `{}` (the DB default) instead of the full `ApartmentInputs` shape. If any field is `undefined`, operations like `value * 100` produce `NaN`, and accessing `.toFixed()` on `undefined` throws a runtime error.

2. **No ErrorBoundary around the detail view**: If ApartmentDetail crashes, the error propagates up to the app-level boundary and blanks the entire page.

3. **Unnecessary `as any` casts**: The table is in the Supabase types now, so these casts hide type errors.

### Plan

**1. Add input validation/defaults in `src/pages/Apartments.tsx`**
When loading items from the DB, merge each row's `inputs` with `DEFAULT_INPUTS` so missing fields get safe defaults:
```typescript
inputs: { ...DEFAULT_INPUTS, ...(d.inputs as Partial<ApartmentInputs>) }
```
Apply the same merge when selecting an item for detail view.

**2. Remove all `as any` casts in `src/pages/Apartments.tsx`**
The table is in the generated types — use proper typing so real errors surface at compile time instead of runtime.

**3. Wrap ApartmentDetail in an ErrorBoundary**
Add a route-level ErrorBoundary around the detail view so a calculation error shows "Something went wrong" with a retry button instead of blanking the page.

**4. Add null guards in `src/lib/apartmentCalculations.ts`**
Default each numeric input to `0` at the top of `calculateIncome` and `calculateAmortization` to handle any `undefined` or `NaN` values that slip through.

### Files changed
- `src/pages/Apartments.tsx` — merge defaults, remove `as any`, add ErrorBoundary
- `src/lib/apartmentCalculations.ts` — defensive defaults at calculation entry points

