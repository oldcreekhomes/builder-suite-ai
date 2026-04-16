
## Plan: Add Monthly + Annual columns to Operating Expenses

### Behavior
For each currency expense in the Operating Expenses cards, show two columns on the right:
- **Monthly** — editable; entered as **per-unit per-month** dollars (e.g. $65)
- **Annual** — read-only; computed as `monthly × number_of_units × 12` (e.g. $65 × 18 × 12 = $14,040)

Annual is what's stored in the DB (existing field, already wired into the Income Statement) — nothing downstream changes.

### Special cases
- **Management Fee (%)** — still a single percent input; no monthly/annual split. Show value in the Annual column, leave Monthly blank.
- **Reserves per Unit** — already a per-unit annual number. Show as-is in Annual; Monthly = `reserves_per_unit / 12` (editable, recomputes annual on edit).
- **Taxes** — keep the existing Tax Rate / Estimated Value sub-rows. Computed taxes appear in Annual; Monthly = `taxes / 12` (read-only since taxes are derived).

### UI changes (`src/pages/apartments/ApartmentInputs.tsx`)
1. Add a small column header row at the top of each Operating Expenses card:
   ```
   [label]                          Monthly        Annual
   ```
2. Update `RemovableEditableRow` (and `renderExpenseItem`) to render two right-aligned cells instead of one.
3. Edit handler for Monthly: parse number → multiply by `inputs.number_of_units * 12` → call existing `updateInput(field, annualString)`. Annual cell updates automatically from `inputs[field]`.
4. Empty Monthly cell for percent fields (Management Fee) and read-only Monthly for derived Taxes.

### Out of scope
- No DB schema changes (annual values still persist in current columns).
- No changes to Income Statement, Dashboard, or `useApartmentInputs` computations.
- Property & Revenue, Loan Terms, Key Metrics tabs unchanged.

### Validation
1. With 18 units, type `65` in Insurance Monthly → Annual shows `$14,040`; Income Statement reflects `$14,040`.
2. Change units to 20 → Insurance Annual recomputes to `$15,600` (Monthly stays `$65`).
3. Reserves per Unit: Monthly shows `$24.58` for `$295` annual.
4. Management Fee row shows `5.0%` in Annual column, Monthly cell blank.
5. Taxes row: Annual shows computed taxes; Monthly shows `annual / 12`, both read-only.
