
# Allow Dismissing the "Add Your Companies" Template Dialog

## Problem
The "Add Your Companies" template dialog cannot be closed. The `onOpenChange` prop is hardcoded to `() => {}` (a no-op function), which blocks the user from clicking outside, pressing Escape, or using the X button to dismiss it. This traps users on the screen.

## Fix

**File: `src/components/settings/CompaniesTab.tsx`** (line 81)

Change the `onOpenChange` handler from `() => {}` to `(open) => { if (!open) setTemplateDismissed(true); }`. This allows the user to close the dialog by clicking outside, pressing Escape, or the X button. Setting `templateDismissed = true` prevents it from immediately reopening (since `companyCount` is still 0).

Current:
```tsx
onOpenChange={() => {}}
```

Updated:
```tsx
onOpenChange={(open) => { if (!open) setTemplateDismissed(true); }}
```

## Representatives Check
The Representatives tab (`RepresentativesTab.tsx`) does **not** have a similar template dialog, so no change is needed there. Representatives simply shows an empty table with a message "No representatives found."

## Scope
- Single line change in `src/components/settings/CompaniesTab.tsx`
