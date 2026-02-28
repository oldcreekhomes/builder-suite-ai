

## Move Lock Button to Header and Remove Budget Page Redundancy

### Problem
The Budget page shows "Budget" twice -- once in the DashboardHeader and again in the BudgetPrintToolbar below it, along with a lock icon and "Manage budget for this project" text. This is redundant.

### Changes

**1. `src/components/DashboardHeader.tsx`** -- Accept optional `headerAction` prop (ReactNode) and render it to the right of the title:

```tsx
interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  projectId?: string;
  headerAction?: React.ReactNode;  // new
}
```

In the project header section, place `headerAction` next to the title:
```
<div className="flex items-center gap-2">
  <h1>Budget</h1>
  {headerAction}   <!-- lock icon goes here -->
</div>
```

**2. `src/pages/ProjectBudget.tsx`** -- Pass the lock button as `headerAction` to DashboardHeader:
- Import `useBudgetLockStatus` and the lock icon/tooltip markup
- Render the lock button inline as `headerAction` prop

**3. `src/components/budget/BudgetPrintToolbar.tsx`** -- Remove:
- The `<h1>Budget</h1>` heading (line 46)
- The lock icon/tooltip block (lines 47-77)
- The `<p>Manage budget for this project</p>` text (lines 100-102)
- The outer `space-y-4` wrapper becomes just the single toolbar row with buttons

### Result
- Lock icon appears in the header bar next to "Budget", above "Manage project budget and cost tracking."
- No duplicate "Budget" heading or "Manage budget for this project" text below the header
- The toolbar area only contains the action buttons (expand/collapse, lot selector, add budget, export PDF)
