

## Hard-code Historical Actual Costs for Stevenson Ave Lot 507

### Summary
Insert ~80 `project_budgets` rows for project `d9e400a0-f9b9-40c6-8b8e-183341e508f3` (6330 Stevenson Ave), lot `8ae0a660-59f6-4289-9943-e7fcc0107548` (Lot 507), setting `actual_amount` from the uploaded spreadsheet. The Historical dropdown on the Budget page will then show "6330 Stevenson Ave - Lot 507" (after address formatting).

### Mapping decisions
The spreadsheet uses a different numbering scheme than the database for the 4000-series. Mapping is **by name**:

| Spreadsheet | DB Code | DB Name |
|---|---|---|
| 4005.1 Foundation Issues | → roll into **4005** General Conditions | $845.37 |
| 4005.2 Hold Down Issue | → roll into **4005** General Conditions | $2,697.06 |
| 4005 Back Charges Other | → roll into **4005** General Conditions | $163.92 |
| 4010.1 Parking | → **4010** Parking | $92.43 |
| 4010.2 Office Supplies | → **4040** Office Supplies | $95.36 |
| 4010.3 Office | → **4015** Office | $4.29 |
| 4010.4 Project Manager | → **4020** Project Manager | $6,130.73 |
| 4010.5 Accounting | → **4025** Accounting | $97.56 |
| 4010.6 Other | → **4030** Other | $8.34 |
| 4020 Drawings | → **4050** Drawings | $68.19 |
| 4030 Signage | → **4060** Signage | $115.99 |
| 4040 Temporary Toilets | → **4070** Temporary Toilets | $319.60 |
| 4110 Pest Control | → **4300** Termite Treatment | $275.14 |
| 4855 Warranty Purchase | → **2540** Warranty Purchase | $882.15 |
| 2130 Affordable Housing | → **2480** Miscellaneous Costs (added to $14.84) | $6,475.29 |
| Remaining codes (1010-1040, 2050-2620, 3180-3620, 4100-4980) | → same code number in DB | direct match |

### Implementation
One database insert operation (using the insert tool, not a migration) with ~80 INSERT statements into `project_budgets`:

```sql
INSERT INTO project_budgets (project_id, lot_id, cost_code_id, actual_amount, budget_source, quantity, unit_price)
VALUES
  ('d9e400a0-...', '8ae0a660-...', '<cost_code_id>', <amount>, 'manual', 1, 0),
  ...
```

Each row gets:
- `project_id` = `d9e400a0-f9b9-40c6-8b8e-183341e508f3`
- `lot_id` = `8ae0a660-59f6-4289-9943-e7fcc0107548`
- `actual_amount` = value from spreadsheet
- `budget_source` = `'manual'`, `quantity` = 1, `unit_price` = 0 (so budget shows $0, only actual is populated)

### Result
- The Historical dropdown on Budget pages will show **6330 Stevenson Ave** as a fourth historical project
- Selecting it will display actual costs per cost code in the Historical column
- Total historical actual: **$745,290.10**

