
## Plan: Split Rent into Market Rent + Affordable Rent

### Inputs page changes (`ApartmentInputs.tsx`)
Replace "Number of Units / Average Rent per Unit" rows in **Property & Revenue** with:

- **Market Rent** — two editable inputs side-by-side: `market_units` × `market_rent` (default 18 × $4,400)
- **Affordable Rent** — two editable inputs: `affordable_units` × `affordable_rent` (default 1 × $2,800)

Vacancy Rate, Total Costs, Estimated Value rows stay as-is.

### Calculation change (`useApartmentInputs.ts`)
- Add 4 new fields to `ApartmentInputs` interface + DEFAULT_INPUTS: `market_units`, `market_rent`, `affordable_units`, `affordable_rent`.
- New GPR formula:
  ```
  grossPotentialRent = (market_units × market_rent + affordable_units × affordable_rent) × 12
  ```
- Update `units` (used elsewhere for reserves, price/unit) to `market_units + affordable_units`.
- Keep legacy `number_of_units` / `avg_rent_per_unit` fields in DB untouched (read but unused for GPR) so nothing else breaks.

### Income Statement (`ApartmentIncomeStatement.tsx`)
No changes — it already reads `computed.grossPotentialRent`, which will reflect the new formula automatically.

### Database migration
Add 4 numeric columns to `apartment_inputs`:
- `market_units` (default 18)
- `market_rent` (default 4400)
- `affordable_units` (default 1)
- `affordable_rent` (default 2800)

### UI sketch for the new rows
```text
Market Rent              [ 18 ] x  [ $4,400 ]
Affordable Rent          [  1 ] x  [ $2,800 ]
```
Both numbers per row are editable; display formats as integer × currency.

### Validation
- Defaults render: Market 18 × $4,400, Affordable 1 × $2,800.
- Income Statement GPR = (18×4400 + 1×2800) × 12 = $984,000.
- Editing any of the 4 fields updates GPR live; vacancy/EGI/NOI cascade correctly.
