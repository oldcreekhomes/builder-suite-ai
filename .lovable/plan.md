

## Fix Lot 507 Subtotals: Move Warranty Purchase from 2000s to 4000s

### Problem
The category subtotals don't match the spreadsheet:

| Category | Spreadsheet Target | Current DB | Difference |
|---|---|---|---|
| 1000 | $190,665.17 | $190,665.17 | ✓ |
| 2000 | $157,815.32 | $158,697.47 | **+$882.15** |
| 3000 | $61,726.60 | $61,726.60 | ✓ |
| 4000 | $335,083.01 | $334,200.86 | **-$882.15** |

### Root Cause
**Warranty Purchase ($882.15)** was mapped to cost code **2540** (parent_group 2000), but in the spreadsheet it's listed as **4855 - Warranty Purchase** under **4000 Homebuilding Costs**. Since there's no 4855 code in the database, per your instruction it should go into **4005 General Conditions**.

### Fix (2 data updates)

1. **Delete** the project_budgets row for Lot 507 with cost_code **2540** (Warranty Purchase, $882.15)
2. **Update** the project_budgets row for Lot 507 with cost_code **4005** (General Conditions): change `actual_amount` from **$3,706.35** → **$4,588.50** (adding the $882.15)

### Result
- 2000 subtotal: $158,697.47 − $882.15 = **$157,815.32** ✓
- 4000 subtotal: $334,200.86 + $882.15 = **$335,083.01** ✓
- Grand total unchanged: **$745,290.10**

