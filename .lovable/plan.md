
Approved as previously laid out. Switching to default mode to implement:

1. **Migration** — `get_my_company_features()` RPC: SECURITY DEFINER, resolves caller's company (owner: own `company_name`; employee/accountant: owner via `home_builder_id`), returns 4 booleans using `COALESCE(... , true)` against `public.company_feature_access`. GRANT EXECUTE to authenticated.

2. **New hook** `src/hooks/useCompanyFeatures.ts` — React Query, key `['company-features']`, `staleTime: 5 min`, defaults all true while loading.

3. **Compose into 4 permission hooks** (AND user pref with company flag):
   - `useEstimatePermissions` → `&& features.estimating`
   - `useMarketplacePermissions` → `&& features.marketplace`
   - `useTemplatePermissions` → both `canAccessTemplates` and `canEditTemplates` AND `features.templates`
   - `useApartmentPermissions` → `&& features.apartments`
   - Each returns combined `isLoading` (user prefs OR features still loading)

4. **Sidebar** `SidebarNavigation.tsx` — Apartments visibility: `currentProject?.apartments_enabled && features.apartments` (pull `useCompanyFeatures` here too).

5. **EmployeeAccessPreferences.tsx** — wrap each of the 4 toggle sections with `{features.X && (...)}` so disabled-at-company features don't appear as grantable.

No realtime; 5-min staleness accepted. Existing route guards inherit gating automatically via the composed hooks.
