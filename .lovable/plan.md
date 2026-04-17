
The Dashboard reads `inputs.number_of_units` (legacy field, still 18) instead of computing `market_units + affordable_units`. The hook already exposes `computed.units` which sums them correctly.

## Fix
In `src/pages/apartments/ApartmentDashboard.tsx`, replace any display of `inputs.number_of_units` with `computed.units` (or destructure `units` from `computed`). Same for "Average Rent per Unit" — should likely show market rent or be removed since rents now differ; per screenshot it shows `$4,400/mo` which equals `market_rent`, so keep as `inputs.market_rent`.

## Validation
- Number of Units rows (Income Summary + Property Assumptions) → show 19 (18 + 1)
- Average Rent per Unit → continues to show market rent
