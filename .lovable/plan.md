

## Alphabetize Employee Access Preferences Sections

### Problem
The heading sections in the Employee Access preferences panel are not in alphabetical order, and neither are the sub-items within each section.

### Current order of sections
1. Dashboards
2. Estimating
3. Budgets
4. Cost Codes
5. Accounting
6. Employees
7. Projects
8. Templates
9. Marketplace
10. Apartments

### New alphabetical order of sections
1. Accounting
2. Apartments
3. Budgets
4. Cost Codes
5. Dashboards
6. Employees
7. Estimating
8. Marketplace
9. Projects
10. Templates

### Sub-items alphabetized within sections

**Accounting** (currently: Access Accounting Menu, Access Manage Bills, Access Transactions, Access Reports, Close the Books, Undo Reconciliation, Delete Invoices):
→ Access Accounting Menu, Access Manage Bills, Access Reports, Access Transactions, Close the Books, Delete Invoices, Undo Reconciliation

**Dashboards** (currently: PM Dashboard, Owner Dashboard, Accountant Dashboard):
→ Accountant Dashboard, Owner Dashboard, PM Dashboard

**Templates** (currently: Access Templates, Edit Templates):
→ Already alphabetical, no change needed.

All other sections have only one sub-item — no reordering needed.

### Fix
Reorder the JSX blocks in `src/components/employees/EmployeeAccessPreferences.tsx` to match the alphabetical order above, and reorder switch items within multi-item sections.

### Files changed
- `src/components/employees/EmployeeAccessPreferences.tsx`

