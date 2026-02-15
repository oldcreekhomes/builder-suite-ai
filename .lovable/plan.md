

## Fix Budget & Dashboard Header Position

### Problem

The Budget Warnings and Dashboard Settings tabs have `py-4` padding on their outermost wrapper div, which pushes their title and subtitle lower than the other tabs. Company Profile, Employees, Companies, Cost Codes, Specifications, and Chart of Accounts all use `space-y-6` without `py-4`.

### Changes

**1. `src/components/settings/BudgetWarningsTab.tsx`**
- Remove `py-4` from the outer div: change `className="space-y-6 py-4"` to `className="space-y-6"`

**2. `src/components/settings/DashboardSettingsTab.tsx`**
- Remove `py-4` from the outer div: change `className="space-y-6 py-4"` to `className="space-y-6"`

### Result

The title and subtitle on Budget and Dashboard will align to the exact same vertical position as all other Settings tabs.

