

# Show Congratulations Dialog Immediately After "Yes, Add Employees"

## Problem
The `OnboardingChecklist` component (which contains the congratulations dialog) only renders on the dashboard page (`/`). When the user clicks "Yes, Add Employees," they navigate to `/settings?tab=employees`, where the checklist is not mounted. The congratulations dialog only appears when the user manually navigates back to the dashboard.

## Solution
Instead of navigating immediately, wait for the database update to complete, then show the congratulations dialog right there in the employees dialog before navigating. The flow will be:

1. User clicks "Yes, Add Employees"
2. `confirmNoEmployees()` runs and we **await** it
3. Queries are invalidated and refetched
4. `allComplete` becomes `true`, triggering the built-in congratulations dialog
5. User clicks "Close" on the congratulations dialog
6. Then navigate to `/settings?tab=employees`

## Changes

### 1. `src/components/OnboardingChecklist.tsx`

**Update the "Yes, Add Employees" button handler** to `await confirmNoEmployees()` and NOT navigate immediately. Instead, set a flag like `navigateAfterCongrats` so that when the congratulations dialog is dismissed, it navigates to the employees page.

- Add state: `const [navigateAfterCongrats, setNavigateAfterCongrats] = useState(false)`
- "Yes, Add Employees" onClick becomes:
  ```
  async () => {
    await confirmNoEmployees();
    setEmployeesDialogOpen(false);
    setNavigateAfterCongrats(true);
  }
  ```
- In the `allComplete && !dismissed` congratulations dialog, update the `dismiss` handler:
  ```
  onClick={() => {
    dismiss();
    if (navigateAfterCongrats) {
      navigate("/settings?tab=employees");
      setNavigateAfterCongrats(false);
    }
  }}
  ```
- Also update the `onOpenChange` of the congratulations Dialog similarly.

### 2. `src/hooks/useOnboardingProgress.ts`

Make `confirmNoEmployees` return a Promise that resolves only after queries are refetched (not just invalidated). Change:
```ts
queryClient.invalidateQueries(...)
```
to:
```ts
await queryClient.refetchQueries(...)
```
This ensures the hook's `allComplete` value is updated before the calling component acts on it.

This way the congratulations dialog appears immediately on the current page (dashboard), and after dismissing it the user lands on the employees tab.
