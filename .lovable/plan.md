Remove the redundant "Software Issues" heading and gray divider from the Issues page left sidebar, and move the category list (starting with Accounting) up to the top of that sidebar.

## Changes
- File: `src/pages/Issues.tsx`
- Remove the title section containing the `<h1>Software Issues</h1>` heading.
- Remove the `<div className="border-b border-border mt-0 mb-4" />` horizontal separator.
- Add `pt-3` top padding to the flex-1 container so the category list sits cleanly at the top of the sidebar without crowding the edge.