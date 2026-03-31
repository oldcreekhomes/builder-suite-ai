

## Fix Header Spacing in Bid Package Details Modal

### Problem
The 6 columns (Status, Due Date, Reminder, Specifications, Files, Actions) have uneven widths creating an awkward, cramped layout. The left 3 controls are squeezed while Specs/Files have wasted space.

### Solution

**File: `src/components/bidding/BidPackageDetailsModal.tsx` (lines 212-219)**

1. **Make Status, Due Date, Reminder equal width** — all three get `w-36` so the form controls align cleanly.

2. **Merge Specifications and Files into a single "Specs & Files" column** — these are both compact icon-based cells. Combining them into one wider column (no explicit width, just flex to fill remaining space) eliminates the awkward gap and groups related content together. The cell would show the spec icon followed by the file icons inline.

Actually, merging cells requires changing the row components too. Let me propose a simpler approach:

**Simpler approach — just rebalance widths:**

| Column | Current | New |
|--------|---------|-----|
| Status | `w-32` | `w-36` |
| Due Date | `w-36` | `w-36` |
| Reminder | `w-36` | `w-36` |
| Specifications | `w-32 text-center` | `w-24 text-center` |
| Files | `w-40` | `w-auto` (fills remaining) |
| Actions | `w-20 text-center` | `w-16 text-center` |

This makes the left 3 columns equal, shrinks Specifications (it's just a single icon), lets Files expand naturally to use available space, and tightens Actions (just a 3-dot menu).

### Technical Details

Single edit to lines 212-219 of `BidPackageDetailsModal.tsx` — update the 6 `className` width values on the `<TableHead>` elements.

### Files Changed
- `src/components/bidding/BidPackageDetailsModal.tsx` — rebalance header column widths

