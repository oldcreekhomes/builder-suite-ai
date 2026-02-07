

# Smart Gantt Scheduling Feature Page

## Overview
Create a new "Smart Gantt Scheduling" feature page focused on automation, subcontractor communication, and color-coded status tracking. Also update the features dropdown menu to rename and reposition this item.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/PublicHeader.tsx` | Modify | Rename "Gantt Scheduling" to "Smart Gantt Scheduling" and move to position 3 |
| `src/pages/features/GanttScheduling.tsx` | Create | New feature page using the Accounting/AI Bill Management template |
| `src/App.tsx` | Modify | Add route for `/features/gantt-scheduling` |

## Menu Restructure

**Current Order:**
1. Accounting
2. AI Bill Management
3. Bid Management
4. Document Management
5. Gantt Scheduling
6. Team Communication

**New Order:**
1. Accounting
2. AI Bill Management
3. Smart Gantt Scheduling (renamed + moved)
4. Bid Management
5. Document Management
6. Team Communication

## Page Structure

```text
+------------------------------------------+
|         PublicHeader (shared)            |
+------------------------------------------+
|                                          |
|    HERO SECTION                          |
|    "SMART GANTT SCHEDULING"              |
|    "Your Subs Confirm. You See Colors."  |
|    + Hero image                          |
+------------------------------------------+
|                                          |
|    FEATURE ROW 1 (bg-muted/30)           |
|    "Automated Email Notifications"       |
+------------------------------------------+
|                                          |
|    FEATURE ROW 2 (bg-background)         |
|    "One-Click Confirmation"              |
+------------------------------------------+
|                                          |
|    FEATURE ROW 3 (bg-muted/30)           |
|    "Color-Coded Status at a Glance"      |
+------------------------------------------+
|                                          |
|    FEATURE ROW 4 (bg-background)         |
|    "Project Manager Efficiency"          |
+------------------------------------------+
|                                          |
|    CTA SECTION                           |
|    "Ready to Automate Your Schedule?"    |
+------------------------------------------+
|         PublicFooter (shared)            |
+------------------------------------------+
```

## Content Details

### Hero Section
- **Label**: "SMART GANTT SCHEDULING"
- **Title**: "Your Subs Confirm. You See Colors."
- **Description**: "Stop chasing subcontractors for schedule confirmations. BuilderSuite automatically emails your subs when they're scheduled, captures their yes/no response, and updates your Gantt chart with color-coded status—so you know exactly who's showing up."
- **Image**: `/images/gantt-schedule-preview.png`

### Feature Row 1 - Automated Email Notifications (Image Left)
- **Label**: "AUTOMATED NOTIFICATIONS"
- **Title**: "Schedule Once, Notify Automatically"
- **Description**: "When you schedule a task, BuilderSuite automatically emails the assigned subcontractor with the date, time, and job details. No more phone calls, no more manual emails, no more wondering if they got the message."

### Feature Row 2 - One-Click Confirmation (Image Right, reversed)
- **Label**: "ONE-CLICK CONFIRMATION"
- **Title**: "Subs Confirm Without Logging In"
- **Description**: "Subcontractors receive a simple email with Yes/No buttons. One click confirms their attendance—no accounts to create, no passwords to remember, no apps to download. Their response instantly updates your schedule."

### Feature Row 3 - Color-Coded Status (Image Left)
- **Label**: "VISUAL STATUS"
- **Title**: "See Who's Confirmed at a Glance"
- **Description**: "Blue means scheduled, Green means confirmed, Red means declined. Project managers can scan the entire Gantt chart in seconds and know exactly which subs are coming and which need follow-up. No more guessing games."

### Feature Row 4 - Project Manager Efficiency (Image Right, reversed)
- **Label**: "PM EFFICIENCY"
- **Title**: "Manage by Exception, Not by Chasing"
- **Description**: "Focus your time on the red tasks that need attention instead of calling every sub to confirm. BuilderSuite handles the routine communication so project managers can solve real problems and keep projects on track."

### CTA Section
- **Title**: "Ready to Automate Your Schedule Coordination?"
- **Description**: "Join builders who have eliminated schedule chaos and know exactly who's showing up—every single day."

## Technical Details

1. **PublicHeader.tsx** - Update `featureMenuItems` array:
   - Change label from "Gantt Scheduling" to "Smart Gantt Scheduling"
   - Reorder to position 3 (index 2)

2. **GanttScheduling.tsx** - New file following established template:
   - Import same components (PublicHeader, PublicFooter, FeatureRow, Dialog, etc.)
   - Use path selection modal pattern
   - Use `gantt-schedule-preview.png` for images

3. **App.tsx** - Add import and route for the new page

