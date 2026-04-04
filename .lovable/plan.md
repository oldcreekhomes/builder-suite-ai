

## Interconnect Apartment Pages with Persistent, Auto-Saving Inputs

### Problem
All four apartment pages are completely independent. The Inputs page uses local React state that resets on navigation. The Dashboard, Income Statement, and Amortization Schedule all display hardcoded values. Nothing is saved to the database, and no data flows between pages.

### Solution

1. **Database table** — Create an `apartment_inputs` table to persist all input values per project, with RLS so users only access their own data.

2. **Shared hook** (`src/hooks/useApartmentInputs.ts`) — A single React Query hook that:
   - Fetches inputs from `apartment_inputs` for the current project
   - Provides an `updateInput` function that auto-saves each field change to Supabase with debouncing (no save button needed)
   - Computes all derived values (NOI, debt service, DSCR, cash flow, etc.) from the raw inputs
   - Is consumed by all four apartment pages

3. **Update all four pages** to use the shared hook instead of hardcoded values:
   - **Inputs page**: Binds fields to the hook's data and calls `updateInput` on change (auto-saves with debounce)
   - **Dashboard**: Displays computed values from the hook
   - **Income Statement**: Displays computed values from the hook
   - **Amortization Schedule**: Uses loan amount, rate, and term from the hook to generate the schedule

### Database Migration

```sql
CREATE TABLE public.apartment_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  number_of_units integer NOT NULL DEFAULT 200,
  avg_rent_per_unit numeric NOT NULL DEFAULT 1500,
  vacancy_rate numeric NOT NULL DEFAULT 5,
  purchase_price numeric NOT NULL DEFAULT 25000000,
  ltv numeric NOT NULL DEFAULT 75,
  interest_rate numeric NOT NULL DEFAULT 6.5,
  amortization_years integer NOT NULL DEFAULT 30,
  loan_term_years integer NOT NULL DEFAULT 30,
  taxes numeric NOT NULL DEFAULT 500000,
  insurance numeric NOT NULL DEFAULT 250000,
  utilities numeric NOT NULL DEFAULT 200000,
  repairs_maintenance numeric NOT NULL DEFAULT 180000,
  management_fee_percent numeric NOT NULL DEFAULT 5,
  payroll numeric NOT NULL DEFAULT 200000,
  general_admin numeric NOT NULL DEFAULT 100000,
  marketing numeric NOT NULL DEFAULT 50000,
  reserves_per_unit numeric NOT NULL DEFAULT 295,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(project_id)
);

ALTER TABLE public.apartment_inputs ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their own rows
CREATE POLICY "Users can manage their own apartment inputs"
  ON public.apartment_inputs FOR ALL
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Employees can access their owner's rows
CREATE POLICY "Employees can access owner apartment inputs"
  ON public.apartment_inputs FOR ALL
  TO authenticated
  USING (owner_id IN (SELECT home_builder_id FROM public.users WHERE id = auth.uid()))
  WITH CHECK (owner_id IN (SELECT home_builder_id FROM public.users WHERE id = auth.uid()));
```

### New File: `src/hooks/useApartmentInputs.ts`

- Uses `useQuery` to fetch the single row from `apartment_inputs` for the current `projectId`
- If no row exists, upserts one with defaults on first load
- Exposes `updateInput(field, value)` that debounces (300ms) and calls `supabase.from('apartment_inputs').update(...)` 
- Exposes a `computed` object with all derived financials:
  - Gross Potential Rent, Vacancy Loss, EGI
  - All expense line items, Total OpEx, Management Fee
  - NOI, Loan Amount, Annual Debt Service, DSCR
  - Cash Flow After Debt Service, Cap Rate, Cash-on-Cash, Price Per Unit, GRM, Expense Ratio

### Modified Files

- **`src/pages/apartments/ApartmentInputs.tsx`** — Replace `useState` with `useApartmentInputs()`. Each field calls `updateInput` on change (auto-saves).
- **`src/pages/apartments/ApartmentDashboard.tsx`** — Replace all hardcoded strings with formatted computed values from the hook.
- **`src/pages/apartments/ApartmentIncomeStatement.tsx`** — Replace all hardcoded strings with formatted computed values.
- **`src/pages/apartments/ApartmentAmortizationSchedule.tsx`** — Use loan amount, interest rate, and amortization years from the hook to generate the schedule dynamically.

### Auto-Save Behavior
The user types a value, the hook debounces for 300ms, then saves to Supabase. No save button. When the user navigates to another apartment page, the hook fetches the latest saved data from Supabase and computes all values fresh.

### Files Changed
- New migration SQL file
- New: `src/hooks/useApartmentInputs.ts`
- Modified: `src/pages/apartments/ApartmentInputs.tsx`
- Modified: `src/pages/apartments/ApartmentDashboard.tsx`
- Modified: `src/pages/apartments/ApartmentIncomeStatement.tsx`
- Modified: `src/pages/apartments/ApartmentAmortizationSchedule.tsx`

