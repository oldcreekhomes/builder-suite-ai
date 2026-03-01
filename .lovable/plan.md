

## Move Schedule Toolbar into Header for Brand Consistency

### Problem
The Schedule page has its toolbar buttons (Add, Undo, Copy, Zoom, Publish, etc.) rendered inside the Gantt chart card, below the header. This is inconsistent with other pages (Files, Bidding, Budget) that use the Header Action Bridge pattern to place controls in the DashboardHeader.

### Approach
Apply the same Header Action Bridge pattern used across the app: the Schedule page will manage toolbar state and pass buttons into the `headerAction` slot of `DashboardHeader`. The schedule table and Gantt chart will then start directly at the content area top, aligned with the sidebar tabs and project dropdown.

### Changes

**1. `src/pages/ProjectSchedule.tsx`**
- Add state for `headerAction` (ReactNode).
- Pass `headerAction` to `DashboardHeader` via the `headerAction` prop.
- Pass an `onHeaderActionChange` callback to `CustomGanttChart`.
- Remove `pt-3` from the content wrapper (schedule has no ContentSidebar but should align the table top with the dropdown).

**2. `src/components/schedule/CustomGanttChart.tsx`**
- Accept new prop `onHeaderActionChange?: (action: React.ReactNode | null) => void`.
- Use a `useEffect` to build the toolbar JSX (the same buttons currently in `ScheduleToolbar`) and pass it to `onHeaderActionChange`.
- Call `onHeaderActionChange(null)` on unmount to clean up.
- Remove the inline `<ScheduleToolbar />` render from the return JSX.
- Remove the outer card wrapper (`bg-card rounded-lg border`) so the table starts flush at the top of the content area. Keep `overflow-hidden flex flex-col flex-1`.

**3. `src/components/schedule/ScheduleToolbar.tsx`**
- Update the container from `<div className="flex items-center gap-2 p-3 bg-card border-b">` to `<div className="flex items-center gap-2">` since it now renders inside the header's `h-10` flex row (no padding, no background, no border needed).
- The buttons themselves remain unchanged (`variant="outline" size="sm"`).

### Technical Detail
The header action bridge works by:
1. `CustomGanttChart` renders the toolbar buttons as a ReactNode and calls `onHeaderActionChange(toolbarJSX)`.
2. `ProjectSchedule` stores this in state and passes it as `headerAction` to `DashboardHeader`.
3. `DashboardHeader` renders it in the `ml-auto` right-aligned slot.
4. On unmount, `onHeaderActionChange(null)` clears it.

The "Delete Selected" bulk action button with its AlertDialog will remain in the toolbar and move to the header as well -- it only appears when tasks are selected.

### Result
- Schedule toolbar buttons appear in the header bar, consistent with all other pages.
- The schedule table header row (#, Task Name, Start Date, etc.) and the Gantt timeline align with the project dropdown and sidebar tabs.
- No visual gap between header and content.

