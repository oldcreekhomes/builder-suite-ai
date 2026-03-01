

## Fix Gantt Chart Height to Fill Border

### Problem
The schedule container uses a fixed `calc(100vh - 220px)` height that was calibrated when the toolbar was rendered inside the chart. Now that the toolbar has moved to the header, the content is shorter than the bordered container, creating a white gap at the bottom.

### Change

**`src/components/schedule/UnifiedScheduleTable.tsx` (line 512)**
- Change `style={{ height: 'calc(100vh - 220px)' }}` to `className="flex flex-1"` (or `style={{ height: 'calc(100vh - 170px)' }}`).
- The better approach: replace the fixed `calc` with `flex flex-1` so the table naturally fills all available space within its parent flex container, which already uses `flex flex-col flex-1`. This eliminates the magic number entirely and makes the layout resilient to future header changes.
- To make this work, the wrapper div needs `className="flex flex-1 min-h-0"` (the `min-h-0` prevents flex overflow issues).

### Result
The Gantt chart and task table will extend down to meet the bottom border, eliminating the white gap.

