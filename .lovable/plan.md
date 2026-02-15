

## Fix Suppliers Highlight: Match Inactive Tab Style

### Problem
The "Suppliers" collapsible trigger uses `font-medium text-foreground`, making it appear bold and dark at all times. The other sidebar items (`TabsTrigger`) use `text-muted-foreground` by default (lighter, normal weight) and only become highlighted when active. This makes "Suppliers" look permanently selected.

### Fix

**File: `src/pages/Settings.tsx` (line 174)**

Change the `CollapsibleTrigger` className:

From:
```
text-sm font-medium text-foreground
```

To:
```
text-sm text-muted-foreground
```

This removes `font-medium` and switches `text-foreground` to `text-muted-foreground`, matching the default inactive appearance of all other sidebar items.

