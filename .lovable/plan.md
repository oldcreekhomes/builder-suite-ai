

## Make Loan Amount Editable with Standard Font

### Problem
1. "Loan Amount" row uses bold font (`Row` with `bold` prop) — should match the regular style of all other rows
2. Loan Amount is currently computed and read-only — user wants it editable as a direct input

### Solution

**1. New database column**
- Add `loan_amount` (numeric, default 0) to `apartment_inputs` table via migration

**2. `src/hooks/useApartmentInputs.ts`**
- Add `loan_amount: number` to interface and `DEFAULT_INPUTS` (default 0)
- Keep `computed.loanAmount` but change it: if `inputs.loan_amount > 0`, use that directly; otherwise fall back to `(purchase_price + construction_costs) * (ltv / 100)`. This way existing projects still work, and once the user types a value it takes over.

**3. `src/pages/apartments/ApartmentInputs.tsx`**
- Replace `<Row label="Loan Amount" value={fmt(computed.loanAmount)} bold />` with `<EditableRow label="Loan Amount" field="loan_amount" value={inputs.loan_amount} onChange={updateInput} format="currency" />`
- This gives it the same font/style as every other editable row

**4. `src/integrations/supabase/types.ts`**
- Add `loan_amount` to type definitions

### Files Changed
- New migration SQL
- `src/hooks/useApartmentInputs.ts`
- `src/pages/apartments/ApartmentInputs.tsx`
- `src/integrations/supabase/types.ts`

