
## Add "Delete Price History" Permission and Delete Functionality

### Overview
Add a new permission `can_delete_price_history` that controls whether a user can delete entries from the Price History dialog. This permission defaults to FALSE for all users (including owners) and must be explicitly enabled in the Edit Employee Access tab.

### Changes Required

**1. Database: Add column to `user_notification_preferences`**
- Run SQL migration to add `can_delete_price_history boolean not null default false` to the `user_notification_preferences` table
- Regenerate Supabase types so the new column appears in the TypeScript types

**2. `src/hooks/useNotificationPreferences.tsx`**
- Add `can_delete_price_history: boolean` to the `NotificationPreferences` interface
- Add `can_delete_price_history: false` to `defaultPreferences`
- Keep it `false` in owner defaults too (matching the pattern used for `can_delete_bills`)

**3. `src/components/employees/EmployeeAccessPreferences.tsx`**
- Add a new "Delete Price History" toggle in the Accounting section (after the "Delete Invoices" toggle)
- Label: "Delete Price History"
- Description: "Ability to delete historical price entries from cost codes"
- Wired to `preferences.can_delete_price_history`

**4. `src/components/settings/PriceHistoryManager.tsx`**
- Add a `canDeletePriceHistory?: boolean` prop
- Add a delete button (trash icon or X) on each price history entry row, only visible when `canDeletePriceHistory` is true
- On delete: show a confirmation dialog, then delete the record from `cost_code_price_history`, delete any associated file from storage, re-sync the `cost_codes.price` to the new most recent entry, call `onPriceUpdate()`, and refresh the list

**5. `src/components/EditCostCodeDialog.tsx`**
- Import and use `useNotificationPreferences` to get `can_delete_price_history`
- Pass it to `PriceHistoryManager` as `canDeletePriceHistory`

### Technical Details

| File | Change |
|------|--------|
| Database migration | Add `can_delete_price_history` column (default false) |
| `src/hooks/useNotificationPreferences.tsx` | Add field to interface and defaults |
| `src/components/employees/EmployeeAccessPreferences.tsx` | Add toggle in Accounting section |
| `src/components/settings/PriceHistoryManager.tsx` | Add `canDeletePriceHistory` prop, delete button per row, delete handler with confirmation, price re-sync after delete |
| `src/components/EditCostCodeDialog.tsx` | Read permission and pass to PriceHistoryManager |

### Delete Logic (PriceHistoryManager)
When a price history entry is deleted:
1. If it has a `file_path`, delete the file from Supabase storage
2. Delete the row from `cost_code_price_history`
3. Fetch the new most recent price history entry
4. Update `cost_codes.price` to match the new most recent entry (or set to 0 if no history remains)
5. Call `onPriceUpdate()` to refresh the table and edit dialog
6. Refresh the local price history list
