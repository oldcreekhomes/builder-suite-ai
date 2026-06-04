## Nob Hill Court — Costs by Cost Code (Excel export)

One-time data export. No application code changes.

### Project
- 100 Nob Hill Ct, Alexandria, VA 22314 (`691271e6-e46f-4745-8efb-200500e819f0`)

### Scope
Pull every bill line tied to this project across the Review, Approved, and Paid tabs, then sum to a single number per cost code.

Source data:
- `bills` with `status IN ('posted','paid')` (Approved + Paid tabs) — currently 15 + 19 = 34 bills
- `pending_bill_uploads` with `status IN ('pending','extracted','needs_review')` joined to `pending_bill_lines` (Review tab) — currently 0 rows for this project, so nothing to add
- Exclude reversals (`is_reversal = true`) and any reversed lines so we don't double-count corrections
- Bill lines joined to `cost_codes` for code + name

Note: There are also 7 `draft` bills on this project. Draft = rejected/in-progress, not shown in Review/Approved/Paid tabs, so they will be excluded. Tell me if you want them included.

### Output (`/mnt/documents/NobHillCourt_Costs_By_CostCode.xlsx`)
Single sheet "Costs by Cost Code":

| Cost Code | Description | Total Cost |
|-----------|-------------|------------|
| 1000      | Permits     | $12,345.67 |
| ...       | ...         | ...        |
| **Total** |             | **$X**     |

- Sorted by cost code
- Currency formatted to 2 decimals
- Grand total row at bottom
- Bold header row

### Technical approach
1. SQL: sum `bill_lines.amount` grouped by `cost_code_id` for project = Nob Hill, where parent bill status in ('posted','paid') and `is_reversal = false`.
2. Join `cost_codes` for code + name; lines without a cost code grouped under "(Uncategorized)".
3. Generate xlsx via Python (openpyxl) and save to `/mnt/documents/`.
4. QA: open the file, verify row count and grand total matches a separate `SUM(total_amount)` sanity check on the same bills.
