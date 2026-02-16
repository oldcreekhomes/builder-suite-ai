

## Fix: Template Dialog and Onboarding Checklist Not Reacting to Company Changes

### Root Causes (3 bugs)

1. **Template dialog won't dismiss**: The company count query uses key `["companies-count", userId]`, but mutations refetch `["companies"]`. The count never refreshes, so the dialog thinks there are still 0 companies.

2. **Onboarding checklist not updating**: `AddCompanyDialog` and `CompaniesTable` (delete) don't invalidate `["onboarding-live-checks"]`, so the dashboard never re-checks whether companies exist.

3. **Onboarding can't uncheck**: The sync logic only sets fields from `false` to `true`, never back to `false`. Deleting all companies leaves "Add Subcontractors" permanently checked.

### Fixes

**1. `src/components/settings/CompaniesTab.tsx`**
- Change query key from `["companies-count", user?.id]` to `["companies", "count", user?.id]`
- Since mutations already refetch/invalidate `["companies"]`, this will auto-invalidate the count

**2. `src/components/companies/AddCompanyDialog.tsx`**
- After the existing `refetchQueries` calls (around line 377), add:
  - `queryClient.invalidateQueries({ queryKey: ["onboarding-live-checks"] })`

**3. `src/components/companies/CompaniesTable.tsx`**
- After the existing delete invalidation (around line 164), add:
  - `queryClient.invalidateQueries({ queryKey: ["onboarding-live-checks"] })`

**4. `src/hooks/useOnboardingProgress.ts`**
- Update the sync logic (lines 99-109) to also detect when a live check goes from `true` back to `false` (i.e., when `!liveChecks[f] && progressRow[f]`), and write `false` back to the database
- This allows deleting all companies to uncheck "Add Subcontractors"

### Result
- Adding a company dismisses the template dialog immediately
- The onboarding checklist updates in both directions (check and uncheck)
- Deleting all companies brings back both the template dialog and the unchecked onboarding step

