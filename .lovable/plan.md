## Why Lex can't edit rejected invoices

In `BillsApprovalTable.tsx` the whole "..." actions column on the Rejected, Approved, and Paid tabs is rendered only when `canShowDeleteButton` is true, and that flag is driven solely by `can_delete_bills`. Lex's `user_notification_preferences` row has `can_delete_bills = false`, so he sees no menu at all — no Edit, no "Resend to Review", no Delete. There is no edit permission today; "Delete Invoices" was silently controlling editing too.

## Fix: add an "Edit Invoices" permission

1. **Database migration:** add `can_edit_bills boolean NOT NULL DEFAULT false` to `user_notification_preferences`. Existing rows stay OFF (per your choice), so nobody gains edit access until you enable it.
2. **Settings UI** (`src/components/employees/EmployeeAccessPreferences.tsx`): new toggle in the Accounting section, directly above "Delete Invoices":
   - **Edit Invoices** — "Ability to edit invoices on the Rejected, Approved, and Paid tabs, including resending rejected invoices back to review."
3. **Permissions hook** (`src/hooks/useAccountingPermissions.ts`): expose `canEditBills` from the new column; owners keep full access as they do today.
4. **Bills table** (`src/components/bills/BillsApprovalTable.tsx`): show the "..." menu when the user has either permission, and gate each item individually:
   - "Edit" and "Resend to Review" → require `canEditBills`
   - "Delete Bill" → still requires `canDeleteBills`
   - Existing locks (reconciled bills, closed periods) are unchanged.
5. **Turn it on for Lex** so he can edit rejected invoices immediately.

## Technical details

- Types in `src/integrations/supabase/types.ts` regenerate automatically after the migration; the UI changes come after it runs.
- `useNotificationPreferences.tsx` passes the whole preferences row through, so the new field flows to the toggle without extra plumbing.
- If both permissions are off, the actions column is hidden exactly as it is today — no behavior change for other employees.
