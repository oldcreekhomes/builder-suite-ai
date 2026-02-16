

## Remove "Parent" Column from Chart of Accounts Table

### Overview
Remove the "Parent" column from the Chart of Accounts table since the hierarchy is already visually indicated by the indentation and arrow prefix on sub-accounts.

### Change

**`src/components/settings/ChartOfAccountsTab.tsx`**
- Remove the "Parent" `TableHead` from the header row
- Remove the "Parent" `TableCell` from each data row (the one showing `parentAccount.code - parentAccount.name`)
- Update the `colSpan` on the empty-state row from 7 to 6
- Remove the `parentAccount` lookup variable since it will no longer be needed

