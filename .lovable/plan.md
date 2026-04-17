
Update the Dashboard "Property Assumptions" card to replace the single "Average Rent per Unit" row with two descriptive rows matching the Inputs page format.

## Change
In `src/pages/apartments/ApartmentDashboard.tsx`, in the Property Assumptions card, replace:
- `Average Rent per Unit` → `$4,400/mo`

With two rows:
- `Market Rate Units` → `18 × $4,400`
- `Affordable Rate Units` → `1 × $2,800`

Then keep Vacancy Rate, Operating Expense Ratio, and Target Cap Rate below them.

## Implementation
Use existing inputs already available: `inputs.market_units`, `inputs.market_rent`, `inputs.affordable_units`, `inputs.affordable_rent`. Format the value cell as `{units} × {fmt(rent)}` to mirror the Inputs page.

## File
- `src/pages/apartments/ApartmentDashboard.tsx` (Property Assumptions card only)
