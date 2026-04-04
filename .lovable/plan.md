

## Remove Expense & NOI Summary Card, Add Key Metrics Tab to Inputs

### Changes

**1. Delete "Expense & NOI Summary" card from Dashboard**
- In `src/pages/apartments/ApartmentDashboard.tsx`, remove the entire `<Card>` block (lines 67-91) containing the "Expense & NOI Summary" section. The Income Summary and Loan Summary cards already cover this data.

**2. Add "Key Metrics" tab to the Inputs page**
- Currently the Inputs page has no tabs — it's a single scrollable page with cards. We'll wrap the existing content in a Tabs component with two tabs: **Inputs** (existing content) and **Key Metrics** (new).
- The Key Metrics tab will display editable fields for commercial real estate metrics that are currently only computed/read-only on the Dashboard. This gives the user the ability to override or input target values.

**3. New database columns for Key Metrics**
- Add to `apartment_inputs` table:
  - `target_cap_rate` (numeric, default 0) — user-defined cap rate target
  - `target_dscr` (numeric, default 0) — user-defined DSCR target
  - `target_cash_on_cash` (numeric, default 0) — target cash-on-cash return
  - `target_irr` (numeric, default 0) — internal rate of return target
  - `target_grm` (numeric, default 0) — gross rent multiplier target
  - `exit_cap_rate` (numeric, default 0) — projected exit cap rate
  - `hold_period_years` (numeric, default 5) — investment hold period
  - `rent_growth_rate` (numeric, default 0) — annual rent growth assumption
  - `expense_growth_rate` (numeric, default 0) — annual expense growth assumption
  - `closing_costs` (numeric, default 0) — acquisition closing costs

**4. Key Metrics tab layout**
- Two-column card layout matching the Inputs page style:
  - **Left card — "Return Metrics"**: Target Cap Rate, Exit Cap Rate, Target Cash-on-Cash Return, Target IRR, Target DSCR, Target GRM
  - **Right card — "Growth & Hold Assumptions"**: Hold Period (years), Annual Rent Growth Rate, Annual Expense Growth Rate, Closing Costs
- Below the two cards, a read-only **"Computed vs. Target"** summary card showing side-by-side: actual Cap Rate vs target, actual DSCR vs target, actual Cash-on-Cash vs target, actual GRM vs target — so the user can instantly see how the deal stacks up against their targets.

**5. Update hooks and types**
- Add all new fields to `ApartmentInputs` interface, `DEFAULT_INPUTS`, and `INPUT_FIELDS` in `useApartmentInputs.ts`
- Add fields to `src/integrations/supabase/types.ts`

**6. Update sidebar navigation**
- No changes needed — the tabs live within the existing Inputs page route

### Files Changed
- New migration SQL (add 10 columns)
- `src/pages/apartments/ApartmentDashboard.tsx` — remove Expense & NOI Summary card
- `src/pages/apartments/ApartmentInputs.tsx` — wrap in Tabs, add Key Metrics tab
- `src/hooks/useApartmentInputs.ts` — add new fields
- `src/integrations/supabase/types.ts` — add new fields

