## Goal

Add a new **Reallocations** permission to the Edit Employee → Access tab, positioned between **Delete Invoices** and **Undo Reconciliation**. Default OFF for everyone (including owners). This permission will later gate the ability to reallocate a transaction's account/cost code after the period is closed or reconciled (date and amount stay untouched, so books are unaffected).

This plan covers only the permission scaffolding. The actual reallocation UI inside the Transaction Details dialog will be a follow-up once the toggle exists and you confirm placement.

## Changes

1. **Database migration** — add `can_reallocate boolean not null default false` to `public.user_notification_preferences`. No backfill needed (default false satisfies "off for all employees including owner").

2. **`src/hooks/useNotificationPreferences.tsx`**
   - Add `can_reallocate: boolean` to the `NotificationPreferences` interface.
   - Add `can_reallocate: false` to `defaultPreferences`.
   - Do NOT add it to the `ownerPermissions` override (owners also default to off).

3. **`src/components/employees/EmployeeAccessPreferences.tsx`** — insert a new toggle block between the existing "Delete Invoices" and "Undo Reconciliation" blocks:
   - Label: **Reallocations**
   - Description: "Ability to reallocate a transaction's account or cost code after the period has been closed or reconciled (amount and date are not changed)."
   - Bound to `preferences.can_reallocate` / `updatePreferences({ can_reallocate: checked })`.

4. **New hook `src/hooks/useReallocationPermissions.ts`** mirroring `useUndoReconciliationPermissions`, but WITHOUT the automatic owner override — returns `canReallocate = preferences?.can_reallocate ?? false`. This keeps the default truly off for everyone, including owners, until they explicitly enable it on their own employee record.

## Out of scope (follow-up)

- Wiring `canReallocate` into the Transaction Details dialog / journal entry edit flow to actually permit changing the account on a locked/closed-period transaction.
- Audit logging of reallocations.

Confirm and I'll implement the four items above.
