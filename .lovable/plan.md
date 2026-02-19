
## Fix: Equal Column Spacing for Bidding Table

### The Problem

Looking at the screenshot, the issue is that the **Files** column has no explicit width (`<TableHead>Files</TableHead>`) so it expands to fill all remaining space. This pushes **Actions** to the far right and makes the entire layout look unbalanced — most of the visible row is dead whitespace inside the Files column.

The current widths are:
- Checkbox: `w-10` (40px)
- Cost Code: `w-56` (224px)
- Status: `w-28` (112px)
- Sent On: `w-28` (112px)
- Due Date: `w-28` (112px)
- Reminder Date: `w-28` (112px)
- Specifications: `w-24` (96px)
- **Files: (no width — grows to fill everything)**
- Actions: `w-20` (80px)

### The Fix

Switch to a consistent, equal-feeling column distribution. Since there are 9 columns total (including checkbox), the strategy is:

1. **Remove all hard widths** and use `w-1/12` or percentage-based widths consistently, OR
2. **Give Files a fixed width** (e.g., `w-36`) so it doesn't expand, and let the table auto-layout distribute naturally.

The cleanest approach: give every content column the **same width** (`w-32` = 128px each), keep the checkbox narrow (`w-10`), and give Files and Actions fixed widths too. This makes all data columns visually equal.

Proposed column widths:

| Column | New Width | Notes |
|---|---|---|
| Checkbox | `w-10` | Keep as is |
| Cost Code | `w-40` | Slightly wider for "4430 - Roofing" text |
| Status | `w-32` | Equal |
| Sent On | `w-32` | Equal |
| Due Date | `w-32` | Equal |
| Reminder Date | `w-32` | Equal |
| Specifications | `w-32` | Equal |
| Files | `w-40` | Slightly wider for icon + "Add Files" button |
| Actions | `w-16 text-center` | Narrow — just the `...` button |

This gives a total of: 40 + 160 + 128 + 128 + 128 + 128 + 128 + 160 + 64 = ~1064px, which fits most screens and distributes evenly with no "empty ocean" in the middle.

### Files to Change

Two files only:

1. **`src/components/bidding/BiddingTableHeader.tsx`** — Update all `TableHead` widths.
2. **`src/components/bidding/components/BiddingTableRowContent.tsx`** — Update all `TableCell` widths to match the header. Also update the `cellClassName` prop passed to `BiddingTableRowSpecs`.

The sub-components (`BiddingTableRowSpecs`, `BiddingTableRowFiles`, `BiddingTableRowActions`) already accept a `cellClassName` prop so their `TableCell` widths can be updated from the parent.
