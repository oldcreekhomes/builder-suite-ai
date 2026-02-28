

# Fix Project Dashboard Header Alignment

## Problem
The Project Dashboard page (`src/pages/ProjectDashboard.tsx`) has its own inline header with `mt-6` (top margin), creating a visible gray gap above the header. The bottom border also doesn't align with the sidebar's "Construction Management" border. Other pages (Settings, Company Dashboard) work correctly because they use the standardized `DashboardHeader` or `CompanyDashboardHeader` components with `py-3.5` and no top margin.

## Solution
Update the Project Dashboard header to match the standardized header styling:

### File: `src/pages/ProjectDashboard.tsx`

1. Remove `mt-6` from the header element
2. Change `py-2` to `py-3.5` to match the standard vertical padding used by `DashboardHeader` and `CompanyDashboardHeader`

The header class will change from:
```
bg-white border-b border-border px-6 py-2 mt-6
```
to:
```
bg-white border-b border-border px-6 py-3.5
```

This single change ensures the header's bottom border aligns exactly with the sidebar's "Construction Management" section border, matching all other pages in the application.

