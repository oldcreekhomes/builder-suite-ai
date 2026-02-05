

# Add Right-Click Color Picker to Gantt Bars

## Overview

Add a simple right-click context menu directly on the Gantt timeline bars that lets users pick from 3 colors: Blue, Green, or Red.

## How It Works

Right-clicking on any task bar (the colored bar on the timeline side) opens a small menu with 3 color options. Selecting a color immediately updates the bar.

## Technical Approach

### File: `src/components/schedule/UnifiedScheduleTable.tsx`

**Change 1** - Wrap the task bar with a ContextMenu (around line 922):

```tsx
// Before:
<div
  className="absolute h-6 rounded cursor-move border"
  style={{...}}
>

// After:
<ContextMenu>
  <ContextMenuTrigger asChild>
    <div
      className="absolute h-6 rounded cursor-move border"
      style={{...}}
    >
      ...
    </div>
  </ContextMenuTrigger>
  <ContextMenuContent className="w-32">
    <ContextMenuItem onClick={() => onTaskUpdate(task.id, { confirmed: null })}>
      <div className="w-3 h-3 rounded bg-blue-500 mr-2" /> Blue
    </ContextMenuItem>
    <ContextMenuItem onClick={() => onTaskUpdate(task.id, { confirmed: true })}>
      <div className="w-3 h-3 rounded bg-green-500 mr-2" /> Green
    </ContextMenuItem>
    <ContextMenuItem onClick={() => onTaskUpdate(task.id, { confirmed: false })}>
      <div className="w-3 h-3 rounded bg-red-500 mr-2" /> Red
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

**Change 2** - Add imports at top of file:

```tsx
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from "@/components/ui/context-menu";
```

## Result

- Users right-click on any Gantt bar → see 3 color swatches (Blue, Green, Red)
- Click a color → bar instantly changes
- No new database columns needed (uses existing `confirmed` field)
- Approximately 15-20 lines of code added

## Trade-off Note

This reuses the `confirmed` field for color, meaning:
- Blue = not yet confirmed (null)
- Green = confirmed (true)
- Red = unconfirmed/declined (false)

This keeps things simple while giving users direct color control.

