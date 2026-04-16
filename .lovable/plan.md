
## Investigation + Plan: Per Unit → Monthly column

### Current calculation (confirmed from code)
In `ApartmentIncomeStatement.tsx`:
```ts
const units = inputs.number_of_units || 1;  // 18
const perUnit = (v: number) => fmt(v / units);
```
So today the "Per Unit" column divides annual values by **number_of_units (18)**, NOT by 12 months. Example: Insurance $14,040 / 18 = $780 ✓ matches your screenshot. You are correct — it's dividing by units, not months.

### Confirmation #1: Are annual values truly annualized?
Yes. Spot-checks against your screenshot confirm everything in the Annual column is a full-year figure:
- Insurance: $14,040/yr = $1,170/mo
- Utilities: $4,320/yr = $360/mo
- Management: 2.0% × EGI $923,400 = $18,468/yr ✓
- Taxes: $143,010/yr (estimated_value × tax_rate)
- Vacancy: 5% × GPR $972,000 = $48,600/yr ✓

All Annual figures are correctly annualized. Nothing is being double-counted or mis-scaled.

### Confirmation #2: "Per Unit" is wrong as labeled-and-intended
You want **monthly totals** (annual ÷ 12), not per-unit-annual (annual ÷ 18). Current code does the latter.

### Change
In `src/pages/apartments/ApartmentIncomeStatement.tsx`:
1. Rename column header `"Per Unit"` → `"Monthly"`.
2. Replace the `perUnit` helper:
   ```ts
   const monthly = (v: number) => fmt(v / 12);
   ```
3. Update every row currently using `perUnit(...)` to use `monthly(...)` — Gross Potential Rent, Vacancy, EGI, all expense rows, Total OpEx, NOI, Debt Service, Cash Flow After Debt.

Validation against your screenshot after change:
- Insurance Monthly: $14,040 / 12 = **$1,170**
- EGI Monthly: $923,400 / 12 = **$76,950**
- NOI Monthly: (NOI annual) / 12

### Out of scope
- Annual column (correct already).
- % of EGI column (correct already).
- Calculations / DB / Inputs page.
