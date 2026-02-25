

## Move "Delete Price History" to a New "Cost Codes" Section in Employee Access

### Change
In `src/components/employees/EmployeeAccessPreferences.tsx`, remove the "Delete Price History" toggle from the Accounting section and create a new "Cost Codes" section for it instead.

### Details

**File: `src/components/employees/EmployeeAccessPreferences.tsx`**

1. Remove the "Delete Price History" toggle block (lines ~250-265) from the Accounting section
2. Add a new "Cost Codes" section after the Budgets section (before Accounting) with:
   - Header: "Cost Codes"
   - Subtitle: "Manage cost code-related permissions"
   - Contains the "Delete Price History" toggle, wired to `preferences.can_delete_price_history`

No other files need changes -- the permission field and database column remain the same; this is purely a UI reorganization within the access preferences panel.

