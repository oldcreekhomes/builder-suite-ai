

## Align Table Top Border with Project Selector Dropdown

### Problem
The file table's top border sits slightly higher than the project selector dropdown's top border in the sidebar. They need to be at exactly the same vertical position.

### Root Cause
The sidebar's ProjectSelector wrapper has `py-3` (12px top padding) before the dropdown button, while the content area has zero top padding after the header. This means the table starts ~12px higher than the dropdown.

### Change

**File: `src/pages/ProjectFiles.tsx`**

Add `pt-3` (12px) top padding to the content wrapper, matching the ProjectSelector's `py-3` top padding exactly:

```text
Before: <div className="flex-1 px-6 pb-6">
After:  <div className="flex-1 px-6 pt-3 pb-6">
```

This ensures the table's top border aligns pixel-perfectly with the project selector dropdown's top border, since both will have identical 12px spacing below their respective dividers (header border-b and sidebar branding border-b).

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectFiles.tsx` | Add `pt-3` to content wrapper |

