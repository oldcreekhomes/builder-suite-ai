

## Standardize Budget & Dashboard Headers + Add Descriptions to Employees & Companies

### Problem

The Budget and Dashboard tabs use smaller typography (`text-sm font-medium` heading, `text-xs` descriptions) while all other tabs use `text-lg font-semibold` headings with `text-sm` subtitles. Additionally, Employees and Companies tabs are missing subtitle descriptions.

### Reference Pattern (from Chart of Accounts, Specifications, etc.)

```text
Chart of Accounts                              [Action Buttons]
Manage your chart of accounts (14 accounts)
```

Heading: `h3 className="text-lg font-semibold"`
Subtitle: `p className="text-sm text-muted-foreground"`

### Changes

**1. BudgetWarningsTab.tsx**
- Line 77: Change `text-sm font-medium` to `text-lg font-semibold`
- Line 78: Change `text-xs text-muted-foreground` to `text-sm text-muted-foreground`
- Line 85: Change Alert `text-xs` to `text-sm`

**2. DashboardSettingsTab.tsx**
- Line 59: Change `text-sm font-medium` to `text-lg font-semibold`
- Line 60: Change `text-xs text-muted-foreground` to `text-sm text-muted-foreground`
- Line 67: Change Alert `text-xs` to `text-sm`

**3. EmployeesTab.tsx**
- Line 53: Change `text-2xl font-bold` to `text-lg font-semibold` (match the other tabs)
- Add subtitle: "Manage your team members and their access permissions"

**4. CompaniesTab.tsx**
- Line 35: Change `text-2xl font-bold` to `text-lg font-semibold`
- Add subtitle: "Manage your companies, representatives, and marketplace connections"

### Result

All 8 Settings tabs will share the identical header pattern: `text-lg font-semibold` title with a `text-sm text-muted-foreground` subtitle underneath.

