# Collapse "accountant" role into "employee"

Two roles only going forward: **owner** and **employee**. Jole and any code path that treats `accountant` as a distinct role gets converted to `employee`. Marketing copy and the "Accountant/CPA" *company type* (that's a vendor category in the marketplace, not a user role) are left alone.

## 1. Database migration

- Update `public.users`: `UPDATE users SET role = 'employee' WHERE role = 'accountant'` (affects Jole — 1 row).
- Update `public.user_roles`: same conversion for any rows with `role = 'accountant'`.
- Leave the `app_role` enum value `'accountant'` in place for now (dropping enum values requires rewriting every policy/function that references it — safer to just stop using it). New writes will only ever use `owner`/`employee`.

## 2. Edit Employee & Add Employee dialogs

`src/components/employees/EditEmployeeDialog.tsx` and `src/components/employees/AddEmployeeDialog.tsx` — role dropdown becomes exactly two items:

- Owner
- Employee

Remove `Accountant`, `Construction Manager`, `Project Manager` options.

## 3. Code paths that branch on `role = 'accountant'`

Replace the role check with `employee` (or drop the extra clause where it's redundant with an existing `employee` check):

- `src/hooks/useUserRole.ts` — drop `isAccountant`, drop accountant from `canDeleteBills` (owners + employees keep delete; if you want deletes owner-only, say so and I'll change).
- `src/hooks/useCompanyWideBillAlerts.ts` line 27 — remove the `|| 'accountant'` clause.
- `src/hooks/useAccountingPeriods.ts` line 73 — same.
- `src/components/settings/EmployeesTab.tsx` — drop `isAccountant` gate (owner + `canAccessEmployees` preference).
- `src/lib/getEffectiveOwnerId.ts` — comment cleanup only.
- `src/components/bills/SimplifiedAIBillExtraction.tsx` — comment cleanup only.
- `supabase/functions/extract-bill-data/index.ts` — comment cleanup only (logic already covers all non-owner roles).

## 4. Dashboard "Accountant" view

The Accountant Dashboard is a **view preference** (`can_access_accountant_dashboard`), not a role. I'll leave the dashboard itself and its toggle in place — it's still useful for a bookkeeping-focused employee. Nothing on that surface is role-gated by `accountant`; it's all preference-gated.

If you want me to rename it "Accounting Dashboard" or remove it entirely, say so.

## 5. Left untouched (on purpose)

- `Accountant/CPA` in `companyTypeGoogleMapping.ts` and `populate-marketplace/index.ts` — that's a **marketplace vendor category** (external CPA firms), not an internal user role.
- Marketing copy in `Landing.tsx`, blog manifest, bill-approval helper text ("notes visible to the accountant") — user-facing English about the bookkeeping persona, not role checks.
- `src/components/representatives/RepresentativesTable.tsx` — that's the **owner-company representative** picker for marketplace vendor profiles, unrelated to app auth roles.

## Technical notes

- No app_role enum drop → no cascading policy rewrites, no risk of breaking RLS.
- Jole's session picks up the new role on her next page load (React Query refetch on `user_roles`).
- Storage/bucket policies that check `role = 'employee'` will now correctly admit Jole — this incidentally fixes the Bills PDF issue for her without touching any RLS.
