

## Fix Sidebar Branding + Header Alignment Issues

### 1. Fix logo text in SidebarBranding (`src/components/sidebar/SidebarBranding.tsx`)
- Replace `BuilderSuite<sub className="...border border-current rounded-full...">ML</sub>` with plain `BuilderSuiteML` text (no circle/border around ML, capitalized ML)
- This aligns with the standardized branding used elsewhere

### 2. Remove the gray line (top margin gap) above the main header
- The `DashboardHeader` default return has `mt-4` on the `<header>` element (line 108), which creates a visible gap/line at the top of the main content area
- The `CompanyDashboardHeader` also has `mt-4` (line 45)
- Change `mt-4` to `mt-0` in both `DashboardHeader.tsx` (line 108) and `CompanyDashboardHeader.tsx` (line 45)
- This removes the gray strip above the company name / "New Project" button area

### 3. Align the sidebar bottom border with the main header bottom border
- The sidebar branding section (`SidebarHeader`) uses `py-2` padding, while the main header also uses `py-2` but with `mt-4` pushing it down
- Once `mt-4` is removed (step 2), the borders should align naturally since both use the same vertical padding
- If further fine-tuning is needed, the `SidebarHeader` padding can be adjusted to match the exact height of the main header

### Files to modify
- `src/components/sidebar/SidebarBranding.tsx` -- fix logo text
- `src/components/DashboardHeader.tsx` -- remove `mt-4` from default header (line 108)
- `src/components/CompanyDashboardHeader.tsx` -- remove `mt-4` (line 45)

