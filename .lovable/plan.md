

## Hard-code Historical Actual Costs for Stevenson Ave Lot 501

### Data
- **Project:** `d9e400a0-f9b9-40c6-8b8e-183341e508f3` (6330 Stevenson Ave)
- **Lot:** `628440ae-79c9-4c7f-a067-d278ee45ebf9` (Lot 501)
- **Grand total:** $734,986.14

### Category subtotals (must match exactly)
| Category | Target |
|---|---|
| 1000 | $190,664.99 |
| 2000 | $156,054.55 |
| 3000 | $61,772.22 |
| 4000 | $326,494.38 |

### Mapping (same rules as Lot 507)

**Unmapped 4000s → 4005 General Conditions:**
- 4005.1 Foundation Issues ($845.36) + 4005 Back Charges Other ($163.93) + 4855 Warranty Purchase ($882.14) = **$1,891.43** → 4005

**4010 sub-codes by name:**
- 4010.1 Parking ($92.33) → 4010
- 4010.2 Office Supplies ($117.86) → 4040 Office Supplies
- 4010.3 Office ($4.28) → 4015 Office
- 4010.4 Project Manager ($11,521.52) → 4020 Project Manager
- 4010.5 Accounting ($97.58) → 4025 Accounting
- 4010.6 Other ($8.33) → 4030 Other

**Renumbered codes:**
- 4020 Drawings ($68.20) → 4050
- 4030 Signage ($114.97) → 4060
- 4040 Temporary Toilets ($319.52) → 4070
- 4110 Pest Control ($275.14) → 4300 Termite Treatment

**2000s unmapped → 2480 Misc Costs:**
- 2130 Affordable Housing ($6,475.28) + 2480 Misc ($14.86) = **$6,490.14** → 2480

**Skipped (zero actual):** 4590 Interior Trim Labor ($0.00), 4805 Curb & Gutter ($0.00)

**All remaining codes** map directly by number.

### Implementation
One database insert operation: ~80 INSERT rows into `project_budgets` with:
- `project_id = d9e400a0-...`
- `lot_id = 628440ae-...`
- `actual_amount` from spreadsheet Act. Cost column
- `budget_source = 'manual'`, `quantity = 1`, `unit_price = 0`

### Result
- Historical dropdown will show **6330 Stevenson Ave - Lot 501**
- Category subtotals will match spreadsheet exactly
- Grand total: **$734,986.14**

