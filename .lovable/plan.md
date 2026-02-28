

## Fix Table Top Alignment -- Reduce Padding

### Problem
With `pt-3` (12px), the table sits too far below the project selector dropdown. With `pt-0` it was slightly too high. The correct offset is in between.

### Analysis
- The right-side DashboardHeader bottom border sits ~6px higher than the sidebar's branding section bottom border (above ProjectSelector)
- The ProjectSelector has `py-3` (12px) top padding before the dropdown button
- So the table needs ~6px top padding to align with the dropdown's top border (12px - 6px offset = 6px)

### Change

**File: `src/pages/ProjectFiles.tsx` (line 56)**

```text
Before: <div className="flex-1 px-6 pt-3 pb-6">
After:  <div className="flex-1 px-6 pt-1.5 pb-6">
```

Change `pt-3` (12px) to `pt-1.5` (6px). This accounts for the height difference between the sidebar branding header and the content-area header, placing the table's top border in line with the dropdown button's top border.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectFiles.tsx` | Change `pt-3` to `pt-1.5` on content wrapper |
