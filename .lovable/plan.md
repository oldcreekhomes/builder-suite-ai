## What's happening

For your Ascent Developer Solutions bill (Invoice_1182.pdf), all 19 pending bill lines in the database DO have the cost code (2600 — Loan Closing Costs) properly set. I confirmed this directly against the database:

- 19 lines, all `line_type = 'job_cost'`
- All 19 have `cost_code_id` = the 2600 cost code
- All 19 have `account_id` set too

So the DB is fine. The problem is that the **Submit Selected Bills** button validates against React state (`batchBills`), not the database. The state is populated by an initial fetch plus a background enrichment / PO-rematch pass. If Submit is clicked before that background pass finishes syncing state — or if any line in state happened to be replaced by a partial in-memory object without a `cost_code_id` — the check at `BillsApprovalTabs.tsx` line 725 (`line.line_type === 'job_cost' && !line.cost_code_id`) trips and blocks the submit, even though the row visibly shows the cost code (because display uses `cost_code_name`, not `cost_code_id`).

## Fix

In `src/components/bills/BillsApprovalTabs.tsx`, inside `handleSubmitAllBills`, right before the cost-code validation:

1. Refetch `pending_bill_lines` (id, line_type, cost_code_id, account_id, amount) from the DB in parallel for every selected bill.
2. Run the missing-cost-code check against those **fresh DB rows** — the authoritative source.
3. Merge the fresh `cost_code_id` / `account_id` / `line_type` back into both `batchBills` state and the local `validatedBills` array so the rest of the submit flow uses correct data.
4. Add a `console.warn` with the offending rows when a bill legitimately is missing a cost code, so if it ever happens again we can see exactly which line is bad.

No schema changes. No changes to the extraction or rematch logic. Just makes Submit trust the database instead of possibly-stale state.

## Files touched

- `src/components/bills/BillsApprovalTabs.tsx` — replace the ~20-line validation block in `handleSubmitAllBills` with the DB-refetch version described above.
