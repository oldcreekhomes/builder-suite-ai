

## Status — both sides ready to move

```text
[✓] DB migration in progress (this OCH project)
    → Step 1 done: ALTER TYPE app_role ADD 'platform_admin'
    → Steps 2-4 still queued: role grant + RLS + 4 RPCs
[✓] New workspace: "BuilderSuite ML"
[✓] New project: "BuilderSuite ML - Admin" (renamed, empty shell)
[ ] Kickoff prompt pasted into new project
[ ] Cross-tenant RLS + analytics RPCs migration committed here
```

## Two parallel actions — do both now

### Action 1 (in THIS OCH project) — finish the migration

The migration so far only added the enum value. The remaining pieces still need to land:
- Insert `user_roles` row granting `platform_admin` to mgray@oldcreekhomes.com
- Cross-tenant SELECT RLS policies on 11 tables
- 4 analytics RPCs (`admin_get_platform_overview`, `admin_get_signup_funnel`, `admin_get_builder_health`, `admin_get_reengagement_queue`)

**Caveat I just discovered:** Postgres requires `ADD VALUE` on an enum to be committed before the new value can be used in DML. So the role-grant + RPC creation must run as a **second migration**, not in the same transaction as step 1. I'll split it that way when I switch to default mode.

### Action 2 (in the new "BuilderSuite ML - Admin" project) — kick off scaffolding

Switch to that project's editor and paste this verbatim into its chat:

> Scaffold a Platform Admin dashboard for BuilderSuite ML.
>
> **Supabase:** Connect to existing project `nlmnwlvmmkngrgatnzkj`. Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sbW53bHZtbWtuZ3JnYXRuemtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MDU3OTgsImV4cCI6MjA2NjE4MTc5OH0.gleBmte9X1uQWYaTxX-dLWVqk6Hpvb_qjseN_aG6xM0`
>
> **Auth gate:** Email/password login. After login, call RPC `has_role(auth.uid(), 'platform_admin')`. If false, sign out and show "Access denied — platform admins only." Test login: mgray@oldcreekhomes.com.
>
> **Layout:** Sidebar nav with shadcn/ui. Pages: Overview, Builders, Engagement, Re-engagement, Vendors.
>
> **Pages:**
> - **Overview** — call RPC `admin_get_platform_overview()`. Stat cards: total builders, vendors, employees, signups (7d/30d), active users (7d/30d). Below cards, signup funnel line chart calling `admin_get_signup_funnel(start_date, end_date)`, default last 30 days, grouped by user_type.
> - **Builders** — call RPC `admin_get_builder_health()`. Sortable shadcn table: email, company_name, signup date, last sign-in, days since signup, project count, bill count, pending uploads.
> - **Re-engagement** — call RPC `admin_get_reengagement_queue()`. Table with copy-email button.
> - **Vendors** — placeholder page for now.
>
> **Stack:** React + Vite + TypeScript + Tailwind + shadcn/ui + React Query + react-router-dom + recharts.
>
> Note: the RPCs above exist in the shared Supabase DB — they'll return empty/error gracefully until I confirm the parent project's migration has fully landed.

## Plan for this OCH project's next migration (what I'll commit when you approve default mode)

Two-statement migration, split because of the enum commit requirement:

1. Insert `user_roles` row → `platform_admin` to mgray@oldcreekhomes.com (lookup by email from `auth.users`)
2. Cross-tenant SELECT policies on: `users`, `user_roles`, `user_notification_preferences`, `projects`, `project_lots`, `project_budgets`, `bills`, `bill_lines`, `companies`, `cost_codes`, `pending_bill_uploads`
3. Create 4 analytics RPCs (SECURITY DEFINER, gated by `has_role(auth.uid(),'platform_admin')`)

No changes to existing tenant RLS. Fully additive.

## What I need from you

- Approve switching to default mode so I can commit migration part 2 here
- Paste the kickoff prompt above into the "BuilderSuite ML - Admin" project's chat (separate browser tab)

Once both fire, you'll have working analytics RPCs in the DB and a scaffolded admin app reading them within ~5 minutes.

