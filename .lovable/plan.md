

## Align Main Header Border with Sidebar Border

### Problem
On the `/settings` page (and other project-specific pages), the header uses `py-4 mt-1` which makes it taller than the sidebar branding section (`py-2`), causing the bottom borders to be misaligned.

### Fix

**`src/components/DashboardHeader.tsx` (line 56)**
- Change `py-4 mt-1` to `py-2` on the project-specific header (the one showing "Back to [address]" + company name)
- This matches the sidebar's `py-2` padding and removes the top gap (`mt-1`)

This single change aligns the bottom border of the main header with the bottom border of the sidebar's "Construction Management" section.

