

# Add "Do You Have Employees?" Dialog for Onboarding Step 8

## Problem
Step 8 ("Invite Employees") currently checks if any employees exist in the database. Companies without employees can never complete onboarding.

## Solution
Replace the current "link to employees tab" behavior with a dialog action. When the user clicks "Go" on Step 8, a dialog asks "Do you have employees?" with Yes/No options:
- **Yes**: Navigates them to `/settings?tab=employees` to add employees (step completes dynamically when they add one)
- **No**: Immediately marks `employees_invited` as `true` in the `onboarding_progress` table (acknowledging they have no employees)

Either path satisfies the onboarding requirement.

## Changes

### 1. `src/hooks/useOnboardingProgress.ts`
- Change the `employees_invited` step definition from `link: "/settings?tab=employees"` to `action: "employees-dialog"`
- Change the live check logic: instead of only checking employee count > 0, also check if `employees_invited` is already `true` in the `onboarding_progress` table (to handle the "No employees" case)
- Add a `confirmNoEmployees` callback (similar to `confirmWelcome`) that sets `employees_invited = true` in the database
- Export `confirmNoEmployees` from the hook's return value
- Update the `OnboardingProgress` interface to include `confirmNoEmployees`

### 2. `src/components/OnboardingChecklist.tsx`
- Add state: `employeesDialogOpen`
- Add a new Dialog with:
  - Title: "Do You Have Employees?"
  - Description: explaining they can add employees now or skip if they don't have any
  - Two buttons: "Yes, Add Employees" and "No, Skip This Step"
- Wire up `handleAction` to open the dialog when `action === "employees-dialog"`
- "Yes" button: closes the dialog and navigates to `/settings?tab=employees`
- "No" button: calls `confirmNoEmployees()` and closes the dialog

### 3. Live Check Logic Update (in `useOnboardingProgress.ts`)
Update the `employees_invited` resolution to:
```
employees_invited: (employeesRes.count ?? 0) > 0 || freshProgressRes.data?.employees_invited === true
```
This way, the step is satisfied if either employees exist OR the user explicitly confirmed "No employees." The `freshProgressRes` query will need to also select `employees_invited`.

## Technical Notes
- The `freshProgressRes` query (line 81) currently only selects `welcome_confirmed`. It needs to also select `employees_invited` to support the new logic.
- The sync logic in the `useEffect` already handles syncing live checks to the database, so no changes needed there -- but we must ensure the sync doesn't overwrite a `true` value with `false`. The current logic only updates when values differ, so if `employees_invited` is already `true` in the DB and the live check also returns `true`, no overwrite occurs.

