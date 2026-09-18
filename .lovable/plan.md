# Recode the $10,000 Ascent Developer payment at 100 Nob Hill Ct

## What's wrong today

Bill 1182 (Ascent Developer Solutions, $10,000, dated 07/13/2026, paid 07/15/2026 from 1015 Capital One) was entered as a job cost against cost code **2600 - Loan Closing Costs**, split across 19 lots at $526.31 each plus $526.42 on the last. Because it's a job cost, the accounting entry debits **1430 WIP - Direct Construction Costs**, and the Capital One register shows "2600 - Loan Closing..." in the Account column.

## What will change

The bill becomes a single $10,000 line posted to the account **1020 - Deposits** — no cost code, no lot split, no job-cost/WIP impact.

Result:
- Capital One register row shows `1020 - Deposits` instead of `2600 - Loan Closing...`, still $10,000, description "Refinancing deposit", still cleared.
- Balance Sheet: 1020 Deposits increases by $10,000 ($5,690.03 → $15,690.03); 1430 WIP decreases by $10,000. Assets total, Capital One, and Accounts Payable are unchanged.
- Job Costs report for Nob Hill no longer shows the $10,000 under 2600 Loan Closing Costs on any lot.
- The payment itself (Accounts Payable debit / Capital One credit, $10,000) is untouched, so the bill stays fully paid and the reconciliation/cleared status is unaffected.

## Technical detail

- Bill `6c2681b0-e7b2-4be4-8032-4e7029b9971a` (project `691271e6-e46f-4745-8efb-200500e819f0`, owner `2653aba8-d154-4301-99bf-77d559492e19`).
- Delete the 19 `bill_lines` rows (`line_type: job_cost`, account 1670 Deposits, cost code `704800ad` / 2600, per-lot) and insert one row: `line_type: expense`, `account_id = 6959b39e-5197-4df2-8733-6d448c2ed20f` (1020 Deposits), `amount = 10000.00`, `memo = 'Refinancing deposit'`, `project_id` set, `cost_code_id`/`lot_id` null.
- In bill journal entry `9209edea-6e54-4bfe-a159-a973bd1de9b8`: delete the 19 debit lines to 1430 WIP ($526.31 × 18 + $526.42) and insert one debit line of $10,000.00 to account 1020 with the same memo and project. The $10,000 Accounts Payable credit line stays as is, so the entry still balances.
- Payment journal entry `96254bea-de09-4803-8e48-043caedd6e78` is not modified.
- Verify afterwards: bill total still $10,000.00, bill journal debits = credits, and the Nob Hill Balance Sheet still has Assets = Liabilities + Equity.

No application code changes — this is a data correction only.
