
## The Problem — Role-Based Permissions Must Be Replaced With Preference-Based

### What Is Currently Wrong

In `src/hooks/useUserRole.ts`, line 38:
```ts
canDeleteBills: roles.includes('owner') || roles.includes('accountant'),
```

And in `src/components/bills/BillsApprovalTable.tsx`, line 109:
```ts
const { canDeleteBills, isOwner } = useUserRole();
```

Then at lines 575-579, `isOwner` is used as an unconditional bypass:
```ts
const canShowDeleteButton = 
  ((isOwner || canDeleteBills) && (status === 'void' || ...)) ||
  (canDeleteBills && (status === 'posted' || 'paid' || ...));
```

This means:
- **Owners** always have delete access because `isOwner = true`, bypassing preferences entirely
- **Accountants** always have delete access because `canDeleteBills = roles.includes('accountant')`
- The `can_delete_bills` preference in the DB is **never consulted** for these users

The user has made it clear: **all users — owner, accountant, employee — must have this controlled exclusively through their `can_delete_bills` preference toggle**. The role check must be removed.

### What the DB Already Has

The `can_delete_bills` column already exists in `user_notification_preferences` with `DEFAULT false`. No DB migration is needed.

However, the DB defaults for existing owner/accountant rows may have `can_access_accounting = true` etc., but `can_delete_bills = false` — which is correct. The user will manually enable it per person.

### The 5 Changes Required

**1. `src/hooks/useNotificationPreferences.tsx`**

Add `can_delete_bills` to the `NotificationPreferences` interface and to `defaultPreferences` (default `false`):

```ts
// Interface — add:
can_delete_bills: boolean;

// defaultPreferences — add:
can_delete_bills: false,
```

Also, in the owner defaults block (where owners get all permissions `true`), do **NOT** include `can_delete_bills`. This ensures owners start with it off too, as the user requires.

**2. `src/hooks/useAccountingPermissions.ts`**

Add `canDeleteBills` sourced from the preference:

```ts
return {
  canAccessAccounting: preferences.can_access_accounting ?? false,
  canAccessManageBills: preferences.can_access_manage_bills ?? false,
  canAccessTransactions: preferences.can_access_transactions ?? false,
  canAccessReports: preferences.can_access_reports ?? false,
  canDeleteBills: preferences.can_delete_bills ?? false,  // NEW
  isLoading,
};
```

Also add it to the loading state return (returns `false` while loading).

**3. `src/components/employees/EmployeeAccessPreferences.tsx`**

Add a **"Delete Invoices"** toggle in the Accounting section (after "Undo Reconciliation"):

```tsx
<div className="flex items-center justify-between gap-4">
  <div className="space-y-0.5 flex-1">
    <Label htmlFor="can-delete-bills" className="text-sm font-normal cursor-pointer">
      Delete Invoices
    </Label>
    <p className="text-xs text-muted-foreground">
      Ability to delete paid invoices that have not been cleared or locked
    </p>
  </div>
  <Switch
    id="can-delete-bills"
    checked={preferences.can_delete_bills}
    onCheckedChange={(checked) => updatePreferences({ can_delete_bills: checked })}
  />
</div>
```

**4. `src/components/bills/BillsApprovalTable.tsx`**

Replace the `useUserRole` import with `useAccountingPermissions` for delete logic. Change lines 109 and 575-579:

```ts
// Line 109 — replace:
const { canDeleteBills, isOwner } = useUserRole();

// WITH:
const { isOwner } = useUserRole(); // keep isOwner for other uses if any
const { canDeleteBills } = useAccountingPermissions(); // preference-based only

// Lines 575-579 — replace entire canShowDeleteButton:
const canShowDeleteButton =
  (canDeleteBills && (
    status === 'void' ||
    status === 'posted' ||
    status === 'paid' ||
    (Array.isArray(status) && (status.includes('void') || status.includes('posted') || status.includes('paid')))
  ));
```

Note: `isOwner` is removed from the delete check entirely. Only `canDeleteBills` from preferences controls visibility. The bill-level guards (cleared/locked) already exist on the delete action button itself — those remain untouched.

**5. `src/components/bills/BillsApprovalTabs.tsx`**

Verify the Paid tab passes `showEditButton={true}` so the three-dot actions menu is rendered for users who have `canDeleteBills`. If it currently passes `showEditButton={false}` or omits it, update it.

### What This Achieves

| User Type | Before | After |
|---|---|---|
| Owner | Always could delete (role bypass) | Only if `can_delete_bills` toggle is ON in their preferences |
| Accountant | Always could delete (role bypass) | Only if `can_delete_bills` toggle is ON in their preferences |
| Employee | Never could delete | Only if `can_delete_bills` toggle is ON in their preferences |

All three user types are now controlled through the same single toggle in the Employee Access Preferences panel.

### No DB Migration Needed

The `can_delete_bills` column already exists with `DEFAULT false`. Existing rows with `false` are already correct. The user will manually turn it on for whoever needs it.

### Files to Change

| File | Change |
|---|---|
| `src/hooks/useNotificationPreferences.tsx` | Add `can_delete_bills: false` to interface and defaults; exclude from owner auto-grant |
| `src/hooks/useAccountingPermissions.ts` | Expose `canDeleteBills` from `preferences.can_delete_bills` |
| `src/components/employees/EmployeeAccessPreferences.tsx` | Add "Delete Invoices" toggle in Accounting section |
| `src/components/bills/BillsApprovalTable.tsx` | Switch delete permission to come from `useAccountingPermissions` only; remove `isOwner` from delete check |
| `src/components/bills/BillsApprovalTabs.tsx` | Ensure Paid tab renders actions menu for authorized users |
