

## Add Header Bar Back with Page Title and Remove Duplicate Titles

### What's Changing

The gray border line will be restored at the top of project pages (aligned with the "Construction Management" border in the sidebar), but instead of being empty, it will contain the page title and subtitle -- moving them up from the content area. This eliminates the gap and makes the layout more compact.

### Approach

**1. Update `DashboardHeader.tsx`** -- Add a `subtitle` prop and restore the header bar for project pages:

- Accept a new optional `subtitle` prop
- When `projectId` is set, render a proper `<header>` with `border-b border-border`, `px-6 py-3.5`, and `h-10` inner container (matching the standard header height that aligns with the sidebar)
- Display the `title` as `text-xl font-bold` and `subtitle` as `text-sm text-muted-foreground` inside the header
- Keep the sidebar expand button (ChevronsRight) when collapsed

**2. Update all project pages** -- Remove the duplicate `mb-6` title blocks from the content area and pass `subtitle` to `DashboardHeader`:

Pages to update (each has its own `<h1>` + `<p>` block that becomes redundant):

| Page | Title | Subtitle |
|------|-------|----------|
| ProjectFiles | Files | Manage and organize project documents. |
| ProjectPhotos | Photos | View and upload project photos. |
| ApproveBills | Manage Bills | Review, approve and locate invoices - all in one place. |
| ProjectBidding | Bidding | (check for subtitle) |
| ProjectBudget | Budget | (check for subtitle) |
| WriteChecks | Write Checks | (check for subtitle) |
| Transactions | Transactions | (check for subtitle) |
| ProjectSchedule | Schedule | (check for subtitle) |
| ProjectPurchaseOrders | Purchase Orders | (check for subtitle) |
| TakeoffEditor | Estimate and Takeoff | (check for subtitle) |
| JournalEntry | Journal Entry | (check for subtitle) |
| ProjectDashboard | (no title block -- has status badge instead, no change needed) |

For each page:
- Add `subtitle="..."` to the `DashboardHeader` component
- Remove the `<div className="mb-6">` block containing the `<h1>` and `<p>`

### Result

- Gray border line is back, perfectly aligned with the sidebar's "Construction Management" divider
- Page title and subtitle sit inside that header bar instead of below it
- No duplicate titles -- content starts immediately after the header
- More vertical space for actual content

