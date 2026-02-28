
Goal: move the right/main header border down just a little more so it lines up with the left sidebar border under “Construction Management,” without changing the left sidebar.

What I verified:
- `/settings` uses `DashboardHeader` without `projectId` (`src/pages/Settings.tsx`), so the active header is the default branch in `src/components/DashboardHeader.tsx`.
- The current default header is `px-6 py-3` (after the last change).
- Sidebar branding remains `py-2` in `src/components/sidebar/SidebarBranding.tsx` and should stay untouched per your request.
- The screenshot confirms the main header border is still slightly too high, so the right header needs a small additional downward shift.

Implementation approach:
1. Nudge only the main header down slightly (small increment)
   - File: `src/components/DashboardHeader.tsx`
   - Default header class change:
     - from `py-3`
     - to `py-3.5`
   - Why: this adds a subtle extra 2px top + 2px bottom, moving the bottom border down a little more (a gentle adjustment close to your “about one-third more” estimate).

2. Keep consistency where the same visual header style is used
   - File: `src/components/CompanyDashboardHeader.tsx`
   - Match header from `py-3` to `py-3.5` so company-level screens keep consistent top-row rhythm.
   - No sidebar changes, no margin-top reintroduction.

3. Preserve previous fixes
   - Do not add any `mt-*` on these headers (prevents the gray strip/gap issue from returning).
   - Keep logo/branding changes as-is.

4. Visual verification checklist after implementation
   - On `/settings`, confirm:
     - right header bottom border is aligned with the sidebar border under “Construction Management”
     - no gray strip appears above the main header
     - “Old Creek Homes, LLC” and “New Project” still appear vertically centered and natural
   - If still 1px high after this nudge, final micro-tweak would be `py-[13px]` instead of `py-3.5`.

Technical scope:
- Styling-only Tailwind class updates in 2 files.
- No logic, routing, data, or behavior changes.
