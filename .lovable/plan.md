

## Bidding tenant isolation — verification result

### Database: confirmed locked down

I verified live in the database:

**`cost_codes` policy** — only owner_id = current user OR owner_id = the user's confirmed home_builder_id. Platform-admin cross-tenant SELECT policy is gone.

**`company_cost_codes` policy** — both the company AND the cost code must belong to the current builder.

**`cost_code_specifications` policy** — must go through a cost code owned by the current builder.

**`project_bids` policy** — must go through a bid package whose project belongs to the current builder.

**`project_bid_packages`** — has the unique index `project_bid_packages_project_costcode_unique` on `(project_id, cost_code_id)`. Duplicates cannot be inserted.

**Duplicate check** — zero duplicate `(project_id, cost_code_id)` rows remain in `project_bid_packages`.

So bidding cross-tenant leakage is fixed and bid-package duplication is structurally impossible going forward.

### Frontend: one remaining gap to close

The bidding modal itself (`useAddBiddingModal`), budget hooks, company selector, subcategory hook, cost-code search, takeoff dialogs, and specifications hook are all explicitly scoped by `owner_id`. RLS would also block cross-tenant reads now even if a query forgot to filter.

However there is one remaining frontend query that reads `cost_codes` without an owner filter and without an ID filter:

```text
src/components/bills/ManualBillEntry.tsx
  supabase.from('cost_codes').select('id, code, name')
```

RLS still protects this (it only returns the active builder's rows), so it is not a leak. But to match the strict isolation rule and remove ambiguity, I will explicitly scope it by `owner_id` like every other query.

All other unscoped reads use `.in('id', costCodeIds)` where the IDs already came from project-owned rows, which is safe under the new RLS.

### Plan

1. Update `src/components/bills/ManualBillEntry.tsx` to resolve effective `ownerId` (own id for owners, `home_builder_id` for confirmed employees) and add `.eq('owner_id', ownerId)` to the cost code fetch.
2. No database changes needed.
3. No other code changes needed.

### After this change

- Bidding modal: each cost code appears once per builder. Confirmed.
- Cross-builder cost codes: blocked by RLS at the database, even for platform admins, in the operational app. Confirmed.
- Duplicate bid packages: blocked by unique index. Confirmed.
- Manual bill entry cost code dropdown: explicitly scoped to current builder, matching the rest of the app.

### Files changed

1. `src/components/bills/ManualBillEntry.tsx`

