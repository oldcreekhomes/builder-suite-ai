

## Plan: Fix LotSelector Width to Match Other Buttons

### Problem
The LotSelector has a fixed `w-[120px]` width, which is too wide for short values like "Lot 1". This creates excessive internal padding / gap between the text and the dropdown arrow, making it look inconsistent with the adjacent buttons.

### Fix
**File: `src/components/budget/LotSelector.tsx`** (line 49)

Change the SelectTrigger from a fixed width to auto-fitting:
```
w-[120px] → w-auto min-w-[80px]
```

This lets the trigger shrink to fit short lot names like "Lot 1" while maintaining a reasonable minimum, matching the compact feel of the other `size="sm"` buttons in the toolbar.

### Files to Edit
- `src/components/budget/LotSelector.tsx` — line 49, update className on SelectTrigger

