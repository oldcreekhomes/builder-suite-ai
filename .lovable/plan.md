

## New "Apartments" Pro Forma Tool (with Database Persistence)

### Overview
Add a new global menu item "Apartments" below Marketplace. The page has 4 tabs: **Inputs**, **Dashboard**, **Income Statement**, and **Amortization Schedule**. Users can create, save, and load multiple pro forma analyses. All calculations happen client-side in real-time; the database stores the inputs.

### Database

**New table: `apartment_pro_formas`**
- `id` (uuid, PK)
- `owner_id` (uuid, references auth.users, NOT NULL) — for multi-tenant RLS
- `name` (text, NOT NULL) — user-given name for the analysis
- `inputs` (jsonb, NOT NULL) — all form inputs stored as a single JSON object
- `created_at`, `updated_at` (timestamptz)

RLS policies: owner can CRUD their own rows. Employees can access their home_builder's rows (matching existing pattern).

This keeps the schema simple — one row per pro forma, with all inputs in a JSONB column. No need for dozens of columns since the inputs are always read/written as a unit.

### Inputs State Model (stored as JSONB)

```text
{
  // Property & Revenue
  totalUnits, avgMonthlyRent, otherIncomePerUnit,
  vacancyRate, creditLossRate,

  // Operating Expenses ($/unit/yr)
  propertyMgmtFee (% of EGI), realEstateTaxes, insurance,
  repairsMaint, landscaping, utilities, trash, pestControl,
  security, payroll, marketing, professionalFees, admin,
  reserveForReplacement, capexReserve, other,

  // Loan
  totalProjectCost, appraisedValue, loanAmount,
  interestRate, loanTermYears, amortYears, interestOnlyYears
}
```

### UI Flow
- `/apartments` page shows a list of saved pro formas (name, date, key metrics) with a "New Pro Forma" button
- Clicking one opens the 4-tab view
- **Inputs tab** has a Save button; auto-saves on tab switch or navigation away (using existing UnsavedChangesProvider pattern)
- Dashboard, Income Statement, and Amortization tabs are read-only calculated outputs

### Calculation Engine (`src/lib/apartmentCalculations.ts`)
Pure functions replicating the Excel exactly:
- GPR = units × rent × 12
- EGI = GPR + otherIncome − vacancy − creditLoss
- NOI = EGI − total operating expenses
- Monthly P&I via standard amortization formula
- Key metrics: DSCR, Cap Rate, Cash-on-Cash, LTV, LTC, Break-Even Occupancy

### Navigation
- Add "Apartments" link with Building icon below Marketplace in both `CompanyDashboardNav.tsx` and `SidebarNavigation.tsx`
- Add `/apartments` route in `App.tsx` (protected)

### File Structure

```text
src/pages/Apartments.tsx                             — List + detail view
src/components/apartments/ApartmentsList.tsx          — Saved pro formas list
src/components/apartments/ApartmentDetail.tsx         — 4-tab container
src/components/apartments/ApartmentInputsTab.tsx      — Editable form
src/components/apartments/ApartmentDashboardTab.tsx   — Executive dashboard
src/components/apartments/ApartmentIncomeTab.tsx      — Income statement table
src/components/apartments/ApartmentAmortizationTab.tsx — Amortization schedule
src/lib/apartmentCalculations.ts                     — All formulas
```

### Files changed
- New migration: create `apartment_pro_formas` table with RLS
- `src/pages/Apartments.tsx` (new)
- `src/components/apartments/*` (new, 6 files)
- `src/lib/apartmentCalculations.ts` (new)
- `src/App.tsx` — add route
- `src/components/sidebar/CompanyDashboardNav.tsx` — add nav link
- `src/components/sidebar/SidebarNavigation.tsx` — add nav link

