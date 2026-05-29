## Diagnosis

Drilling into 1010 Atlantic Union Bank on the Oceanwatch Balance Sheet shows "No transactions found" even though the Balance Sheet itself reports $87,423.67. The Balance Sheet aggregates raw journal lines (which return fine), but the Account Detail dialog runs a separate enrichment query that's silently failing.

For Oceanwatch's bank register, the dialog needs to fetch 373 unique bills via `.in('id', billIds)` in `AccountDetailDialog.tsx`. That generates a request URL over **10KB**, exceeding Supabase/PostgREST's ~8KB URL limit. The request returns a 400, `billsMap` ends up empty, and the defensive filter (lines 578–591) then drops every `bill` and `bill_payment` line — which is virtually all of this account's activity (396 of ~566 lines). Result: the dialog appears empty.

This matches the project's known rule (`mem://architecture/supabase-query-limitations-and-batching`): any `.in()` over ~200 UUIDs must use `batchedIn` from `src/lib/supabasePaginate.ts`. Account Detail was never updated to follow that rule, so it breaks on busy accounts.

## Fix

In `src/components/accounting/AccountDetailDialog.tsx`, replace direct `.in()` calls that take potentially large UUID arrays with `batchedIn` (batch size 200):

1. **Bills fetch** (~line 343–360, `bills` table by `billIds`) — the primary offender.
2. **Related JE lookup for "paid as of" calculation** (~line 370–376, `journal_entries` filtered by `source_id in billIds`) and its downstream `journal_entry_lines` lookup keyed by `jeIds` (~line 383–389).
3. **Bill-lines fetch for consolidated payments** (~line 558, `bill_lines` by `allBillIdsInPayments`).
4. **Defensive batching for `checks`, `deposits`, `credit_cards`, and `bill_payment_allocations`** — these are smaller today but use the same pattern and can overflow on other active projects. Convert to `batchedIn` for consistency.
5. Leave small lookups (`vendorIds`, `costCodeIds`, `accountIds`) as-is unless they already approach 200; wrap them with `batchedIn` only when they aggregate from the bills set.

Each `.in()` becomes a `batchedIn(chunk => baseQuery.in('col', chunk), ids)` call, preserving every other filter on the original query.

## Verification

- Reopen 1010 Atlantic Union Bank on Oceanwatch Balance Sheet → drill-down shows the full register; running balance ties to $87,423.67.
- Spot-check 1430 WIP – Direct Construction Costs (also pictured) → transactions populate.
- Confirm no console/network 400s from `/rest/v1/bills` and friends.

## Out of scope

No schema changes. No changes to Balance Sheet aggregation, "Hide Paid" logic, or consolidated-payment math — only the fetch shape changes.
