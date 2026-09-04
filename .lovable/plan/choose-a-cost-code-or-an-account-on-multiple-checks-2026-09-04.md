# Choose a Cost Code or an Account on Multiple Checks

Right now each row on "Enter Multiple Checks" can only point at a chart-of-accounts line. Checks written against a job normally need a cost code instead, exactly like the Write Checks page, which keeps job-cost lines and expense lines separate.

## What changes

- Each row gets a small **Type** selector in the Account column area with two options: **Cost Code** (job cost) and **Account** (expense). Default stays **Account** so nothing changes for current use.
- Picking **Cost Code** swaps the picker to the same cost-code search used on Write Checks; picking **Account** keeps today's account search.
- Switching the type clears whatever was already picked in that row so a stale value can't be saved.
- Saving works the same: rows saved as Cost Code post as job-cost lines against the chosen job, rows saved as Account post as expense lines. Validation message wording follows the chosen type ("pick a cost code" vs "pick an account").

## Technical notes

- `src/components/multi-entry/MultiCheckTable.tsx`: add `entryType: "cost_code" | "account"` plus `costCodeId` / `costCodeLabel` to the row model; render a compact shadcn `Select` (or two-button toggle) in the Account cell and conditionally render `CostCodeSearchInput` vs the existing `AccountSearchInputInline`.
- `src/hooks/useMultiCheckBatchSave.ts`: extend `MultiCheckRowInput` with the line type and cost code id; build the check line as `line_type: 'job_cost'` with `cost_code_id` or `line_type: 'expense'` with `account_id`, still going through the existing `createCheck` path so posting, RLS, and audit behavior are unchanged.
- No database changes needed — `check_lines` already supports both shapes.

Scope is the Multiple Checks page only; Multiple Deposits is untouched.
