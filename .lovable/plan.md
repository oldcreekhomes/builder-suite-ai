

## Align "Filter by Type" with "Select Project"

### Problem
The "Filter by Type" header in the marketplace category sidebar is shorter than the "Select Project" dropdown area in the main sidebar, causing their bottom borders to misalign.

### Root Cause
- **ProjectSelector**: `px-4 py-3` padding + `h-10` (40px) button = 64px total height
- **Filter by Type**: `p-4` (16px) padding + ~20px text = ~52px total height
- Result: Filter by Type is ~12px shorter

### Fix
**File: `src/components/marketplace/MarketplaceCategorySidebar.tsx`**

Change the Filter by Type header container from `p-4` to `px-4 py-3` and make the inner content `h-10 flex items-center`, exactly mirroring the ProjectSelector's geometry:

```tsx
// Before
<div className="p-4 border-b border-border">
  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">

// After
<div className="px-4 py-3 border-b border-border">
  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 h-10">
```

This gives identical height (64px) to the ProjectSelector, so their bottom borders align perfectly. The text remains vertically centered via `items-center`.

