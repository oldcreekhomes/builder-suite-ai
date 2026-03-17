

## Plan: Fix Checkbox to Match shadcn Defaults & Center in Row

### Problem
The checkbox component has custom overrides (`border-2`, extra `ring-1 ring-primary` on checked, `stroke-[3]` on icon) making it visually larger than the shadcn default. It also sits too high in table rows because the `TableCell` only has `text-center` (horizontal) but no vertical centering.

### Changes

**1. `src/components/ui/checkbox.tsx` — Revert to shadcn defaults**
- Change `border-2 border-input` → `border border-primary` 
- Remove `data-[state=checked]:ring-1 data-[state=checked]:ring-primary`
- Remove `data-[state=checked]:border-primary` (already primary border by default)
- Add `shadow-xs` (shadcn default)
- Change icon from `h-3.5 w-3.5 stroke-[3]` → `h-3.5 w-3.5` (remove thick stroke)

**2. `src/components/budget/BudgetExcelImportDialog.tsx` — Center checkbox vertically**
- Change the checkbox `TableCell` from `className="text-center"` to `className="text-center align-middle"` so the checkbox is vertically centered in the row.

### Files to Edit
- `src/components/ui/checkbox.tsx`
- `src/components/budget/BudgetExcelImportDialog.tsx`

