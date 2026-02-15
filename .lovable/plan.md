

## Consolidate Employees and Companies into the Settings Page

### What Changes

Move the Employees table and the Companies page (with its 4 sub-tabs: Companies, Representatives, Marketplace, Marketplace Representatives) into the Settings page as additional vertical tabs. Then simplify the sidebar user dropdown to just Profile, Settings, and Log out.

### Settings Page -- New Tab Layout

The left sidebar in Settings will go from 6 tabs to 8:

```text
Settings
-----------------------
  Company Profile
  Employees          <-- NEW (moved from /employees page)
  Companies          <-- NEW (moved from /companies page, includes its 4 sub-tabs)
  Cost Codes
  Specifications
  Chart of Accounts
  Budget
  Dashboard
```

When "Companies" is selected, the content area will show the same horizontal tab bar (Companies / Representatives / Marketplace / Marketplace Representatives) that currently exists on the /companies page.

When "Employees" is selected, the content area will show the same Employee Management table with the "Add Employee" button.

### Sidebar User Dropdown -- Simplified

Currently shows: Profile, Employees, Companies, Settings, Log out

After change: Profile, Settings, Log out

The Employees and Companies menu items are removed since they're now accessible inside Settings.

### Routing Changes

- `/employees` route will redirect to `/settings?tab=employees`
- `/companies` route will redirect to `/settings?tab=companies`
- This preserves any existing links or bookmarks

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/settings/EmployeesTab.tsx` | Wraps the EmployeeTable and AddEmployeeDialog for use inside the Settings tab |
| `src/components/settings/CompaniesTab.tsx` | Wraps the Companies page content (4 sub-tabs with tables and add dialogs) for use inside the Settings tab |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/Settings.tsx` | Add "Employees" and "Companies" TabsTrigger + TabsContent entries; import and render the new tab components |
| `src/components/sidebar/SidebarUserDropdown.tsx` | Remove the Employees and Companies DropdownMenuItems; remove related imports (Building2, UserPlus, useEmployeePermissions) |
| `src/pages/Employees.tsx` | Replace with a redirect to `/settings?tab=employees` |
| `src/pages/Companies.tsx` | Replace with a redirect to `/settings?tab=companies` |
| `src/components/sidebar/SidebarNavigation.tsx` | Remove `/companies` and `/employees` from the `isGlobalPage` check since those routes now redirect |

### Permissions

- The Employees tab inside Settings will retain the same permission checks (isOwner, isAccountant, canAccessEmployees). If the user lacks permission, the tab content shows the existing "Access Denied" card.
- The Companies tab has no special permission gating currently and stays that way.

