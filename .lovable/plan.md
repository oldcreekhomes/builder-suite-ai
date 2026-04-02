

## Fix: Make "Additional Costs Expected" Badge Single Line

### Problem
The Comment column (`w-48` = 192px) is too narrow for the "Additional Costs Expected" badge text, causing it to wrap to two lines.

### Fix
Adjust column widths — shrink Name and Source columns slightly, widen Comment column, and add `whitespace-nowrap` to the badge.

### Changes

**`src/components/budget/BudgetTableHeader.tsx`**
- Name: `w-[380px]` → `w-[340px]`
- Source: `w-48` → `w-36`
- Comment: `w-48` → `w-56`

**`src/components/budget/BudgetTableRow.tsx`**
- Same width changes on the matching `<TableCell>` elements:
  - Name: `w-[380px]` → `w-[340px]`
  - Source: `w-48` → `w-36`
  - Comment: `w-48` → `w-56`

**`src/components/budget/BudgetCommentBadge.tsx`**
- Add `whitespace-nowrap` to the Badge className in the SelectTrigger so the text never wraps

**Other files with matching column cells** (BudgetGroupHeader, BudgetGroupTotalRow, BudgetProjectTotalRow, HistoricalOnlyRow):
- Update Name and Source cell widths to match

