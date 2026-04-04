

## Fix Tax Rate Calculation

### Problem
The tax rate field is being divided by 100 in the calculation, but the user is entering the rate as a raw decimal (e.g., `0.01135`) rather than as a percentage (e.g., `1.135`). So `$3,000,000 × (0.01135 / 100) = $341` instead of the correct `$3,000,000 × 0.01135 = $34,050`.

### Solution
Change the tax calculation in `computeFinancials` to multiply directly without dividing by 100:

```ts
// Before
const taxes = inputs.estimated_value * (inputs.tax_rate / 100);

// After
const taxes = inputs.estimated_value * inputs.tax_rate;
```

Also update the `EditableRow` for Tax Rate from `format="percent"` to `format="number"` so it doesn't append a `%` sign, since the user is entering the raw decimal rate (not a percentage).

### Files Changed
- `src/hooks/useApartmentInputs.ts` — Remove `/100` from tax calculation
- `src/pages/apartments/ApartmentInputs.tsx` — Change Tax Rate format from `"percent"` to `"number"`

