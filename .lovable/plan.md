

## Fix Budget Checkbox Behavior and Alignment

### Issue 1: Child checkbox selection should not affect parent checkbox
Currently, when a child item (e.g., 1030) is checked, the parent group header (1000) shows an indeterminate checkbox state via `isGroupPartiallySelected`. The user wants: selecting individual children should NOT visually affect the parent group checkbox. The parent checkbox should only change when directly clicked.

**Fix in `BudgetGroupHeader.tsx`**: Change the checkbox to only reflect `isSelected` (all selected via parent click), not `isPartiallySelected`. Remove the indeterminate state:
```typescript
// Before
checked={isSelected ? true : isPartiallySelected ? 'indeterminate' : false}

// After  
checked={isSelected}
```

### Issue 2: Parent checkbox misaligned with children
The parent group header cell uses `px-3` (12px padding) and puts the checkbox + chevron together. The child row cell uses default padding. This shifts the parent checkbox to the right.

**Fix in `BudgetGroupHeader.tsx`**: Move the chevron out of the checkbox cell into the Cost Code cell, and match the child's padding so both checkboxes align vertically.

- First cell (checkbox only): match child's `w-12 py-1` styling
- Move the expand/collapse chevron button into the Cost Code cell (before the group code text)

**Files to change**: `src/components/budget/BudgetGroupHeader.tsx` only.

