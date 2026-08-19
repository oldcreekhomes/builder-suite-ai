# Move the $5.94 Highlighters charge to cost code 4040 Office Supplies

## What's wrong

126 Longview shows Assets $1,542,880.28 vs Liabilities & Equity $1,542,886.22 — off by exactly $5.94.

Verified in the data: the paid bill dated 05/14/2026 has one line, "Highlighters" $5.94, entered as an **expense** line against account **5000: Office Expenses**, with the offsetting credit in Accounts Payable. Account 5000 is excluded from this project, so the Balance Sheet drops that expense from Current Year Earnings while still counting the AP credit — hence the $5.94 gap.

## The fix

Recode that single line as a job cost under existing cost code **4040: Office Supplies** (4000 – Home Building Costs group), matching how every other line on this job is entered:

- Bill line becomes a job-cost line on cost code 4040, Lot 1, no expense account.
- Its accounting entry moves from 5000: Office Expenses to **1430: WIP – Direct Construction Costs**, tagged with cost code 4040 and the same lot — identical to how other job-cost bill lines post.
- Amount, date, vendor, bill total, payment, and Accounts Payable are untouched.

Result on the Balance Sheet: WIP goes from $1,528,801.72 to $1,528,807.66, Total Assets becomes $1,542,886.22 — equal to Total Liabilities & Equity $1,542,886.22. In balance.

The $5.94 will also now appear correctly under 4040 Office Supplies on the Job Costs report for Lot 1.

## Technical notes

Data-only change, two rows:
- `bill_lines` row `70bb441b`: `line_type` → `job_cost`, `cost_code_id` → the 4040 Office Supplies cost code for this company, `account_id` → null.
- `journal_entry_lines` row `8c115845`: `account_id` → account 1430, `cost_code_id` → 4040.

No code changes and no new accounts created. Account 5000: Office Expenses is left alone (it will have no activity afterwards); say the word if you also want it switched off so it can't be selected again.
