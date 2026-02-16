

## Fix: Update RLS Policies on `onboarding_progress` for Employee Access

### Problem
All three RLS policies on `onboarding_progress` require `home_builder_id = auth.uid()`. Employees have a different `auth.uid()` than the owner, so they are blocked from reading the dismissed state or clicking "Close" on the congratulations dialog.

### Solution
Update the SELECT and UPDATE policies to also allow access for users whose `home_builder_id` in the `users` table matches the record. The INSERT policy stays owner-only (only owners should create the initial row).

### Database Migration

```sql
-- Drop existing SELECT and UPDATE policies
DROP POLICY "Owners can view own onboarding progress" ON onboarding_progress;
DROP POLICY "Owners can update own onboarding progress" ON onboarding_progress;

-- Recreate SELECT policy: owner OR employee of that company
CREATE POLICY "Company members can view onboarding progress"
ON onboarding_progress FOR SELECT TO authenticated
USING (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid()
  )
);

-- Recreate UPDATE policy: owner OR employee of that company
CREATE POLICY "Company members can update onboarding progress"
ON onboarding_progress FOR UPDATE TO authenticated
USING (
  home_builder_id = auth.uid()
  OR home_builder_id IN (
    SELECT u.home_builder_id FROM users u WHERE u.id = auth.uid()
  )
);
```

### What This Fixes
- Employees can now read the `dismissed = true` flag, so the dialog won't appear if the owner already dismissed it
- Employees can click "Close" on the congratulations dialog and it will actually persist
- The INSERT policy remains owner-only -- only the owner's first visit creates the progress row

### No Frontend Changes Needed
The existing `effectiveOwnerId` logic in `useOnboardingProgress.ts` already resolves the correct owner ID for employees. The only blocker was the database refusing the requests.

### Files Changed
- 1 database migration (RLS policy update on `onboarding_progress`)

