

## Plan: Lock down cost code tenant isolation + fix the duplicate dropdown bug

### Tenant isolation guarantee (what "crystal clear" means)

Every cost code row has an `owner_id`. After this fix, the rule is absolute:

- **Old Creek Homes** sees ONLY rows where `cost_codes.owner_id = <Old Creek's owner UUID>`.
- **New Home Builder X** sees ONLY rows where `cost_codes.owner_id = <X's owner UUID>`.
- When X's employee adds a cost code, it's stamped with X's owner_id and is invisible to Old Creek (and every other tenant).
- When X onboards via "copy template," they get their OWN 309 rows (new UUIDs, owner_id = X). Old Creek's originals are untouched. The two sets never mix in any dropdown, list, budget, bill, PO, check, deposit, journal entry, or report.
- This holds no matter how many tenants sign up.

Two layers enforce this:
1. **Application layer** — every query filters `.eq('owner_id', ownerId)` where `ownerId` resolves to the user's own ID (owner) or their `home_builder_id` (employee/accountant).
2. **Database layer (RLS)** — `cost_codes` policies only return rows where `owner_id` matches the caller's tenant. Even if app code forgot a filter, the DB would still refuse to leak.

### The fix — three parts

**Part 1: Clean up the 309 duplicate rows that are causing today's symptom**

The duplicates created at `2026-04-20 17:50:53` under `owner_id = cff5f161…` are NOT yours — they belong to the new home builder who onboarded today. We do NOT delete them. They're that tenant's legitimate cost codes.

What we delete instead: nothing in the data. The duplicates appearing in YOUR dropdown are caused by missing filters (Part 2), not by bad data. Once Part 2 ships, your dropdown shows only your 309 codes; their dropdown shows only their 309 codes. Both tenants are happy, no data loss.

**Part 2: Add `owner_id` filter to every client-side cost code query**

Files to fix:

- `src/hooks/useCostCodeSearch.ts` — currently fetches all rows with no filter. Add owner resolution via `get_current_user_home_builder_info` RPC (same pattern as `useCostCodes.tsx`) and `.eq('owner_id', ownerId)`.
- `src/components/companies/CostCodeSelector.tsx` — same fix on its inline query.
- Audit (and fix if found unfiltered): any other file that queries `from('cost_codes')` directly. I'll grep the codebase and patch every one.

**Part 3: Tighten RLS on `cost_codes` as a safety net**

Verify the existing RLS policy on `cost_codes` enforces `owner_id = <caller's tenant>` for SELECT/INSERT/UPDATE/DELETE. If it's currently too permissive (e.g., returns rows across tenants), add a migration that replaces it with strict tenant-scoped policies using the existing `get_current_user_home_builder_info()` security-definer function. Same pattern for `cost_code_specifications` and `cost_code_price_history` (which inherit ownership via `cost_code_id`).

### Verification after deploy

1. Log in as Old Creek → Write Checks → cost code dropdown shows exactly 309 unique codes, all yours.
2. Log in as the new home builder → same dropdown shows exactly 309 unique codes, all theirs (different UUIDs, same code numbers).
3. New builder adds cost code "9999 - Test" → appears only in their dropdown, never in Old Creek's.
4. Same checks on: Bills, Make Deposits, Credit Cards, Journal Entry, Create PO, Companies cost-code selector.

### Files changed

1. `src/hooks/useCostCodeSearch.ts` — add owner_id filter
2. `src/components/companies/CostCodeSelector.tsx` — add owner_id filter
3. Any other file found querying `cost_codes` without an owner filter
4. New migration — strict RLS policies on `cost_codes` (only if audit shows current policies are too loose)

### Why this is safe

- No cost code rows are deleted. Both tenants keep all their data.
- All existing budget/bill/PO/check references stay valid (we're only adding WHERE clauses, never changing IDs).
- The fix is purely restrictive — it can only hide other tenants' data from you, never break your own.

