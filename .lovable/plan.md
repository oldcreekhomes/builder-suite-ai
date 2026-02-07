
## Summary
Update two stat labels in "The BuilderSuite Difference" section on the About Us page.

## Changes

### 1. Update "Projects Managed" Label
- **Location**: Line 334
- **Current**: "Projects Managed"
- **New**: "Lots Managed"

### 2. Update "In Budgets Tracked" Label  
- **Location**: Line 338
- **Current**: "In Budgets Tracked"
- **New**: "In the Pipeline"

## Technical Details

**File**: `src/pages/AboutUs.tsx`

The stats row (lines 323-340) will be updated:

```tsx
// Before
<p className="text-muted-foreground">Projects Managed</p>
<p className="text-muted-foreground">In Budgets Tracked</p>

// After
<p className="text-muted-foreground">Lots Managed</p>
<p className="text-muted-foreground">In the Pipeline</p>
```

The "$100M+" value stays the same, only the label beneath it changes.
