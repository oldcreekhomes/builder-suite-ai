

## Add Construction Costs, Loan Amount Input, and Amortization Summary

### Overview
Add a `construction_costs` field to Property & Revenue, add a `loan_amount` field to Loan Terms (replacing the computed LTV-based calculation), and add a loan summary header to the Amortization Schedule page.

### Changes

**1. New database column**
- Migration: add `construction_costs` numeric default 0 to `apartment_inputs`.

**2. `src/hooks/useApartmentInputs.ts`**
- Add `construction_costs: number` to `ApartmentInputs` interface and `DEFAULT_INPUTS` (default 0).
- Change `loanAmount` calculation: currently `purchase_price * (ltv / 100)`. The user wants a direct `loan_amount` input field instead. However, we also still have LTV — so the loan amount will be computed as `(purchase_price + construction_costs) * (ltv / 100)`. This way the user sees it as a read-only computed row in Loan Terms, derived from purchase price + construction costs and LTV. 

Actually, re-reading the request: "we need another line item for loan amount" and "the total loan amount, which should automatically update the loan amortization schedule." This suggests loan amount should be a **computed, non-editable** display row showing `(purchase_price + construction_costs) * ltv / 100`, so the amortization schedule uses the correct principal.

**3. `src/pages/apartments/ApartmentInputs.tsx`**
- Property & Revenue: add `EditableRow` for "Construction Costs" below Purchase Price (format currency).
- Loan Terms: add a read-only `Row` for "Loan Amount" showing `computed.loanAmount` (formatted as currency). This is not editable — it's derived from purchase price + construction costs × LTV.

**4. `src/hooks/useApartmentInputs.ts` — update loanAmount calculation**
- Change: `const loanAmount = (inputs.purchase_price + inputs.construction_costs) * (inputs.ltv / 100);`

**5. `src/pages/apartments/ApartmentAmortizationSchedule.tsx`**
- Add a summary card above the table showing key loan inputs: Loan Amount, Interest Rate, Amortization Period, Loan Term. These are read-only display rows pulled from `inputs` and `computed`.

**6. `src/integrations/supabase/types.ts`**
- Add `construction_costs` to the apartment_inputs type definitions.

### Files Changed
- New migration SQL (add `construction_costs` column)
- `src/hooks/useApartmentInputs.ts`
- `src/pages/apartments/ApartmentInputs.tsx`
- `src/pages/apartments/ApartmentAmortizationSchedule.tsx`
- `src/integrations/supabase/types.ts`

