

## Remove Project Address from Header and Streamline Layout

### What Changes

The project address currently displayed in the `DashboardHeader` (e.g., "1 East Custis Avenue, Alexandria, VA") is already shown in the sidebar's ProjectSelector dropdown. Displaying it again in the header is redundant and wastes vertical space.

### Approach

**File: `src/components/DashboardHeader.tsx`**

Simplify the project-specific header (the `if (projectId)` block):

- Remove the project address text and the edit (three-dot) button from the header
- Keep the header bar itself as a thin strip with only the sidebar expand button (for when the sidebar is collapsed)
- Remove the `useProject` hook call since we no longer need to fetch/display project data in the header
- Remove the `EditProjectDialog` and related state from this component
- Clean up unused imports (`MoreHorizontal`, `useProject`, `EditProjectDialog`, etc.)

The header becomes a minimal bar:
```text
[Expand sidebar button (only when collapsed)] | (empty/clean space)
```

This saves roughly 50px of vertical space on every project sub-page and eliminates the redundant address display. The page-level headings ("Files", "Photos", "Approve Bills", etc.) that already exist below the header will naturally move up closer to the top of the viewport.

### Pages Affected

All ~15 project sub-pages that pass `projectId` to `DashboardHeader` will automatically benefit since they all use the same component:
- ProjectDashboard, ProjectFiles, ProjectPhotos, ProjectSchedule
- Accounting, ApproveBills, Transactions, WriteChecks, MakeDeposits
- ProjectPurchaseOrders, BankReconciliation, IncomeStatement
- TakeoffEditor, JournalEntry

No changes needed to these individual page files -- they already have their own page titles.

### Technical Details

- The `useProject` hook import and usage will be removed from the header
- The `EditProjectDialog` can still be accessed from the ProjectPage overview card (which has its own edit button)
- The `projectId` prop remains accepted so the header knows it's in "project mode" (minimal bar) vs "company mode" (shows company name + New Project button)
