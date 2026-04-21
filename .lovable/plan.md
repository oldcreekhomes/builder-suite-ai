

## Plan: Stop cross-home-builder cost code/bid-package leakage and remove the duplicate bid-package choices

### What I found

The duplicate rows in the **Load Bid Packages** modal are not because Old Creek has duplicate `cost_codes` rows.

The issue is that the modal currently fetches bidding-enabled cost codes like this:

```ts
.from('cost_codes')
.select('*')
.eq('has_bidding', true)
```

It does **not** filter by the current home builder’s `owner_id`.

Normally RLS hides other builders’ cost codes. But Matt’s account has the `platform_admin` role, and there is an additive policy:

```sql
Platform admins can view all cost_codes
```

So in the operational app, Matt can see:

```text
Old Creek Homes cost code 2050 - Civil Engineering
1907 Homes cost code 2050 - Civil Engineering
```

That is why the modal shows each bid package twice.

The onboarding/template copy itself is okay in principle: 1907 Homes received its own copied cost code rows with its own `owner_id`. The bug is that the bidding UI is not explicitly scoping to the active builder account, and the platform-admin RLS exception exposes both copies.

I also found broader isolation risk policies still present:

```sql
company_cost_codes:       get_current_user_company() IS NOT NULL
cost_code_specifications: get_current_user_company() IS NOT NULL
project_bids:             get_current_user_company() IS NOT NULL
```

Those are too broad and should be replaced with real tenant-scoped policies.

### Fix 1 — make bid package loading explicitly tenant-scoped

Update `src/hooks/useAddBiddingModal.ts` so it always resolves the effective company owner:

```text
owner account id for owners
home_builder_id for employees/accountants
```

Then fetch only that owner’s bidding cost codes:

```ts
.eq('owner_id', ownerId)
.eq('has_bidding', true)
```

This ensures the modal never shows another builder’s copied template cost codes, even if the current user is a platform admin.

Also tighten the related bidding queries inside that hook:

- specifications only for selected tenant cost code IDs
- company/cost-code associations only for selected tenant cost code IDs
- sorting by cost code number/name instead of creation time

### Fix 2 — audit and patch every unscoped cost-code query used in the operational app

I will update cost-code queries that fetch by `code`, `parent_group`, or all cost codes without an owner filter.

High-priority areas include:

1. `src/hooks/useAddBiddingModal.ts`
2. `src/hooks/useAddBudgetModal.ts`
3. `src/hooks/useBudgetData.ts`
4. `src/hooks/useBudgetSubcategories.ts`
5. `src/components/companies/BulkImportDialog.tsx`
6. Job cost/report cost-code fallback lookups
7. Any other query found that reads `cost_codes` without either:
   - `.eq('owner_id', effectiveOwnerId)`, or
   - a safe lookup by IDs already coming from project-owned rows

Known-ID lookups such as “get the cost code for this bill line/budget row” can stay ID-based, because the owning project/bill row already scopes the relationship. Queries by plain `code` or `parent_group` must be owner-filtered.

### Fix 3 — tighten RLS so copied templates remain isolated by home builder

Create a database migration to remove the overly broad policies and replace them with real company-boundary policies.

#### `company_cost_codes`

Replace:

```sql
get_current_user_company() IS NOT NULL
```

with access only when the linked company belongs to the current builder:

```sql
companies.home_builder_id = auth.uid()
OR companies.home_builder_id = current user's confirmed home_builder_id
```

Also require the linked `cost_codes.owner_id` to match the same builder.

#### `cost_code_specifications`

Replace:

```sql
get_current_user_company() IS NOT NULL
```

with access only through the linked `cost_codes.owner_id`.

#### `project_bids`

Replace:

```sql
get_current_user_company() IS NOT NULL
```

with access only when the bid package’s project belongs to the current builder.

This keeps 1907 Homes’ copied template data completely separate from Old Creek in the operational app.

### Fix 4 — remove raw cross-tenant `platform_admin` leakage from operational cost-code tables

The platform admin dashboard should use admin RPCs / admin-only functions for analytics, not raw table SELECT policies that affect the builder app.

I will remove or narrow the raw platform-admin SELECT policy on `cost_codes` so Matt’s operational BuilderSuite ML session no longer sees every builder’s copied cost codes.

If admin analytics still need cross-tenant cost-code reporting, that should be exposed through explicit `admin_*` security-definer RPCs, not normal app table reads.

### Fix 5 — prevent duplicate project bid packages going forward

There is currently no unique database constraint preventing this:

```text
same project_id + same cost_code_id inserted twice
```

I found a few historical duplicate `project_bid_packages` inside Old Creek itself, such as duplicate closed `Driveway` packages on older projects.

I will add protection so this cannot happen again:

1. Add a unique index/constraint on:

```sql
project_bid_packages(project_id, cost_code_id)
```

2. Update the Load Bid Packages insert logic to use conflict-safe insertion:

```ts
.upsert(..., { onConflict: 'project_id,cost_code_id', ignoreDuplicates: true })
```

or equivalent conflict-safe insert behavior.

### Fix 6 — clean existing duplicate bid packages safely

Before adding the unique constraint, existing duplicates have to be resolved.

I will handle this carefully:

1. Identify duplicate `project_bid_packages` grouped by:

```text
project_id + cost_code_id
```

2. Preserve one canonical bid package per duplicate set.
3. Move or preserve related `project_bids` only where it is safe.
4. Do not delete meaningful proposal/pricing history blindly.
5. Remove only true duplicate package rows after checking related bids.

The current duplicate sets I found are old Old Creek duplicates, not cross-builder contamination. The current modal duplicate issue is the platform-admin/cost-code scoping problem.

### Fix 7 — make template import safer

The existing `copy-template-cost-codes` edge function copies Old Creek’s template into the new builder’s own `owner_id`, which is correct.

I will make it safer by ensuring:

- it always writes to the target builder owner id
- it never writes associations back to Old Creek
- it does not create duplicate rows if a partial import already exists
- it preserves copied template data as separate tenant-owned rows

### Verification

After the fix:

1. Open **Bidding → Load Bid Packages** as Matt.
2. Confirm each cost code appears once, not once for Old Creek and once for 1907 Homes.
3. Confirm 1907 Homes still has its own copied template cost codes.
4. Confirm Old Creek cannot see 1907’s operational cost codes in bidding/budget/company assignment flows.
5. Confirm 1907 cannot see Old Creek’s operational cost codes.
6. Confirm employees still see their own builder’s cost codes through `home_builder_id`.
7. Confirm existing bid packages cannot be inserted twice for the same project/cost code.
8. Confirm the template import still works for a new builder.

### Files/areas to change

1. `src/hooks/useAddBiddingModal.ts`
2. `src/hooks/useAddBudgetModal.ts`
3. `src/hooks/useBudgetData.ts`
4. `src/hooks/useBudgetSubcategories.ts`
5. `src/components/companies/BulkImportDialog.tsx`
6. Any remaining operational `cost_codes` queries that need explicit tenant scoping
7. `supabase/functions/copy-template-cost-codes/index.ts`
8. New migration for RLS policy cleanup
9. New migration for bid-package uniqueness after safe duplicate cleanup

