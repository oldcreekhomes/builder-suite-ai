
## Reduce Top Padding on Settings Right Panel

### What Changed Last Time
- Before: `p-6` → top padding = 24px
- After: `p-6 pt-8` → top padding = 32px (added 8px)

### Fix
Change `pt-8` to `pt-7` (28px), which is exactly halfway between the original 24px and the current 32px. This should align the right-side content baseline with the "Settings" title on the left.

### File to Edit
- `src/pages/Settings.tsx` — line with `<div className="flex-1 min-w-0 p-6 pt-8">`
  - Change to: `<div className="flex-1 min-w-0 p-6 pt-7">`
