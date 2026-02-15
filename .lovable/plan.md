

## Fix Suppliers Sidebar Styling to Match Other Items

### Problem
The "Suppliers" collapsible trigger uses `text-muted-foreground` (gray, lighter color) while all other sidebar items (Budget, Chart of Accounts, etc.) use the default `TabsTrigger` text color (darker foreground). This makes "Suppliers" visually inconsistent -- wrong font color and weight compared to the other items.

### Fix

**File: `src/pages/Settings.tsx` (line 174)**

Change the `CollapsibleTrigger` className to match the exact same styling as the `TabsTrigger` items:

Current:
```
className="flex items-center justify-between w-full px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
```

Updated:
```
className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
```

Key changes:
- `text-muted-foreground` changed to `text-foreground` (matches the default text color of TabsTrigger items)
- Added `font-medium` to match the TabsTrigger font weight
- Changed `hover:text-foreground` to `hover:bg-muted` to match the hover behavior of the other items

This single line change ensures "Suppliers" looks identical to Budget, Chart of Accounts, Company Profile, etc. in both collapsed and expanded states.

