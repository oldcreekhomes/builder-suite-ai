

## Goal
Add `platform_admin` role + cross-tenant SELECT policies + analytics RPCs in this app, granted only to mgray@oldcreekhomes.com. This is the DB groundwork the separate Platform Admin Lovable project will read from.

## Migration (single SQL migration)

### 1. Add enum value
- `ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'platform_admin';`

### 2. Grant role to you
- Insert into `user_roles` (user_id = mgray@oldcreekhomes.com's auth id, role = 'platform_admin'). Look up id via subquery on `auth.users` by email.
- Guard: do NOT let the existing `sync_user_role` trigger wipe this. That trigger fires on `public.users` updates and only manages owner/accountant/employee mappings — `platform_admin` rows on `user_roles` are independent and survive. Confirm by reading the trigger logic before migration.

### 3. Cross-tenant admin SELECT policies
Add additive `FOR SELECT TO authenticated USING (has_role(auth.uid(), 'platform_admin'))` policies on:
- `users`, `user_roles`, `user_notification_preferences`
- `projects`, `project_lots`, `project_budgets`
- `bills`, `bill_lines`, `companies`, `cost_codes`
- `pending_bill_uploads`

Existing tenant policies stay intact (additive, OR-combined by Postgres).

### 4. Analytics RPCs (`SECURITY DEFINER`, gated by `has_role(auth.uid(),'platform_admin')`, raise exception otherwise)
- `admin_get_platform_overview()` → totals: builders, vendors, employees, signups last 7d / 30d, active last 7d / 30d (via `auth.users.last_sign_in_at`)
- `admin_get_signup_funnel(start_date date, end_date date)` → daily counts grouped by `user_type`
- `admin_get_builder_health()` → per builder (owners only): id, email, company_name, signup date, last_sign_in_at, days_since_signup, project_count, bill_count, pending_upload_count
- `admin_get_reengagement_queue()` → builders with sign_in_count ≤ 1 OR last_sign_in_at older than 7 days, with contact info

All read `auth.users` safely via SECURITY DEFINER (no direct client access).

## Verification
- Run `SELECT has_role(auth.uid(), 'platform_admin')` while logged in as mgray@oldcreekhomes.com → returns `true`.
- Call `select * from admin_get_platform_overview();` → returns row.
- Call `select * from admin_get_builder_health();` → returns all home builders across tenants.
- Existing OCH dashboard still works (no regressions in tenant RLS).

## Next step (after this lands)
You create the new Lovable project ("BuilderSuite ML — Admin"). I scaffold its pages calling these RPCs + share Supabase client config + reuse `ImpersonationContext` for "View as builder."

