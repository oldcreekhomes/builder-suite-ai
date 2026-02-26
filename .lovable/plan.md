

## Merge Cost Code 4780 (Driveway Apron) into 4770 (Driveway) and Clean Up Duplicates

### Current State

You have duplicate cost codes for driveways:
- **4770 "Driveway"** (correct, keep) -- has 2 duplicate records in cost_codes table
- **4780 "Driveway Apron"** (duplicate, delete) -- has 2 duplicate records in cost_codes table

The primary 4780 ID (`69307bee`) has data across multiple tables. The primary 4770 ID (`afa82c53`) is the one with existing project data.

### Data to Migrate (4780 -> 4770)

All references to `69307bee-4764-41ce-92ae-d4321e0a56a7` (4780) need to move to `afa82c53-2791-4600-b630-f5df2756fbd2` (4770):

| Table | Records | Notes |
|-------|---------|-------|
| project_budgets | 10 rows | All 10 projects already have a 4770 budget row at the same lot. The 4780 rows have actual_amount data on 3 projects ($2,500 / $1,478 / $3,512). These amounts need to be **added** to the existing 4770 rows, then the 4780 rows deleted. |
| project_purchase_orders | 4 POs | Reassign cost_code_id to 4770 |
| project_bid_packages | 7 packages | Reassign cost_code_id to 4770 |
| purchase_order_lines | 4 lines | Reassign cost_code_id to 4770 |
| cost_code_price_history | 1 entry | Reassign cost_code_id to 4770 |
| cost_code_specifications | 2 entries (1 per duplicate) | Delete 4780 specs, keep 4770 spec |

### Execution Steps (all data operations via insert tool)

**Step 1: Merge actual_amounts on project_budgets**
For the 3 projects where 4780 has non-zero actual_amount, add those amounts to the corresponding 4770 budget row:
- Project `0bc41245`: Add $2,500 to 4770's $5,900 = $8,400
- Project `a6e9a30e`: Add $1,478 to 4770's $2,698 = $4,176
- Project `b633e88d`: Add $3,512 to 4770's $1,652 = $5,164

**Step 2: Delete all 4780 project_budget rows** (10 rows)

**Step 3: Reassign foreign keys** in project_purchase_orders, project_bid_packages, purchase_order_lines, and cost_code_price_history from 4780 ID to 4770 ID

**Step 4: Delete 4780 specifications** (both duplicates)

**Step 5: Delete the duplicate 4770 cost_code record** (`a9a19650`) that has no project data (only 1 orphan spec)

**Step 6: Delete both 4780 cost_code records** (`69307bee` and `a96c503d`)

After this, you'll have a single clean 4770 "Driveway" cost code with all historical data preserved.

### Files Changed
No code changes -- this is entirely a database data migration.

