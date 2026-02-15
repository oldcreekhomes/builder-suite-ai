

## Fix Suppliers Font to Match Other Sidebar Items

### Root Cause
The `TabsTrigger` component has built-in base styles including `font-medium` and `hover:text-foreground hover:bg-muted/50` (defined in `tabs.tsx` line 31). The `CollapsibleTrigger` for "Suppliers" is a plain button that doesn't inherit any of these -- it's missing `font-medium` and uses different hover behavior.

### Fix

**File: `src/pages/Settings.tsx` (line 174)**

Update the `CollapsibleTrigger` className to include `font-medium` and match the exact hover/transition styles from `TabsTrigger`:

```
Current:  text-sm text-muted-foreground hover:bg-muted
Updated:  text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50
```

This adds `font-medium` (matching TabsTrigger's base weight) and changes hover to `hover:text-foreground hover:bg-muted/50` (matching TabsTrigger's exact hover behavior).

