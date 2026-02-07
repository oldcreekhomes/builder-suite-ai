

# Update Smart Gantt Scheduling Hero Copy

## Overview
Update the hero section to have the small label match the menu item name, with the large headline describing the value proposition.

## Changes

| Element | Current | Proposed |
|---------|---------|----------|
| Small Label | "SMART GANTT SCHEDULING" | "SMART GANTT SCHEDULING" (keep as-is) |
| Large Headline | "Your Subs Confirm. You See Colors." | "Scheduling Automation" |

## File Changes

**`src/pages/features/GanttScheduling.tsx`**

- **Line 35-36** - Change large headline:
  - From: `Your Subs Confirm. You See Colors.`
  - To: `Scheduling Automation`

The small label already says "SMART GANTT SCHEDULING" which matches the menu, so only the headline needs to change.

