

## Fix Broken Edit Bill Dialog Grid Layout

### Problem
The previous change introduced `grid-cols-23` and `grid-cols-19` which are **not defined in the Tailwind config** (only `grid-cols-20` and `grid-cols-24` exist as custom values). This broke the entire grid layout, causing fields to stack vertically.

### Fix

**`src/components/bills/EditBillDialog.tsx`**

1. **Job Cost section** (lines 826, 838): Revert back to `grid-cols-20` / `grid-cols-24` always (no conditional based on `isApprovedBill`). Keep the `!isApprovedBill` conditional on the Action header/cells, and give the extra 1 col-span to Purchase Order when Action is hidden (e.g., `col-span-4` instead of `col-span-3` for non-address layout, `col-span-5` instead of `col-span-4` for address layout).

2. **Expense section** (lines 987, 998): Revert back to `grid-cols-12` always. When Action is hidden, give the extra col-span to Memo (col-span-5 instead of col-span-4).

This keeps the Action column hidden for approved bills while using only valid Tailwind grid classes.

### Files
- `src/components/bills/EditBillDialog.tsx`

