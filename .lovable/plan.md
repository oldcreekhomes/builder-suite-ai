## Problem
On the Issues page, the horizontal gray divider below "Software Issues" and above "Accounting" sits too low. The `mt-[21px]` on the divider pushes it well below the heading, making it visually misaligned with the Menus/Messages tabs in the left sidebar.

## Solution
In `src/pages/Issues.tsx`, reduce the top margin on the divider so it sits just below the "Software Issues" heading, aligning its top edge with the top of the Menus/Messages tab row in `AppSidebar`.

### Change
```
// BEFORE
<div className="border-b border-border mt-[21px] mb-4" />

// AFTER
<div className="border-b border-border mt-0 mb-4" />
```

Optionally adjust the title container padding from `p-4 pb-0` to `px-4 pt-3 pb-0` if needed for fine-tuning, but the primary fix is removing the `mt-[21px]`.