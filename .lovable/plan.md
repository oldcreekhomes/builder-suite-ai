

## Standardize All Project Page Headers

### Goal
Make every project-level page use the same page title and subheading pattern as the "Manage Bills" and "Transactions" pages, which the user has identified as the gold standard.

### The Standard (from Manage Bills / Transactions)
```
<div className="mx-auto p-6 w-full">        // or "container mx-auto p-6"
  <div className="mb-6">
    <h1 className="text-2xl font-bold">Page Title</h1>
    <p className="text-muted-foreground">Short description of the page.</p>
  </div>
  {/* Page content */}
</div>
```

### Current State vs Target

| Page | Current | Action needed |
|------|---------|---------------|
| Manage Bills | Has title + subheading | Already correct (reference) |
| Transactions | Has title + subheading | Already correct (reference) |
| Files | No page title at all | Add "Files" + subheading |
| Photos | No page title at all | Add "Photos" + subheading |
| Budget | Uses `text-3xl tracking-tight` inside BudgetPrintToolbar | Change to `text-2xl font-bold` + add subheading |
| Bidding | No page title at all | Add "Bidding" + subheading |
| Purchase Orders | Uses `text-3xl tracking-tight` + stat cards | Change to `text-2xl font-bold`, keep stat cards below |
| Schedule | Uses `text-2xl tracking-tight` + Calendar icon | Change to standard style, remove icon |
| Reports | No page title at all | Add "Reports" + subheading |
| Project Dashboard | Status badge only | Leave as-is (dashboard is a different pattern) |

### Changes by file

**1. `src/pages/ProjectFiles.tsx`**
- Wrap content in standard `p-6` container
- Add title: "Files" / "Manage and organize project documents."

**2. `src/pages/ProjectPhotos.tsx`**
- Add title block: "Photos" / "View and upload project photos."

**3. `src/components/budget/BudgetPrintToolbar.tsx`**
- Change `text-3xl font-bold tracking-tight` to `text-2xl font-bold`
- Add subheading: "Track and manage project budget and costs."

**4. `src/pages/ProjectBidding.tsx`**
- Add title block: "Bidding" / "Manage bid packages and vendor proposals."
- Normalize content padding to `p-6`

**5. `src/pages/ProjectPurchaseOrders.tsx`**
- Change `text-3xl font-bold tracking-tight` to `text-2xl font-bold`
- Keep stat cards, just fix the title styling

**6. `src/pages/ProjectSchedule.tsx`**
- Replace Calendar icon + `text-2xl font-bold tracking-tight` with standard title block
- Title: "Schedule" / "View and manage the project timeline."

**7. `src/pages/Reports.tsx`**
- Add title block: "Reports" / "Generate and view financial reports."

**8. Content padding normalization**
- All pages will use `p-6` (not `p-4 md:p-8 pt-6` or other variants)
- This matches the Manage Bills / Transactions standard

### What will NOT change
- Project Dashboard -- it serves a different purpose (overview cards, weather, photos) and does not need a page title in the same way
- The DashboardHeader component itself -- already fixed in previous work
- Page functionality -- only the title/subheading presentation is being standardized

### Technical notes
- Budget title lives inside `BudgetPrintToolbar.tsx`, not the page file, so that component gets the typography fix
- Purchase Orders has its own inline header in `ProjectPurchaseOrders.tsx` that needs updating
- Schedule has its own inline header that needs replacing
- All other pages just need a new title block added directly in the page file
