

## Add Apartments Section to Sidebar with Permission-Gated Access

### Overview
Add an "Apartments" menu item to the sidebar (below Marketplace) with four sub-pages: Dashboard, Inputs, Income Statement, and Amortization Schedule. Access is off by default for all users and controlled via the existing Employee Access preferences system.

### Database Migration
Add a `can_access_apartments` boolean column to `user_notification_preferences`, defaulting to `false`:

```sql
ALTER TABLE public.user_notification_preferences 
ADD COLUMN can_access_apartments boolean NOT NULL DEFAULT false;
```

### New Files

1. **`src/hooks/useApartmentPermissions.ts`** — follows the same pattern as `useMarketplacePermissions.ts`. Reads `can_access_apartments` from notification preferences.

2. **`src/components/guards/ApartmentGuard.tsx`** — follows the `MarketplaceGuard` pattern. Redirects unauthorized users with a toast.

3. **Four apartment page components** (project-scoped, at `/project/:projectId/apartments/...`):
   - `src/pages/apartments/ApartmentDashboard.tsx` — Executive dashboard replicating the layout from screenshot 1 (Income Summary, Loan Summary, Expense & NOI Summary, Property Assumptions, Key Performance Metrics)
   - `src/pages/apartments/ApartmentInputs.tsx` — Editable inputs page (Property & Revenue, Operating Expenses, Loan Inputs) matching screenshot 2
   - `src/pages/apartments/ApartmentIncomeStatement.tsx` — Pro forma income statement (Revenue, Operating Expenses, Debt Service, CFADS) matching screenshot 3
   - `src/pages/apartments/ApartmentAmortizationSchedule.tsx` — Loan amortization table matching screenshot 4

   All four pages will initially be static UI scaffolds with the correct layout, sections, and labels from the screenshots. Data will be hardcoded/placeholder for now — the user can request database-backed persistence later.

### Modified Files

4. **`src/components/sidebar/SidebarNavigation.tsx`**:
   - Import `useApartmentPermissions` and a `Building` icon
   - After the Marketplace block (~line 275), add the Apartments section with four indented sub-links, gated by `canAccessApartments` (same pattern as Accounting's sub-menu)
   - Sub-links: Dashboard, Inputs, Income Statement, Amortization Schedule

5. **`src/components/employees/EmployeeAccessPreferences.tsx`**:
   - Add an "Apartments" toggle section after the Marketplace section, controlling `can_access_apartments`

6. **`src/App.tsx`**:
   - Add lazy imports for the four apartment pages
   - Add four routes under `/project/:projectId/apartments/...`, wrapped in `ProtectedRoute` and `ApartmentGuard`

### Technical Details
- The permission column defaults to `false`, so no existing user gains access automatically
- The sidebar menu item and sub-links only render when `canAccessApartments` is true and permissions are loaded
- Routes are protected by both `ProtectedRoute` (auth) and `ApartmentGuard` (permission)
- Pages are project-scoped (under `/project/:projectId/apartments/...`) consistent with how Accounting works

