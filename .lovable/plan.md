

# Add Borders to Each Onboarding Step Row

## Problem
The incomplete steps on the right side (Steps 5-8) lack visual definition because there is no border around them, making it hard to see they are aligned with the completed steps on the left.

## Fix

**File: `src/components/OnboardingChecklist.tsx`** (StepItem component, line ~22)

Add a `border` class to each `<li>` element so every step -- completed or not -- has a visible border, consistent with the card styling used elsewhere in the app.

Current classes:
```tsx
className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors h-10 ${
  step.completed
    ? "bg-primary/10 text-foreground"
    : "bg-muted/50 text-muted-foreground"
}`}
```

Updated classes (adding `border`):
```tsx
className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors h-10 border ${
  step.completed
    ? "bg-primary/10 text-foreground"
    : "bg-muted/50 text-muted-foreground"
}`}
```

This single addition of the `border` class applies the default border color (`hsl(var(--border))`) to all 8 step rows, giving both columns a consistent, clearly defined appearance.

