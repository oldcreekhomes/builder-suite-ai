

## Fix: Bills Query Also Overflows URL Limit

### What's Still Broken

The previous fix batched the `journal_entry_lines` queries, which now return 200 OK. However, the **bills query** at line 268-270 also passes hundreds of bill IDs via `.in('id', billIds)` and is hitting the same URL length overflow (400 Bad Request visible in network requests). This means bill payment transactions still don't appear in the reconciliation view.

The same risk exists for several other `.in()` calls in the file that could overflow as data grows.

### Fix

**File: `src/hooks/useBankReconciliation.ts`** — Apply `batchedIn` to all large `.in()` queries:

1. **Bills query (~line 267-278)**: The `billIds` array (derived from all bill_payment journal entries) has 400+ IDs. Replace the single query with `batchedIn`, preserving the project filter logic by building it into the query function.

2. **Other at-risk queries to batch** (same pattern, apply `batchedIn`):
   - `check_lines` query (~line 143-147) — `checkIds` from all checks
   - `bill_lines` for cost codes (~line 463-473) — `allBillIdsForCostCodes`
   - `bill_lines` for bill payment allocations (~line 888-890) — `billPaymentIds`
   - `check_lines` for allocations (~line 709-719) — `checkIdsForAllocations`
   - `check_lines` for account allocations (~line 766-776) — same
   - `deposit_lines` (~line 831-833) — `depositIds`
   - `journal_entry_lines` for JE allocations (~line 662-673) — `allJELineIds`

Each will use the existing `batchedIn` helper from `supabasePaginate.ts`.

### Why This Is Still Breaking

The first fix only batched 2 of ~12 large `.in()` calls. The bills query is the immediate blocker — it's returning 400 right now. The others are preventative fixes for the same pattern.

