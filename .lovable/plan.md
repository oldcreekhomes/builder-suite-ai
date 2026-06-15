Fix the Bid Package header spacing (Status / Due Date / Reminder / Specs / Files / Actions) so the fields don't leave large empty gaps on the right.

Problem
--------
In `src/components/bidding/BidPackageDetailsModal.tsx` line 209 the header uses `grid grid-cols-6 gap-4 items-end`. This forces six equal columns, but Specs, Files, and Actions contain narrow controls (icon, small button, `...` menu). The result is a wide empty gutter on the far right of the Actions column.

Fix
----
Replace `grid grid-cols-6` with a flex-based layout that sizes each column to its content and lets the first three fields (Status, Due Date, Reminder) expand to fill the available width. This keeps the row visually balanced with no orphaned space on the right.

Specific change:
- Line 209 className: swap `grid grid-cols-6 gap-4 items-end` for `flex flex-wrap gap-4 items-end`
- Each of the six child `<div>` wrappers gets `className="flex-1 min-w-0"` so they share space proportionally and wrap naturally on narrow viewports

No other logic changes.