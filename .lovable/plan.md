
# Fix Plan: Standardize Actions Column and Button Styling

## Summary of Issues

Based on my analysis of all three tables:

1. **Companies tab**: Actions header is `text-right` but buttons are left-aligned (not centered)
2. **Representatives tab**: Edit button uses default styling (no color class)
3. **Marketplace Representatives tab**: Edit button has `text-gray-600 hover:text-gray-800` making it explicitly gray

## Changes Required

### File 1: `src/components/companies/CompaniesTable.tsx`

#### Change A: Center Actions header (line 228)
**Current:** `text-right`
**Change to:** `text-center`

#### Change B: Center action buttons (line 304)
**Current:**
```tsx
<div className="flex items-center space-x-1">
```
**Change to:**
```tsx
<div className="flex justify-center items-center space-x-1">
```

Note: Companies uses an Archive icon (orange) intentionally because it archives companies rather than permanently deleting them. This is different functionality from the Delete button used in Representatives/Marketplace. If you want me to change this to a Trash icon, please confirm.

---

### File 2: `src/components/representatives/RepresentativesTable.tsx`

#### Change: Remove any graying on Edit button
The current Edit button (lines 403-410) has no explicit color class, which is correct. No changes needed here - it already matches Companies.

---

### File 3: `src/components/marketplace/MarketplaceRepresentativesTable.tsx`

#### Change: Remove gray color from Edit button (line 161)
**Current:**
```tsx
className="h-6 w-6 p-0 text-gray-600 hover:text-gray-800"
```
**Change to:**
```tsx
className="h-6 w-6 p-0"
```

This removes the explicit gray coloring so it matches the Companies and Representatives Edit buttons.

---

## Summary

| File | Changes |
|------|---------|
| CompaniesTable.tsx | Center Actions header (`text-center`); center buttons container (`justify-center`) |
| RepresentativesTable.tsx | No changes needed - Edit button already matches |
| MarketplaceRepresentativesTable.tsx | Remove `text-gray-600 hover:text-gray-800` from Edit button |

## Result After Implementation

1. All three tables will have Edit/Delete buttons centered under the Actions header
2. All Edit buttons will have the same default darker color (no gray styling)
3. Companies will keep the Archive icon (orange) since it archives rather than deletes - let me know if you want this changed to Trash2
