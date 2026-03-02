

## Remove Duplicate Table Borders on Job Costs and Accounts Payable

### Problem
Both the Job Costs and Accounts Payable report pages have a `<Card>` component wrapping the content (which renders an outer border), and then inside `<CardContent>` there's another `<div className="border rounded-lg">` creating a second inner border. This creates a visible "table within a table" effect that doesn't match the rest of the application.

Per the project standard, tables should use a single `border rounded-lg overflow-hidden` container with no Card wrapper.

### Changes

**File: `src/components/reports/JobCostsContent.tsx`**

1. Remove the `<Card>` / `<CardHeader>` / `<CardContent>` wrapper around the main table (lines 713-865).
2. Keep the existing `<div className="border rounded-lg">` (line 790) as the single table container, adding `overflow-hidden` to match the standard.
3. Move the AlertDialog (lock confirmation) outside the removed Card, keeping it at the same level.
4. Also remove the Card wrapper from the loading and fallback (no header bridge) states to stay consistent.

**File: `src/components/reports/AccountsPayableContent.tsx`**

1. Remove the `<Card>` / `<CardHeader>` / `<CardContent>` wrapper around the main content (lines 471-570).
2. Each aging bucket already has its own `<div className="border rounded-lg">` -- these become the direct containers, matching the standard single-border pattern.
3. Also remove Card wrappers from loading/error states.

### Result
Both pages will display a single bordered table that matches the outer edge established by every other page in the application -- no more nested borders.

