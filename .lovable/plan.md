

## Standardize Project Dashboard Layout

### Problem
The Project Dashboard has extra spacing and a status badge ("In Design") between the header and the content cards. This pushes the Accounting Alerts and Project Photos cards down, breaking the alignment standard established on the Files page.

### Changes

**File: `src/pages/ProjectDashboard.tsx`**

1. Remove `bg-gray-50` from outer wrapper (match other pages)
2. Change content wrapper from `<div className="flex-1 p-6">` to `<div className="flex-1 px-6 pt-3 pb-6">`
3. Remove the entire status badge block (lines 66-78) -- the "In Design" / "Under Construction" badge and its `mb-6` wrapper
4. Remove `mb-8` from the grid and weather wrappers (use `space-y-6` on parent or keep individual gaps consistent)

### Result
- Content wrapper: `px-6 pt-3 pb-6` (matches Files, Budget, Schedule, etc.)
- Status badge removed -- Accounting Alerts card top border aligns with sidebar dropdown
- No extra vertical gaps pushing content down

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectDashboard.tsx` | Remove `bg-gray-50`, change to `px-6 pt-3 pb-6`, remove status badge block |

