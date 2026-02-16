

## Fix Table Border Rounding and Prevent Future Inconsistencies

### Problem
Two settings tabs have table containers missing `overflow-hidden`, which causes the table header background to clip over the rounded border corners:
- **Chart of Accounts** (`ChartOfAccountsTab.tsx` line 178): uses `border rounded-lg` but no `overflow-hidden`
- **Employees** (`EmployeeTable.tsx` line 178): uses `rounded-md border` -- wrong radius and no `overflow-hidden`

The correct pattern (used by Specifications and Cost Codes) is: `border rounded-lg overflow-hidden`.

### Fixes

**1. `src/components/settings/ChartOfAccountsTab.tsx` (line 178)**
Change:
```
<div className="border rounded-lg">
```
To:
```
<div className="border rounded-lg overflow-hidden">
```

**2. `src/components/employees/EmployeeTable.tsx` (line 178)**
Change:
```
<div className="rounded-md border">
```
To:
```
<div className="border rounded-lg overflow-hidden">
```

### Preventing This From Happening Again

To stop repeating this pattern-matching exercise, a shared wrapper component will be created that every settings table uses. This way the styling is defined once.

**3. Create `src/components/ui/settings-table-wrapper.tsx`**

A small reusable component:
```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function SettingsTableWrapper({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {children}
    </div>
  );
}
```

**4. Update all four table locations to use it:**
- `CostCodesTable.tsx` -- replace `<div className="border rounded-lg overflow-hidden">` with `<SettingsTableWrapper>`
- `SpecificationsTable.tsx` -- same replacement
- `ChartOfAccountsTab.tsx` -- same replacement
- `EmployeeTable.tsx` -- same replacement

This ensures that if the table container style ever needs to change (border color, radius, shadow, etc.), it's updated in one place and applies everywhere.
