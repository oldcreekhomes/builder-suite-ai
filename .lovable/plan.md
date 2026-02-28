

## Align File Table Top with Project Selector Dropdown

### Problem
The file table has 16px of top padding (`pt-4`) below the header, pushing it below the horizontal line where the project selector dropdown begins in the sidebar.

### Change

**File: `src/pages/ProjectFiles.tsx` (line 56)**

Change the content wrapper class from `px-6 pt-4 pb-6` to `px-6 pb-6` -- removing the `pt-4` top padding so the table starts immediately below the header's bottom border, aligning horizontally with the top of the sidebar's project selector dropdown.

This is a single-line class change.

