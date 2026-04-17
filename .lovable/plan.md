
## Add "Loan-to-Cost" to Loan Terms

Add an editable Loan-to-Cost (LTC) row directly below Loan-to-Value in the Loan Terms card on the Inputs page.

## Approach
- Add a new field `ltc` (numeric, percent) to the apartment inputs schema in `useApartmentInputs.ts` (state, defaults, load, save).
- Add a DB migration to add an `ltc numeric` column to the apartment inputs table (need to confirm exact table name — likely `apartment_inputs`).
- Render a new `EditableRow` in `src/pages/apartments/ApartmentInputs.tsx` Loan Terms card, placed between "Loan-to-Value" and "Interest Rate", using `format="percent"` with `decimals={1}`.

## Notes
- This is purely an editable input (like LTV is on this page) — no auto-calc tie-in unless you want it later (e.g., LTC × Total Costs to suggest a loan amount).

## Files
- `src/hooks/useApartmentInputs.ts` (add `ltc` field)
- `src/pages/apartments/ApartmentInputs.tsx` (add row in Loan Terms)
- New migration: add `ltc numeric default 0` column to apartment inputs table
