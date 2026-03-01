

## Add Border Back to Schedule Component

### Problem
When moving the toolbar into the header, the outer card border (`rounded-lg border`) was removed from the Gantt chart container. This makes the schedule look inconsistent with other pages that have bordered content areas.

### Change

**`src/components/schedule/CustomGanttChart.tsx` (line 673)**
- Change `className="overflow-hidden flex flex-col flex-1"` to `className="overflow-hidden flex flex-col flex-1 rounded-lg border"` to restore the border around the schedule table and Gantt chart.

### Result
The schedule component will have a uniform border matching all other pages in the app.

