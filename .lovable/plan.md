

## Replace Single Taxes Field with Tax Rate + Estimated Value Inputs

### Problem
Currently "Real Estate Taxes" is a single dollar input. The user wants two inputs — **Tax Rate (%)** and **Estimated Value ($)** — with the total taxes computed as `estimated_value * (tax_rate / 100)`.

### Database Migration
Add two new columns to `apartment_inputs`, keep the existing `taxes` column as the computed result (or remove it in favor of computing on the fly):

```sql
ALTER TABLE public.apartment_inputs
  ADD COLUMN tax_rate numeric NOT NULL DEFAULT 2.0,
  ADD COLUMN estimated_value numeric NOT NULL DEFAULT 25000000;
```

The `taxes` column will remain but will no longer be directly edited — it will be derived as `estimated_value * tax_rate / 100`. We keep it for backward compatibility but the hook will compute taxes from the two new fields.

### Hook Changes (`src/hooks/useApartmentInputs.ts`)
- Add `tax_rate` and `estimated_value` to the `ApartmentInputs` interface and `DEFAULT_INPUTS`
- In `computeFinancials`, compute `taxes = inputs.estimated_value * (inputs.tax_rate / 100)` and use that instead of `inputs.taxes`
- Add both new fields to `INPUT_FIELDS`

### UI Changes (`src/pages/apartments/ApartmentInputs.tsx`)
Replace the single "Real Estate Taxes ($)" `EditableRow` with three rows:
1. **Tax Rate (%)** — editable, field `tax_rate`, suffix `%`
2. **Estimated Value ($)** — editable, field `estimated_value`, prefix `$`
3. **Total Taxes ($)** — read-only computed display showing `fmt(estimated_value * tax_rate / 100)`

### Other Pages
Dashboard, Income Statement, and Amortization Schedule already consume `computed.totalOpEx` and the taxes value flows through `computeFinancials` — no changes needed on those pages since taxes will now be computed from the two new fields automatically.

### Files Changed
- New migration SQL
- `src/hooks/useApartmentInputs.ts` — add `tax_rate`, `estimated_value`; compute taxes
- `src/pages/apartments/ApartmentInputs.tsx` — replace single taxes row with three rows
- `src/integrations/supabase/types.ts` — update generated types

