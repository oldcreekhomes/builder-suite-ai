## Fix

Insert the two missing PDF amounts for Lot 506 using the user-specified mappings:

- **4110 Pest Control $275.15** → **4300 Termite Treatment** (id `15a09918…`)
- **4855 Warranty Purchase $882.15** → **2540 Warranty Purchase** (id `2b3e88bc…`)

Single data migration: upsert two rows in `project_budgets` for project `d9e400a0…` / lot `5d28a702…`, on conflict add to existing `actual_amount` (so we don't blow away any other source). Standard `quantity=1`, `unit_price=0`, `budget_source='manual'`.

### Resulting totals

- 4000 Homebuilding total: 317,450.74 + 275.15 = **$317,725.89**
- 2000 Soft Costs total: gains $882.15
- Project grand total: **$713,572.02** (matches PDF)

Note: routing 4855 → 2540 puts it under 2000 Soft Costs, so the 4000 total will not exactly equal $318,608.04 per the PDF, but the project grand total matches and the cost is correctly categorized in your chart of accounts.
