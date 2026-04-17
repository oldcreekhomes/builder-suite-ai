
## Problem
Dashboard shows "Target Cap Rate" as `—` and Asset Valuation calc fails because there's no UI to enter `target_cap_rate`. The DB column and field already exist in `useApartmentInputs.ts` — only an input control is missing.

## Fix
Add a "Target Cap Rate" editable row to the **Property & Revenue** card in `src/pages/apartments/ApartmentInputs.tsx`, using the existing `EditableRow` with `format="percent"` and `decimals={2}`. Place it just below "Estimated Value" so it sits with the valuation-related inputs.

```tsx
<EditableRow
  label="Target Cap Rate"
  field="target_cap_rate"
  value={inputs.target_cap_rate}
  onChange={updateInput}
  format="percent"
  decimals={2}
/>
```

## Result
- User can enter a target cap rate (e.g. 5.50%).
- `computed.assetValue = noi / (target_cap_rate/100)` starts producing a real number.
- Dashboard "Target Cap Rate" row and Asset Valuation card auto-populate (no Dashboard changes needed — it already reads `inputs.target_cap_rate` and `computed.assetValue`).

## File
- `src/pages/apartments/ApartmentInputs.tsx` (add one row)
