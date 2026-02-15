

## Replace All Table Row Actions with shadcn Dropdown Menu Pattern

### Problem

Every table in the app handles row actions differently:
- **Cost Codes**: Separate Edit and Trash buttons
- **Specifications**: Just a Trash button
- **Chart of Accounts**: Edit button with tooltip + DeleteButton component
- **Purchase Orders**: 4 icon buttons in a row (Send, Test, Edit, Delete)
- **Bidding**: 4 icon buttons with tooltips (Send, Test, Add, Delete)
- **Issues**: Just a Resolve button

The shadcn table example uses a single `...` button (MoreHorizontal) that opens a dropdown menu with all actions listed as text items. Delete is styled in red. This is clean, consistent, and saves horizontal space.

### Solution

Replace all the separate action buttons/icons in every table row with a single `...` dropdown menu. Each dropdown will contain the relevant actions for that table as text menu items (not icons). Delete items will be red and separated by a divider, matching the shadcn example exactly.

### What the dropdown looks like

```text
  ...
  +------------+
  | Edit       |
  | Send       |
  |------------|
  | Delete     |   <-- red text, separated by divider
  +------------+
```

### Step 1: Create a reusable TableRowActions component

Create `src/components/ui/table-row-actions.tsx` -- a small wrapper that renders the `...` button and a `DropdownMenu`. It accepts an array of action items so each table can pass its own set of actions.

```text
interface TableAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';  // destructive = red text
  requiresConfirmation?: boolean;       // shows confirmation dialog
  confirmTitle?: string;
  confirmDescription?: string;
  disabled?: boolean;
  isLoading?: boolean;
}
```

### Step 2: Update each table to use the dropdown

| File | Current Actions | Dropdown Items |
|------|----------------|----------------|
| `CostCodeTableRow.tsx` | Edit + Delete buttons | Edit, Delete |
| `CostCodeGroupRow.tsx` | Edit + Delete buttons | Edit, Delete |
| `SpecificationTableRow.tsx` | Delete button | Delete |
| `SpecificationGroupRow.tsx` | Delete button | Delete |
| `ChartOfAccountsTab.tsx` | Edit + Delete buttons | Edit, Delete |
| `PurchaseOrdersTableRowActions.tsx` | Send + Test + Edit + Delete | Send PO, Test Email, Edit, Cancel PO |
| `BiddingTableRowActions.tsx` | Send + Test + Add + Delete | Send Bid Package, Test Email, Add Companies, Delete |
| `IssuesTableRow.tsx` | Resolve button | Resolve |
| `BudgetCostCodeRow.tsx` | Any action buttons | (same actions as dropdown items) |
| `AccountantJobsTable.tsx` | Any action buttons | (same actions as dropdown items) |
| `MarketplaceCompaniesTable.tsx` | Any action buttons | (same actions as dropdown items) |
| `EmployeeTable.tsx` | Any action buttons | (same actions as dropdown items) |

### Step 3: Handle confirmation dialogs

For destructive actions (Delete, Cancel PO, Resolve), the dropdown item click will trigger a confirmation dialog -- same behavior as the current `DeleteButton` and `ResolveButton` components, just triggered from a menu item instead of a standalone button.

### What stays the same

- All functionality -- same callbacks, same confirmation dialogs
- The Actions column header stays
- Column widths adjust naturally since the `...` button takes less space

### Files to create

| File | Purpose |
|------|---------|
| `src/components/ui/table-row-actions.tsx` | Reusable `...` dropdown component |

### Files to modify

| File | Change |
|------|--------|
| `src/components/settings/CostCodeTableRow.tsx` | Replace Edit + Delete buttons with dropdown |
| `src/components/settings/CostCodeGroupRow.tsx` | Replace Edit + Delete buttons with dropdown |
| `src/components/settings/SpecificationTableRow.tsx` | Replace Delete button with dropdown |
| `src/components/settings/SpecificationGroupRow.tsx` | Replace Delete button with dropdown |
| `src/components/settings/ChartOfAccountsTab.tsx` | Replace Edit + Delete with dropdown |
| `src/components/purchaseOrders/components/PurchaseOrdersTableRowActions.tsx` | Replace 4 buttons with dropdown |
| `src/components/bidding/components/BiddingTableRowActions.tsx` | Replace 4 buttons with dropdown |
| `src/components/issues/IssuesTableRow.tsx` | Replace Resolve button with dropdown |
| Any other table rows with inline action buttons | Same treatment |

### Result

Every table in the app will have a clean `...` button on the right side of each row. Clicking it opens a dropdown with the available actions. Destructive actions appear in red below a separator. Consistent, clean, and matching the shadcn example exactly.

