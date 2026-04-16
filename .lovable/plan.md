
## Plan: Remove CapEx Reserve from Income Statement

### Understanding
User deleted CapEx Reserve from Inputs page (it's a removable row there). It still shows on the Income Statement page hardcoded. Just remove that one row from the IS — don't touch anything else (no "Per Unit" → "Monthly" rename this time).

### Change
In `src/pages/apartments/ApartmentIncomeStatement.tsx`, delete this single line:
```tsx
<StatementRow label="CapEx Reserve" annual={fmt(inputs.capex_reserve)} perUnit={perUnit(inputs.capex_reserve)} pct={pctEgi(inputs.capex_reserve)} />
```

### Out of scope
- No changes to `useApartmentInputs.ts` (field stays in interface — harmless, avoids breaking other consumers).
- No header rename, no monthly recalculation.
- No DB changes.

### Validation
1. Income Statement no longer shows the CapEx Reserve row.
2. All other rows and totals unchanged.
