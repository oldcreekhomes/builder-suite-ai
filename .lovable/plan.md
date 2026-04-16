
## Plan: Make Income Statement dynamic from Inputs page

### Problem
Income Statement rows are hardcoded. When a user removes a row on the Inputs page (e.g. CapEx Reserve), it persists in localStorage as hidden — but the IS still shows it because it's not reading that visibility state.

### Investigation needed (during implementation)
1. Read `src/pages/apartments/ApartmentInputs.tsx` to find the localStorage key + shape used for tracking which expense rows are visible/hidden (per the `apartments/operating-expense-logic` memory: "visibility persisted in localStorage").
2. Confirm the list of toggleable expense fields and their labels.

### Approach
1. **Extract visibility state into a shared hook** — `src/hooks/useApartmentExpenseVisibility.ts`:
   - Reads the same localStorage key used by Inputs page.
   - Returns `{ visibleFields: Set<string>, isVisible: (field) => boolean }`.
   - Subscribes to `storage` events + a custom `apartment-expenses-changed` event so the IS updates live when the Inputs page toggles a row (same tab).
2. **Update `ApartmentInputs.tsx`** to dispatch `apartment-expenses-changed` whenever a row is added/removed (small change next to existing localStorage write).
3. **Update `ApartmentIncomeStatement.tsx`**:
   - Define an array describing each operating expense row (field key, label, value source).
   - `.filter(row => isVisible(row.field))` before rendering.
   - Always-visible rows (Taxes, Insurance core line, Management Fee, Reserves) stay rendered; only the toggleable ones go through the filter — matching Inputs page behavior.

### Files to change
- `src/hooks/useApartmentExpenseVisibility.ts` (new)
- `src/pages/apartments/ApartmentInputs.tsx` (dispatch event on toggle)
- `src/pages/apartments/ApartmentIncomeStatement.tsx` (data-driven rows + visibility filter)

### Out of scope
- DB schema, calculations, Dashboard, Inputs UI layout.
- Project-level scoping of visibility (stays in localStorage as it is today).

### Validation
1. On Inputs page, remove CapEx Reserve → IS page (already open in another tab or after navigation) no longer shows CapEx Reserve row.
2. Re-add CapEx Reserve on Inputs → IS shows it again with current value.
3. Toggle Landscaping, Snow Removal, etc. → IS reflects each change.
4. Totals (Total OpEx, NOI, Cash Flow) remain mathematically correct (calculations untouched; hidden rows still contribute $0 by user intent — confirm with user if hidden rows should also be excluded from totals; default: exclude from display only, since DB value is what feeds totals and user zeroed it out by removing).
