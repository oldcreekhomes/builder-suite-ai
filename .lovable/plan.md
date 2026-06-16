Change the default sort on the accountant dashboard jobs table from "Address" (ascending) to "Accounting Manager" (ascending by first name). Update the sort state type to include `'manager'`, make the Accounting Manager column header clickable, and add the corresponding sort logic.

Files changed:
- `src/components/accountant-dashboard/AccountantJobsTable.tsx`

Changes:
1. Update `sortColumn` state type from `'address'` to `'address' | 'manager'` and default from `'address'` to `'manager'`.
2. Update `handleSort` parameter type and implementation to support `'manager'`.
3. Update `getSortIcon` parameter type accordingly.
4. Add sort logic for manager: sort by `accounting_manager_user.first_name` (case-insensitive) ascending/descending.
5. Make the "Accounting Manager" `<TableHead>` clickable with the same hover/sort-icon styling as the Address column.