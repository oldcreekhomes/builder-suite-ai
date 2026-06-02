## Problem

Previous migration rolled all 4010.x PDF rows into parent code 4010, dumping $6,462.53 into "Parking". The owner's chart of accounts actually has separate codes for each sub-category, so each 4010.x line should map to its real cost code.

## PDF column 2 → target cost code

| PDF row | Amount | Target code |
|---|---|---|
| 4010.1 Parking | 92.34 | 4010 Parking |
| 4010.2 Office Supplies | 130.07 | 4040 Office Supplies |
| 4010.3 Office | 4.29 | 4015 Office |
| 4010.4 Project Manager | 6,129.93 | 4020 Project Manager |
| 4010.5 Accounting | 97.56 | 4025 Accounting |
| 4010.6 Other | 8.34 | 4030 Other |
| **Total** | **6,462.53** | (matches PDF) |

## Fix

Single data migration on `project_budgets` for project `d9e400a0…` / lot `5d28a702…`. Codes 4020/4030/4040 already hold non-4010 PDF amounts; the 4010.x value must be **added** to those existing actuals, not overwrite them.

Final `actual_amount` after fix:

- 4010 Parking → 92.34 (was 6,462.53)
- 4015 Office → 4.29 (insert)
- 4020 Project Manager → 68.21 + 6,129.93 = 6,198.14
- 4025 Accounting → 97.56 (insert)
- 4030 Other → 115.98 + 8.34 = 124.32
- 4040 Office Supplies → 319.61 + 130.07 = 449.68

Upsert on `(project_id, cost_code_id, lot_id)` with `budget_source='manual'`, `quantity=1`, `unit_price=0`. No schema changes, no UI changes, no other lots touched.
