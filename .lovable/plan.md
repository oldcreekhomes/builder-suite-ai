

## Split Landscaping/Snow Removal, Remove Payroll, Rename Security

### Changes

**1. New database column**
- Add `snow_removal` column (numeric, default 0) to `apartment_inputs` table via migration

**2. `src/hooks/useApartmentInputs.ts`**
- Add `snow_removal: number` to `ApartmentInputs` interface
- Add `snow_removal: 0` to `DEFAULT_INPUTS`
- Remove `payroll` from `totalOpEx` calculation; add `inputs.snow_removal` instead
- Keep `payroll` in the interface/defaults so existing data doesn't break, but it won't be summed into expenses

**3. `src/pages/apartments/ApartmentInputs.tsx`**
- Replace single "Landscaping / Snow Removal" row with two rows: "Landscaping" (`landscaping` field) and "Snow Removal" (`snow_removal` field)
- Remove the "Payroll" `EditableRow`
- Change label "Security / Access Control" to "Security"

**4. `src/pages/apartments/ApartmentIncomeStatement.tsx`**
- Replace "Landscaping / Snow Removal" with two rows: "Landscaping" and "Snow Removal"
- Remove "Payroll" row
- Change "Security / Access Control" label to "Security"

**5. `src/integrations/supabase/types.ts`**
- Add `snow_removal` to the apartment_inputs type definitions

### Files Changed
- New migration SQL (add `snow_removal` column)
- `src/hooks/useApartmentInputs.ts`
- `src/pages/apartments/ApartmentInputs.tsx`
- `src/pages/apartments/ApartmentIncomeStatement.tsx`
- `src/integrations/supabase/types.ts`

