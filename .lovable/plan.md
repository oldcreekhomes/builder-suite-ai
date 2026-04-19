

## Numbers verified against live DB

| Metric | Source | Value |
|---|---|---|
| `total_builder_companies` | `public.users` WHERE `user_type='home_builder' AND role='owner'` (matches `admin_get_builder_health()`) | **6** ✓ |
| `total_builder_users` | owners (6) + users where `home_builder_id IN (those 6 owner ids)` (covers employees + accountants) | **12** ✓ |
| `total_subcontractors` | `public.users` WHERE `user_type='marketplace_vendor'` (actual auth signups, NOT directory imports) | **3** |

Note on subcontractors: `marketplace_companies` has thousands of rows but ~all are `google_places`/`builder_import` directory data, not signups. Only **1** has a `user_id` linked. The honest "signup" count is the 3 marketplace_vendor users in `public.users`. I'll flag this in the diagnostics field.

## Migration: redefine `admin_get_platform_overview()`

New return shape:

```text
total_builder_companies   bigint   -- 6
total_builder_users       bigint   -- 12
total_subcontractors      bigint   -- 3
signups_7d                bigint   -- preserved
signups_30d               bigint   -- preserved
active_7d                 bigint   -- preserved
active_30d                bigint   -- preserved
builder_users_source      text     -- "public.users (owners + home_builder_id matches)"
subcontractors_source     text     -- "public.users WHERE user_type='marketplace_vendor'"
```

Logic:
- `total_builder_companies` = `(SELECT count(*) FROM public.admin_get_builder_health())` — guarantees parity with Builders tab
- `total_builder_users` = count distinct users where `id IN (builder_owner_ids)` OR `home_builder_id IN (builder_owner_ids)`
- `total_subcontractors` = count from `public.users` where `user_type='marketplace_vendor'`
- Signups/active windows unchanged
- Keep `SECURITY DEFINER` + `platform_admin` gate

Drops the old function first (return signature changes), recreates with new columns. Apply via real migration.

## Heads-up for the admin app

The admin app currently reads `total_builders`, `total_vendors`, `total_employees` — those columns are being **removed**. After this lands you'll need the Admin project to map its stat cards to the new column names:
- `total_builders` → `total_builder_companies`
- (new) → `total_builder_users`
- `total_vendors` → `total_subcontractors`
- (drop) `total_employees` — folded into `total_builder_users`

I'll give you a one-line follow-up prompt for the Admin project after this migration commits.

## What I'll do once approved

1. Single migration: `DROP FUNCTION admin_get_platform_overview()` then `CREATE` with new signature + logic above
2. Verify by calling it post-migration and confirming 6 / 12 / 3
3. Hand you the Admin-project prompt to update the dashboard mapping

