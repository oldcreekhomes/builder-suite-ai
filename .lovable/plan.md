

## Standardize All Project Pages to Match Files Layout

### Goal
Make every project page (Budget, Bidding, Purchase Orders, Photos, Schedule) use the same content wrapper spacing as the Files page so the top border of content aligns pixel-perfectly with the sidebar's project selector dropdown.

### Reference Standard (Files Page)
- Content wrapper: `className="flex-1 px-6 pt-3 pb-6"`
- Action buttons live in `DashboardHeader` via `headerAction` prop
- No toolbar between header and table

### Changes Per Page

**1. ProjectBudget.tsx**
- Change `<main className="flex-1 space-y-4 p-4 md:p-6 pt-6">` to `<main className="flex-1 px-6 pt-3 pb-6">`
- Move the Budget toolbar buttons (Expand/Collapse, Lot Selector, Add Budget, Export PDF) into `DashboardHeader`'s `headerAction` prop alongside the existing lock button
- The `BudgetPrintToolbar` component currently renders inside `BudgetTable`. It needs to be lifted out so its buttons render in the header, or the toolbar's wrapper needs its border/margin removed and it renders flush with no extra vertical gap

**2. ProjectBidding.tsx**
- Change `<div className="flex flex-1 overflow-hidden">` wrapper to `<div className="flex flex-1 overflow-hidden px-0 pt-3">` (the inner BiddingTabs already has `p-6` on its content pane; adjust to `px-6 pt-0 pb-6`)
- Since Bidding has a ContentSidebar, the alignment is slightly different -- the `pt-3` goes on the outer flex wrapper so the sidebar and content both start at the right vertical position

**3. ProjectPurchaseOrders.tsx**
- Remove the extra `<div className="flex flex-col min-h-screen">` wrapper
- Change `<main className="flex-1 p-6">` to `<main className="flex-1 px-6 pt-3 pb-6">`
- Remove `bg-muted/40` from the outer div to match other pages
- The search bar and "Create PO" button inside `PurchaseOrdersTable` should be moved to `DashboardHeader`'s `headerAction` prop. The search input and create button will render in the header bar, keeping the table flush against the top

**4. ProjectPhotos.tsx**
- Change `<div className="flex-1 p-6 space-y-6">` to `<div className="flex-1 px-6 pt-3 pb-6 space-y-6">`

**5. ProjectSchedule.tsx**
- Change `<div className="flex-1 flex flex-col p-6 overflow-hidden">` to `<div className="flex-1 flex flex-col px-6 pt-3 pb-6 overflow-hidden">`

### Search/Toolbar Strategy
For pages with search bars or toolbars above the table (Budget, Bidding, Purchase Orders):
- Move action buttons (Add, Export, Expand/Collapse, Lot Selector, Create PO) into `DashboardHeader`'s `headerAction` slot
- Keep search inputs inside the table component but remove extra top margins/borders from toolbar wrappers so the table border starts immediately
- For `BudgetPrintToolbar` and `ActualPrintToolbar`: remove the `border-b pb-4 mb-4` wrapper styling and the title text, keeping only the button row with `justify-end`
- For `PurchaseOrdersTable`: move the search + create button bar into `headerAction`, or remove its top spacing so the table border is flush

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProjectBudget.tsx` | Change main wrapper to `px-6 pt-3 pb-6`, move budget action buttons to headerAction |
| `src/pages/ProjectBidding.tsx` | Add `pt-3` to content area |
| `src/pages/ProjectPurchaseOrders.tsx` | Change main to `px-6 pt-3 pb-6`, remove extra wrapper, remove bg-muted |
| `src/pages/ProjectPhotos.tsx` | Change to `px-6 pt-3 pb-6` |
| `src/pages/ProjectSchedule.tsx` | Change to `px-6 pt-3 pb-6` |
| `src/components/budget/BudgetPrintToolbar.tsx` | Remove border-b/title styling if buttons move to header |
| `src/components/budget/ActualPrintToolbar.tsx` | Remove border-b/title styling |
| `src/components/purchaseOrders/PurchaseOrdersTable.tsx` | Adjust toolbar spacing |
| `src/components/bidding/BiddingTabs.tsx` | Adjust inner padding from `p-6` to `pt-0 px-6 pb-6` |

