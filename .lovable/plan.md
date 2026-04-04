

## Add "Asset Valuation" Card to Dashboard

### Overview
Add a new card to the dashboard — do NOT remove or replace any existing cards. The new "Asset Valuation" card tells the valuation story: NOI ÷ Cap Rate = Value, minus Loan = Equity.

### Changes

**1. `src/hooks/useApartmentInputs.ts`**
- Add two new computed fields:
  - `assetValue`: `target_cap_rate > 0 ? noi / (target_cap_rate / 100) : 0`
  - `equityCreated`: `assetValue - loanAmount`

**2. `src/pages/apartments/ApartmentDashboard.tsx`**
- Add a new "Asset Valuation" card in a new row below the existing four cards. Contents:
  - Net Operating Income (NOI) — bold
  - Cap Rate (from `target_cap_rate` input)
  - Divider
  - Asset Value (NOI ÷ Cap Rate) — bold
  - Loan Amount — destructive
  - Divider
  - Equity Created (Asset Value − Loan Amount) — bold
- If `target_cap_rate` is 0, show a hint to set it in Key Metrics tab.

### Files Changed
- `src/hooks/useApartmentInputs.ts`
- `src/pages/apartments/ApartmentDashboard.tsx`

