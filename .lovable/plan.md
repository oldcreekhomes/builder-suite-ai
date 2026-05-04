# Employee Accountability & Audit Trail (Owner Dashboard)

Add `created_by` + `updated_by` to every user-mutable table so the company owner can see exactly who on **their own team** is doing what — strictly tenant-isolated, gated by Employee Settings permissions.

## Access & Placement
- **Location:** Owner Dashboard only — new "Employee Activity" section below "Active Jobs".
- **Visibility gate:** existing Employee Settings permission (`user_notification_preferences` app-level perm). If the user lacks it, the section never renders.
- **Server-side defense:** `get_employee_activity_summary` RPC re-checks the same permission and tenant before returning anything.

## Multi-Tenant Guarantee
- All queries scoped by `home_builder_id`.
- `useUsersById` only resolves IDs in the caller's tenant — out-of-tenant IDs render as "Unknown user".
- `set_audit_user()` trigger stamps `auth.uid()` only; `created_by` immutable on UPDATE; never trusts client values.

## 1. Schema Migration — Audit Columns
Add `created_by uuid` + `updated_by uuid` (FK `users(id)`) to every user-mutable table that lacks them:
- **Bidding/Budget:** `project_bids`, `project_bid_packages`, `project_budgets`, `project_budget_manual_lines`, `budget_subcategory_selections`, `budget_warning_rules`
- **Accounting:** `journal_entries`, `journal_entry_lines`, `bill_lines`, `check_lines`, `deposit_lines`, `credit_card_lines`, `accounts`, `accounting_periods`, `accounting_settings`, `bank_reconciliations`, `cost_codes`, `cost_code_specifications`, `cost_code_price_history`, `vendor_aliases`, `bill_categorization_examples`, `recurring_transactions`, `recurring_transaction_lines`, `check_print_settings`, `project_check_settings`
- **Projects/Schedule:** `projects`, `project_lots`, `project_schedule_tasks`, `project_folder_access_grants`
- **Companies:** `companies`, `company_representatives`, `company_feature_access`, `marketplace_companies`, `marketplace_subscriptions`, `subscriptions`
- **Files/Photos/Attachments:** `project_files`, `project_photos`, `bill_attachments`, `check_attachments`, `deposit_attachments`, `credit_card_attachments`, `journal_entry_attachments`, `issue_files`, `pending_bill_uploads`, `pending_bill_lines`, `pending_insurance_uploads`
- **Takeoff:** `takeoff_projects`, `takeoff_sheets`, `takeoff_items`, `takeoff_annotations`, `takeoff_project_estimate_items`, `takeoff_project_profiles`
- **Apartments:** `apartment_inputs`, `apartment_pro_formas`
- **Other:** `dashboard_card_settings`, `user_notification_preferences`, `template_content`
- **Add only `updated_by`:** `bills`, `checks`, `deposits`, `credit_cards`, `bill_payments`, `project_purchase_orders`, `project_folders`, `shared_links`, `company_issues`
- **Skip:** `users`, `user_roles`, `project_po_counters`.

## 2. Auto-Stamp Trigger
`set_audit_user()` BEFORE INSERT OR UPDATE — stamps `auth.uid()` on insert; updates `updated_by` on update; keeps `created_by` immutable. Edge functions running with service role pass `created_by` explicitly.

## 3. Backfill
Historical rows: `created_by = owner_id` fallback so columns aren't NULL. New rows from this point on are accurate.

## 4. Per-Record "Created/Modified by" Display
Shared `<RecordAuditFooter />` appended to: Bill edit, PO detail, Bid Package, Budget manual line, JE form, Check, Deposit, Credit Card. Format: `Created by Danny Sheehan · May 1, 2026 2:15 PM   ·   Modified by Mary Gray · May 3, 2026 9:02 AM`. Names via tenant-scoped `useUsersById`.

## 5. Owner Dashboard "Employee Activity" Section
Collapsible section below Active Jobs. Hidden unless caller has Employee Settings permission.

Per employee row:
- Avatar, name, role
- **Last login** (`auth.users.last_sign_in_at` via SECURITY DEFINER RPC)
- **Last action** (max created/updated across all audited tables)
- **Status badge:** 🟢 Active today · 🟡 Idle 7d · 🔴 Idle 30d+ · ⚫ Never logged in
- **30-day sparkline**
- Click → drill-down counts: Bills · POs · Bids · JEs · Files · Budgets · Schedule edits · Chats

**RPCs (SECURITY DEFINER):**
- `get_employee_activity_summary(start_date, end_date)` — checks Employee Settings perm + resolves tenant, builds in-tenant user_id set, UNION ALL counts across audited tables filtered by `created_by`/`updated_by`, returns aggregated rows.
- `get_users_last_sign_in(user_ids[])` — returns `auth.users.last_sign_in_at` only for IDs passing the same in-tenant + perm check.

## 6. Files
**New:**
- `supabase/migrations/<ts>_add_audit_columns.sql`
- `supabase/migrations/<ts>_employee_activity_rpcs.sql`
- `src/components/audit/RecordAuditFooter.tsx`
- `src/hooks/useUsersById.ts`
- `src/components/dashboard/EmployeeActivitySection.tsx`
- `src/components/dashboard/EmployeeActivityRow.tsx`
- `src/hooks/useEmployeeActivity.ts`

**Modified:**
- Owner Dashboard page (e.g. `src/pages/Index.tsx` or current dashboard) — render `<EmployeeActivitySection />` gated on Employee Settings perm
- Bill / PO / Bid Package / Budget / JE / Check / Deposit edit dialogs — append `<RecordAuditFooter />`

## 7. Memory
- New core rule: *"All user-mutable tables auto-stamp `created_by`/`updated_by` via `set_audit_user()` trigger using `auth.uid()`. Never set in app code."*
- New memory `mem://architecture/audit-columns-and-employee-activity` with pattern + tenant/perm rules.

## Out of Scope
Field-level history, time-tracking, idle-employee email alerts, cross-tenant platform-admin views.
