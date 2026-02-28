

## Clean Up Header: Move Collapse Button and Fix Font Size

### Problem
1. The SidebarTrigger (hamburger collapse button) sitting in the header bar next to the page title looks out of place
2. The company name ("Old Creek Homes LLC") displayed in the header on pages like Company Dashboard uses `text-2xl font-bold`, which is larger than the sidebar's "BuilderSuiteML" branding (`text-xl font-bold`), creating a visual mismatch

### Changes

**1. Move SidebarTrigger from header into the sidebar branding area**
- File: `src/components/sidebar/SidebarBranding.tsx`
- Add a small chevron-left icon button (`ChevronsLeft`) in the top-right corner of the branding section
- When sidebar is collapsed, the mini strip shows a `ChevronsRight` button to expand
- Uses the existing `useSidebar()` hook's `toggleSidebar` method

**2. Remove SidebarTrigger from CompanyDashboardHeader**
- File: `src/components/CompanyDashboardHeader.tsx`
- Remove the `SidebarTrigger` import and the trigger button from the header
- The header becomes cleaner: just the page title on the left, "New Project" button on the right

**3. Remove SidebarTrigger from DashboardHeader (project-level)**
- File: `src/components/DashboardHeader.tsx`
- Same treatment: remove the trigger from the project-level header for consistency

**4. Match company name font to BuilderSuiteML**
- File: `src/components/CompanyDashboardHeader.tsx`
- Change the title from `text-2xl font-bold` to `text-xl font-bold` to match the sidebar branding font size
- This applies to all pages using CompanyDashboardHeader (Company Dashboard, Marketplace, Settings, etc.)

### Result
- Header bar is cleaner with no hamburger button
- Sidebar has its own collapse/expand chevron in the branding area (familiar Notion/Linear pattern)
- Company name font matches BuilderSuiteML exactly
