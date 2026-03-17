

## Plan: Add Subtotals and Grand Total to Import Review Table

### What Changes
In the review table of `BudgetExcelImportDialog.tsx`, group items by their parent code (first digit × 1000, e.g., codes `1010`, `1020` → group `1000`) and insert:

1. **Subtotal rows** after each group — bold, shaded row showing "Subtotal: LAND ACQUISITION COSTS" (or similar) with the sum of amounts in that group
2. **Grand Total row** at the bottom — bold row showing the total of all parsed items

### Implementation Details

**File: `src/components/budget/BudgetExcelImportDialog.tsx`**

1. **Add a parent group label map** (similar to `GROUP_HEADERS`):
   ```ts
   const GROUP_LABELS: Record<string, string> = {
     '1000': 'LAND ACQUISITION COSTS',
     '2000': 'SITE WORK',
     '3000': 'CONSTRUCTION',
     '4000': 'GENERAL & ADMIN',
   };
   ```

2. **Add a `getParentGroup` helper** that derives group from a code:
   ```ts
   const getParentGroup = (code: string) => {
     const base = parseInt(code);
     return String(Math.floor(base / 1000) * 1000);
   };
   ```

3. **Replace the flat `filteredItems.map(...)` render** with a grouped render that:
   - Groups items by parent code
   - After each group's items, renders a subtotal row (bold, `bg-gray-100`, amount column shows sum)
   - After all groups, renders a grand total row (bold, `bg-gray-200`)
   - Subtotal/total rows span the checkbox, code, description, and status columns — only the Amount column shows a value

4. **Subtotal row markup** (inserted after each group's items):
   ```tsx
   <tr className="bg-gray-100 font-semibold border-t">
     <td colSpan={3} className="p-2 text-sm">Subtotal: {groupLabel}</td>
     <td className="p-2 text-right font-mono">${groupTotal}</td>
     <td colSpan={2}></td>
   </tr>
   ```

5. **Grand total row** at the end of `<tbody>`:
   ```tsx
   <tr className="bg-gray-200 font-bold border-t-2">
     <td colSpan={3} className="p-2">Grand Total</td>
     <td className="p-2 text-right font-mono">${grandTotal}</td>
     <td colSpan={2}></td>
   </tr>
   ```

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` — add group labels, helper function, and grouped rendering with subtotal/grand total rows in the review table tbody

