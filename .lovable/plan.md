
## Add "Can Delete Bills" Permission to Employee Access Level

### What Needs to Change

Currently, `canDeleteBills` in `useUserRole.ts` is hardcoded to only allow `owner` or `accountant` roles. You want this to be a per-employee toggle — just like "Undo Reconciliation" or "Close the Books" — stored in `user_notification_preferences` and controlled from the employee's Access Level panel.

### Summary of All Changes

**1. Database — Add `can_delete_bills` column**

A new boolean column needs to be added to the `user_notification_preferences` table:
- Column name: `can_delete_bills`
- Default: `false` (all employees off by default)
- Owners will get `true` when their preferences are auto-created

**2. `src/hooks/useNotificationPreferences.tsx`**

Add `can_delete_bills` to:
- The `NotificationPreferences` interface
- The `defaultPreferences` object (default: `false`)
- The owner auto-permissions block (owners get `true`)

**3. `src/hooks/useUserRole.ts`**

Remove the hardcoded `canDeleteBills` line:
```ts
// REMOVE this line:
canDeleteBills: roles.includes('owner') || roles.includes('accountant'),
```
The `canDeleteBills` value will now come from preferences, not roles.

**4. New hook — `src/hooks/useDeleteBillsPermission.ts`**

Create a small dedicated hook (matching the pattern of `useUndoReconciliationPermissions`, `useCloseBookPermissions`, etc.):
```ts
import { useNotificationPreferences } from "./useNotificationPreferences";

export const useDeleteBillsPermission = () => {
  const { preferences, isLoading } = useNotificationPreferences();
  return {
    canDeleteBills: isLoading ? false : (preferences.can_delete_bills ?? false),
    isLoading,
  };
};
```

**5. `src/components/bills/BillsApprovalTable.tsx`**

Replace the import of `useUserRole` (for `canDeleteBills`) with the new `useDeleteBillsPermission` hook. The `canShowDeleteButton` logic currently checks both `isOwner` and `canDeleteBills` for void bills — this simplifies to just `canDeleteBills` since owners will have the permission enabled by default via their preferences.

**6. `src/components/accounting/AccountDetailDialog.tsx`**

Same swap — replace `canDeleteBills` from `useUserRole` with the new hook.

**7. `src/components/employees/EmployeeAccessPreferences.tsx`**

Add the new toggle below "Undo Reconciliation" in the Accounting section:

```
Can Delete Bills
Ability to permanently delete posted, paid, or rejected bills
[Toggle — default OFF]
```

**8. Owner Auto-Permissions**

In `useNotificationPreferences.tsx`, add `can_delete_bills: true` to the `ownerPermissions` block so existing owners get the permission automatically when their preferences row is first created (or needs updating).

### Technical Notes

- The `user_notification_preferences` table already has RLS policies. No RLS changes are needed — the existing policies for that table handle access correctly.
- The hardcoded role check (`roles.includes('owner') || roles.includes('accountant')`) is completely removed from `useUserRole.ts`. The `canDeleteBills` property is removed from that hook's return value entirely.
- All existing employees (including you) will have `can_delete_bills = false` until you manually toggle it on for each person in their Access Level settings.
- Any existing owner preferences rows in the DB will need the new column set to `true` — this will be handled via a SQL update as part of the migration.

### Files to Edit

1. Database migration — add `can_delete_bills boolean default false` column
2. `src/hooks/useNotificationPreferences.tsx` — add field to interface + defaults + owner block
3. `src/hooks/useUserRole.ts` — remove `canDeleteBills` from return
4. `src/hooks/useDeleteBillsPermission.ts` — new file
5. `src/components/bills/BillsApprovalTable.tsx` — swap hook
6. `src/components/accounting/AccountDetailDialog.tsx` — swap hook
7. `src/components/employees/EmployeeAccessPreferences.tsx` — add toggle
