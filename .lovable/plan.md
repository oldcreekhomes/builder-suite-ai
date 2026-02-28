

# Fix Onboarding Checklist: Fixed Height Rows + Step Numbers

## Two Changes

### 1. Fixed row height so left and right columns align perfectly

The issue is that completed rows (with a small green checkmark icon) are shorter than incomplete rows (with a taller "Go" button). This causes the two columns to become misaligned.

**Fix**: Add a fixed height of `h-10` (40px) to each `<li>` element in the `StepItem` component. This ensures every row -- whether completed or not -- is the same height, so Step 1 lines up with Step 5, Step 2 with Step 6, etc.

**File**: `src/components/OnboardingChecklist.tsx` (line 22)

Change:
```tsx
className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${...}`}
```
To:
```tsx
className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors h-10 ${...}`}
```

### 2. Add "Step 1:", "Step 2:", etc. before each label

Pass a `stepNumber` prop into `StepItem` and prepend it to the label text.

**File**: `src/hooks/useOnboardingProgress.ts`
- No changes needed here; numbering will be handled in the component since steps are already in order.

**File**: `src/components/OnboardingChecklist.tsx`
- Update `StepItem` to accept a `stepNumber` prop
- Display it as `"Step {stepNumber}: {step.label}"` in the label span
- When rendering the steps, pass the index-based step number (1-4 for left column, 5-8 for right column)

Updated label rendering:
```tsx
<span className={step.completed ? "line-through opacity-70" : "font-medium"}>
  Step {stepNumber}: {step.label}
</span>
```

Updated rendering in the grid:
```tsx
{leftSteps.map((step, index) => (
  <StepItem key={step.key} step={step} stepNumber={index + 1} navigate={navigate} onAction={handleAction} />
))}
...
{rightSteps.map((step, index) => (
  <StepItem key={step.key} step={step} stepNumber={index + 5} navigate={navigate} onAction={handleAction} />
))}
```

## Result
- All 8 rows will be the same height (40px), keeping left and right columns perfectly aligned
- Each step will read: "Step 1: Verify Email", "Step 2: Confirm Welcome Message", etc.

