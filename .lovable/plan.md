

## Standardize All Remaining Project Pages to Match Files Layout

### Problem
Several project pages still have redundant titles, toolbars between the header and content, and inconsistent spacing. Specifically:

1. **Budget page**: `BudgetPrintToolbar` (expand/collapse, lot selector, add budget, export PDF) renders inside `BudgetTable` below the header, creating a gap before the table.
2. **Purchase Orders page**: Search input + "Create Purchase Order" button render inside `PurchaseOrdersTable`, adding a toolbar row between the header and the table.
3. **Manage Bills page**: The content wrapper `flex flex-1 overflow-hidden` has no `pt-3` padding.
4. **Reports page**: Each report content component (Balance Sheet, Income Statement, Job Costs, Accounts Payable) renders its own large `h2` title (e.g., "Balance Sheet" repeated after the sidebar already shows it) plus an "As of" date picker inside the content area. The titles are redundant; the date pickers and action buttons should be flush toolbar rows, not wrapped in `text-3xl font-bold` headers.

### Changes

**1. Budget -- Move toolbar to header (`ProjectBudget.tsx` + `BudgetTable.tsx` + `BudgetPrintToolbar.tsx`)**
- In `ProjectBudget.tsx`: pass additional toolbar controls (expand/collapse toggle, lot selector, add budget, export PDF) into `DashboardHeader`'s `headerAction` alongside the existing lock button.
- Lift necessary state (selectedLotId, showAddBudgetModal, showExportDialog, allExpanded, isExportingPdf) and handlers out of `BudgetTable` into `ProjectBudget.tsx` via new props or by moving them up.
- Alternative simpler approach: Keep state in `BudgetTable` but extract the toolbar buttons into a render prop or a separate header actions component that `ProjectBudget` places in `headerAction`. The `BudgetPrintToolbar` component would no longer render inside `BudgetTable`'s `space-y-4` -- instead, `BudgetTable` exposes props for its toolbar actions and `ProjectBudget` assembles them in the header.
- Pragmatic approach chosen: Remove `BudgetPrintToolbar` from inside BudgetTable's return, and instead have BudgetTable accept an `renderToolbar` callback or simply expose the toolbar via a ref/context. Simplest: keep the toolbar inside BudgetTable but remove its wrapper `space-y-4` gap by moving it outside the spaced container (similar to Files fix with hidden inputs) -- but this won't achieve the header placement goal.
- **Final approach**: Add a new `toolbarPortal` pattern -- `BudgetTable` renders `BudgetPrintToolbar` content into a slot that `ProjectBudget` places in `DashboardHeader`'s `headerAction`. This requires `BudgetTable` to accept an `onToolbarReady` callback that provides the toolbar JSX. Or, simpler still: move the toolbar state up to `ProjectBudget`, pass needed callbacks down to `BudgetTable`, and render `BudgetPrintToolbar` directly in `ProjectBudget` inside `headerAction`.

**2. Purchase Orders -- Move search + create button to header (`ProjectPurchaseOrders.tsx` + `PurchaseOrdersTable.tsx`)**
- Move the search input and "Create Purchase Order" button from inside `PurchaseOrdersTable` into `DashboardHeader`'s `headerAction` in `ProjectPurchaseOrders.tsx`.
- `PurchaseOrdersTable` will accept `searchQuery` and `onSearchChange` as props instead of managing its own state, and `showCreateModal`/`setShowCreateModal` will also be lifted up or passed down.

**3. Manage Bills -- Add pt-3 (`ApproveBills.tsx`)**
- Change `<div className="flex flex-1 overflow-hidden">` to `<div className="flex flex-1 overflow-hidden pt-3">`.

**4. Reports -- Remove redundant titles, keep date pickers as flush toolbars (`ReportsTabs.tsx` + all 4 content components)**
- In `ReportsTabs.tsx`: change inner padding from `p-6` to `px-6 pt-0 pb-6` (matching BiddingTabs).
- In all 4 content components (`BalanceSheetContent`, `IncomeStatementContent`, `JobCostsContent`, `AccountsPayableContent`):
  - Remove the `<h2 className="text-3xl font-bold tracking-tight">Title</h2>` from the main render and all loading/error states.
  - Keep the "As of" date picker and any action buttons (Export PDF, Lot Selector, Lock) in a `<div className="flex items-center justify-end gap-2">` toolbar row at the top -- no title, just action buttons aligned right.
  - Remove redundant Card titles like `<CardTitle>Income Statement</CardTitle>` and `<CardTitle>Budget vs. Actual</CardTitle>` that repeat what the sidebar already shows.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/ProjectBudget.tsx` | Lift budget toolbar state up, render toolbar buttons in `headerAction` |
| `src/components/budget/BudgetTable.tsx` | Accept toolbar-related props from parent, remove internal `BudgetPrintToolbar` rendering |
| `src/pages/ProjectPurchaseOrders.tsx` | Lift search + create state up, render in `headerAction` |
| `src/components/purchaseOrders/PurchaseOrdersTable.tsx` | Accept `searchQuery`, `onSearchChange` as props, remove internal toolbar |
| `src/pages/ApproveBills.tsx` | Add `pt-3` to content wrapper |
| `src/components/reports/ReportsTabs.tsx` | Change inner content padding to `px-6 pt-0 pb-6` |
| `src/components/reports/BalanceSheetContent.tsx` | Remove h2 title, keep date picker as right-aligned toolbar |
| `src/components/reports/IncomeStatementContent.tsx` | Remove h2 title and CardTitle, keep date picker as right-aligned toolbar |
| `src/components/reports/JobCostsContent.tsx` | Remove h2 title, keep date picker + lot selector + lock + export as right-aligned toolbar |
| `src/components/reports/AccountsPayableContent.tsx` | Remove h2 title, keep date picker + lot selector + export as right-aligned toolbar |

### Outcome
Every project page will have content starting at `pt-3` (12px) below the header border, with action buttons either in the `DashboardHeader`'s `headerAction` slot or in a flush right-aligned toolbar row with no redundant titles -- matching the Files page standard.

