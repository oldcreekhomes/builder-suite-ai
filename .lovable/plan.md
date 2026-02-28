
Goal: make the right-side main header border sit slightly lower so it aligns with the left sidebar border under “Construction Management,” without changing the sidebar.

What I found:
- On `/settings`, the app uses the default header in `src/components/DashboardHeader.tsx` (not the project-specific branch).
- That default header is currently `py-2`, which makes it shorter than the sidebar branding block (logo + subtitle), so the right border appears too high.
- Sidebar branding is already correct and should stay unchanged.

Implementation plan:
1. Adjust only the right/main header vertical height (no sidebar edits)
   - File: `src/components/DashboardHeader.tsx`
   - In the default (non-`projectId`) header, increase vertical padding from `py-2` to a slightly larger value (target: `py-3` or `py-3.5`) so the bottom border moves down to align with the sidebar border.

2. Keep related top-gap fixes intact
   - Do not reintroduce `mt-*` top margin (that previously caused the gray strip issue).
   - Only change vertical height via padding so alignment improves without adding a top gap.

3. Apply the same vertical rhythm to the company dashboard header for consistency
   - File: `src/components/CompanyDashboardHeader.tsx`
   - Match its header padding to the same value used in `DashboardHeader` so non-project pages remain visually consistent across screens.

4. Verification checks (visual)
   - Confirm on `/settings` that:
     - The right header border lines up with the left sidebar border below “Construction Management.”
     - No gray strip appears above the main header.
     - The “Old Creek Homes, LLC” row and “New Project” button remain vertically centered and look natural.

Technical note:
- This is a style-only adjustment (Tailwind classes), no logic changes.
- If the first pass (`py-3`) is still off by a few pixels, the follow-up tweak is to use `py-3.5` for exact visual alignment.
