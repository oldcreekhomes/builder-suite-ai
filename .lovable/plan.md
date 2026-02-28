

# Fix "Yes, Add Employees" to Mark Step 8 Complete

## Problem
Clicking "Yes, Add Employees" navigates to the employees page but does NOT mark step 8 as complete. The step only completes if employees actually exist in the database. The user expects that choosing "Yes" should immediately mark the step done (since they've acknowledged it) and then show the congratulations dialog.

## Solution
In `src/components/OnboardingChecklist.tsx`, update the "Yes, Add Employees" button handler to also call `confirmNoEmployees()` before navigating. This sets `employees_invited = true` in the database, which satisfies the step completion check. The onboarding will then show all 8 steps complete and trigger the congratulations dialog.

## Change

**File: `src/components/OnboardingChecklist.tsx` (lines 199-203)**

Update the "Yes, Add Employees" button's `onClick` from:
```tsx
onClick={() => {
  setEmployeesDialogOpen(false);
  navigate("/settings?tab=employees");
}}
```
To:
```tsx
onClick={() => {
  confirmNoEmployees();
  setEmployeesDialogOpen(false);
  navigate("/settings?tab=employees");
}}
```

This reuses the existing `confirmNoEmployees` function which sets `employees_invited = true` in the `onboarding_progress` table and invalidates the relevant queries. After navigation, the onboarding checklist will detect all 8 steps are complete and show the congratulations dialog.

