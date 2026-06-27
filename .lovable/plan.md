## Why this happened

A single row in `public.user_roles` granted `platform_admin` to `mgray@oldcreekhomes.com` (user id `2653aba8-d154-4301-99bf-77d559492e19`). The `projects` table — and 10+ other tables — carry an RLS policy of the form `USING (has_role(auth.uid(), 'platform_admin'))` that intentionally bypasses tenant scoping for the admin app. The customer app and the admin app share the same Supabase database, so granting the role inside the customer app immediately exposed every other home builder's data to that account.

Concretely, for `projects`:

```sql
-- Tenant policy (correct)
USING ( owner_id = auth.uid()
        OR owner_id IN (SELECT home_builder_id FROM users
                        WHERE id = auth.uid() AND confirmed) )

-- Escape policy (this is what leaked timber ridge)
USING ( has_role(auth.uid(), 'platform_admin') )
```

`timber ridge` is `owner_id = cff5f161…` (info@1907homes.com). The tenant branch evaluates false for you; the platform_admin branch evaluates true → row returned.

## Fix — three layers

### 1. Immediate: revoke the role (data fix)

Delete the offending row so RLS reverts to tenant scoping for your account:

```sql
DELETE FROM public.user_roles
WHERE user_id = '2653aba8-d154-4301-99bf-77d559492e19'
  AND role = 'platform_admin';
```

After this, refreshing the sidebar will drop `timber ridge` (and any other 1907 Homes / other-builder rows) from every list.

### 2. Prevent recurrence: lock down who can grant `platform_admin`

Audit the existing RLS / triggers on `public.user_roles` and add a hard guard so the customer app cannot create `platform_admin` rows, regardless of who is logged in:

- Add a `BEFORE INSERT OR UPDATE` trigger on `public.user_roles` that raises an exception when `NEW.role = 'platform_admin'` unless the caller is `service_role`. This blocks the role from ever being granted via the anon/authenticated API (i.e. from any Lovable customer app), and only lets it be granted from the dedicated admin project's edge functions (which run as service_role).
- Remove any UI surface in the customer app that writes to `user_roles` with `platform_admin` (if one exists — I'll grep during implementation).

### 3. Defense in depth: re-scope the cross-tenant escape policies

The current `Platform admins can view all <table>` policies exist on: `projects, bills, bill_lines, project_budgets, project_lots, pending_bill_uploads, companies, users, user_roles, user_notification_preferences, company_feature_access`.

Per the project memory *Platform Admin Application Strategy*, admin access is supposed to come from a separate Lovable project. Two safe options — I recommend (a):

(a) **Keep the policies, gate by a session claim.** Change each `Platform admins can view all …` policy from `has_role(auth.uid(),'platform_admin')` to something like `has_role(auth.uid(),'platform_admin') AND current_setting('request.jwt.claims', true)::jsonb->>'app' = 'admin'`. The admin Lovable project sets that JWT custom claim during sign-in; the customer app never sets it. Result: even if a `platform_admin` row exists for a user, that role only unlocks cross-tenant reads when they're authenticated through the admin app's session.

(b) **Drop the policies from this database entirely** and move the admin app to a different Supabase project. Heavier change; only worth it if the admin app is rarely used or hasn't been built yet.

### 4. Verify

After the data fix + trigger + policy change:

```sql
-- Should return 0 rows
SELECT * FROM public.user_roles WHERE role = 'platform_admin';

-- Should be impossible from the customer app
INSERT INTO public.user_roles(user_id, role) VALUES (auth.uid(), 'platform_admin');
-- → raises "platform_admin can only be granted from the admin app"
```

And from the UI: reload the project dropdown as Matt Gray — `timber ridge` and any other 1907 Homes entries must be gone, and only Old Creek's projects remain.

## Order of operations

1. Run the `DELETE` from step 1 (immediate stop-the-bleed).
2. Migration adding the `user_roles` insert/update guard trigger (step 2).
3. Migration rewriting the `Platform admins can view all …` policies on the 11 tables to also require the `app=admin` JWT claim (step 3a).
4. Smoke-check the dropdown and re-run the verification queries.

Steps 2 and 3 are migrations; step 1 is a data update I'll run via the insert tool. No frontend code changes are required for the security fix itself — but I'll grep for any customer-app code that touches `user_roles.role = 'platform_admin'` and remove/redirect it if found.
