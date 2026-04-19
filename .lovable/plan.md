
Flip the default in `get_my_company_features()` from `true` to `false`. Everything else stays as-is.

## Change

**Migration** — replace the four `COALESCE(..., true)` with `COALESCE(..., false)` in `public.get_my_company_features()`. Same signature, same security, same grants. Re-run as `CREATE OR REPLACE FUNCTION`.

```sql
COALESCE((SELECT cfa.enabled FROM public.company_feature_access cfa
          WHERE cfa.company_name = co_name AND cfa.feature = 'apartments'),  false) AS apartments,
-- ...same for estimating, marketplace, templates
```

## Also update (to keep behavior consistent with new default-OFF semantics)

**`src/hooks/useCompanyFeatures.ts`** — flip in-app defaults to match, so a failed RPC / loading state doesn't briefly flash gated UI as enabled:
- `DEFAULT_FEATURES` → all `false`
- per-field fallbacks `row.X ?? false`
- `features: data ?? DEFAULT_FEATURES` unchanged (already returns the new defaults)

## Not changing

- `useEstimatePermissions`, `useMarketplacePermissions`, `useTemplatePermissions`, `useApartmentPermissions` — composition logic is identical
- `SidebarNavigation.tsx` — Apartments visibility check unchanged
- `EmployeeAccessPreferences.tsx` — section wrappers unchanged
- RPC signature, RLS, grants — unchanged

## Behavioral impact (heads-up)

Every existing company without explicit `enabled = true` rows in `company_feature_access` will immediately lose access to Apartments, Estimating, Marketplace, and Templates. Confirm the Platform Admin app has back-filled `enabled = true` rows for current customers before this ships, or expect support tickets.
