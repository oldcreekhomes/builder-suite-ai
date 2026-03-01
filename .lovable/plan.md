
## Fix Bidding Page Sidebar Alignment

### Problem
The "Bid Status" sidebar header is pushed down and misaligned with the "Menus" and "Messages" tabs. This is the same issue that was previously fixed on the Manage Bills page.

### Change

**`src/pages/ProjectBidding.tsx` (line 56)**
- Remove `pt-3` from the content wrapper: change `className="flex flex-1 overflow-hidden pt-3"` to `className="flex flex-1 overflow-hidden"`
- The ContentSidebar already has internal padding (`px-4 py-3`), so the extra top padding is unnecessary and causes the misalignment with the main sidebar tabs.

### Result
- "Bid Status" sidebar header bottom border aligns horizontally with the "Menus" and "Messages" tabs.
- The vertical border on the ContentSidebar extends fully without gaps.
- Content area top aligns with the project dropdown.
