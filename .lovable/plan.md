

## Add Expand Button When Sidebar Is Collapsed

### Problem
When the sidebar is collapsed (offcanvas mode), it fully disappears and the chevron button inside it is gone too -- leaving no way to bring the sidebar back.

### Solution
Add a small expand trigger button to the header bars that only appears when the sidebar is collapsed. This keeps the header clean when the sidebar is open, but provides a way to restore it.

### Changes

**File: `src/components/CompanyDashboardHeader.tsx`**
- Import `useSidebar` from the sidebar component and `ChevronsRight` from lucide
- Before the `h1` title, add a `Button` (ghost, icon size) that calls `toggleSidebar`
- Only render this button when `state === "collapsed"`
- Uses `ChevronsRight` icon to indicate "expand sidebar"

**File: `src/components/DashboardHeader.tsx`**
- Same treatment: import `useSidebar` and `ChevronsRight`
- Add the conditional expand button before the existing content in the header's left section
- Only visible when sidebar is collapsed

### Result
- When sidebar is open: headers look exactly as they do now (no extra button)
- When sidebar is collapsed: a small chevron-right icon appears at the left edge of the header, letting the user re-expand the sidebar
- Consistent across both company-level and project-level pages

