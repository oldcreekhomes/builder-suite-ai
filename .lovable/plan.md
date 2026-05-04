
# Employee Accountability & Audit Trail (multi-tenant scoped)

Add `created_by` + `updated_by` to every user-mutable table so each home builder can see exactly who on **their own team** is doing what — with strict tenant isolation.

## Multi-Tenant Guarantee (read this first)

Every part of this feature is scoped by `home_builder_id`:

- A home builder sees **only their own employees** in the activity report (already enforced by `users.home_builder_id` queries).
- The activity RPC resolves the caller's `home_builder_id` server-side via `get_current_user_home_builder_info()` and refuses to return data for any user outside that tenant.
- The "Created by / Modified by" name lookup hook only resolves user IDs that share the caller's `home_builder_id` — IDs from other tenants display as "Unknown user" (never leak names/emails across companies).
- `created_by` / `updated_by` columns themselves are visible under existing tenant-scoped RLS on each table, so an employee at Builder A can never see who created a row at Builder B (they can't see the row at all).
- The `set_audit_user()` trigger stamps `auth.uid()` only — it never trusts a client-supplied value for `created_by`/`updated_by`.

## 1. Schema Migration — Audit Columns Everywhere

Add `created_by uuid` and `updated_by uuid` (referencing `users(id)`) to every user-mutable `public` table that doesn't already have them:

- **Bidding/Budget:** `project_bids`, `project_bid_packages`, `project_budgets`, `project_budget_manual_lines`, `budget_subcategory_selections`, `budget_warning_rules`
- **Accounting:** `journal_entries`, `journal_entry_lines`, `bill_lines`, `check_lines`, `deposit_lines`, `credit_card_lines`, `accounts`, `accounting_periods`, `accounting_settings`, `bank_reconciliations`, `cost_codes`, `cost_code_specifications`, `cost_code_price_history`, `vendor_aliases`, `bill_categorization_examples`, `recurring_transactions`, `recurring_transaction_lines`, `check_print_settings`, `project_check_settings`
- **Projects/Schedule:** `projects`, `project_lots`, `project_schedule_tasks`, `project_folder_access_grants`
- **Companies:** `companies`, `company_representatives`, `company_feature_access`, `marketplace_companies`, `marketplace_subscriptions`, `subscriptions`
- **Files/Photos/Attachments:** `project_files`, `project_photos`, `bill_attachments`, `check_attachments`, `deposit_attachments`, `credit_card_attachments`, `journal_entry_attachments`, `issue_files`, `pending_bill_uploads`, `pending_bill_lines`, `pending_insurance_uploads`
- **Takeoff:** `takeoff_projects`, `takeoff_sheets`, `takeoff_items`, `takeoff_annotations`, `takeoff_project_estimate_items`, `takeoff_project_profiles`
- **Apartments:** `apartment_inputs`, `apartment_pro_formas`
- **Other:** `dashboard_card_settings`, `user_notification_preferences`, `template_content` (add created_by; updated_by exists)
- **Add only `updated_by`** (created_by exists): `bills`, `checks`, `deposits`, `credit_cards`, `bill_payments`, `project_purchase_orders`, `project_folders`, `shared_links`, `company_issues`

**Skip:** `users`, `user_roles`, `project_po_counters`.

## 2. Auto-Stamp Trigger

```sql
create or replace function public.set_audit_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();          -- always trust the session, not the client
    new.updated_by := auth.uid();
  elsif tg_op = 'UPDATE' then
    new.updated_by := coalesce(auth.uid(), new.updated_by);
    new.created_by := old.created_by;       -- immutable
  end if;
  return new;
end $$;
```

Attached `BEFORE INSERT OR UPDATE` to every audited table. Edge functions running with the service role are exempt (they pass `auth.uid() = NULL`); for those we'll explicitly pass `created_by` (e.g. `recreate-bill` already does).

## 3. Backfill

For historical rows, set `created_by = owner_id` (best-guess fallback so columns aren't NULL) and `updated_by = created_by`. New rows from this point on get accurate stamps.

## 4. Per-Record "Created/Modified by" Display

Shared `<RecordAuditFooter />` component appended to: Bill edit, PO detail, Bid Package dialog, Budget manual line tooltip, Journal Entry form, Check, Deposit, Credit Card transaction.

Format: `Created by Danny Sheehan · May 1, 2026 2:15 PM   ·   Modified by Mary Gray · May 3, 2026 9:02 AM`

Names resolved via new `useUsersById(ids)` hook that **only queries `users` rows in the caller's tenant** (`home_builder_id = effective owner` OR `id = effective owner`). Out-of-tenant ids → "Unknown user".

## 5. Employee Activity Report (Settings → Employees → Activity tab)

Visible to **owners + accountants only** (re-uses `useUserRole`). Lists every employee where `users.home_builder_id = caller's effective owner_id` (plus the owner themselves).

For each employee:
- Avatar, name, role
- **Last login** (from `auth.users.last_sign_in_at`)
- **Last action** (max created/updated timestamp across all audited tables)
- **Status badge:** 🟢 Active today · 🟡 Idle 7d · 🔴 Idle 30d+ · ⚫ Never logged in
- **30-day activity sparkline** (counts per day)
- Click → drill-down: Bills 12 · POs 4 · Bids 8 · JEs 15 · Files 6 · Budgets 3 · Schedule edits 22 · Chats 47

**Server side:** one SECURITY DEFINER RPC `get_employee_activity_summary(start_date, end_date)`:

```text
1. Resolve caller's effective owner_id via get_current_user_home_builder_info().
   If null → return empty.
2. Build the set of in-tenant user_ids: owner + all users where home_builder_id = owner.
3. UNION ALL counts from each audited table, filtered by:
     - owner_id = caller's owner_id  (tenant filter, defense in depth)
     - created_by = ANY(in_tenant_user_ids)
   bucketed by date.
4. Return aggregated rows. Never returns a user_id outside the tenant.
```

A second RPC `get_users_last_sign_in(user_ids uuid[])` returns `last_sign_in_at` from `auth.users` — but only for user_ids that pass the same in-tenant check. IDs from other tenants are silently dropped.

## 6. Files

**New:**
- `supabase/migrations/<ts>_add_audit_columns.sql`
- `supabase/migrations/<ts>_employee_activity_rpcs.sql`
- `src/components/audit/RecordAuditFooter.tsx`
- `src/hooks/useUsersById.ts` (tenant-scoped lookup, cached)
- `src/components/employees/EmployeeActivityTab.tsx`
- `src/components/employees/EmployeeActivityRow.tsx` (sparkline + drill-down)
- `src/hooks/useEmployeeActivity.ts`

**Modified:**
- `src/components/settings/EmployeesTab.tsx` — adds `Activity` sub-tab
- Bill / PO / Bid Package / Budget / JE / Check / Deposit edit dialogs — append `<RecordAuditFooter />`

## 7. Memory Updates

- New core rule: *"All user-mutable tables auto-stamp `created_by`/`updated_by` via `set_audit_user()` trigger using `auth.uid()`. Never set these in app code; never trust client-supplied values."*
- New memory `mem://architecture/audit-columns-and-employee-activity` documenting the pattern + tenant-scoping rules for the activity RPCs.

## Out of Scope
- Field-level history (who changed which column).
- Time-tracking / hours-worked.
- Idle-employee email alerts (follow-up).
- Cross-tenant platform-admin views (separate admin app per existing strategy).
