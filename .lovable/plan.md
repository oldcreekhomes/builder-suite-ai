

## Standardize All Tables Across the Application

### Goal

Make every table in the app -- Budget, Specifications, Chart of Accounts, Cost Codes, Bills, Purchase Orders, Bidding, Reports, etc. -- look identical. One consistent style matching the clean shadcn/ui default. Schedule components are excluded (they use a specialized compact layout).

### What Changes

The base `table.tsx` component already defines the standard look via CSS variables. The problem is that **58 files** override those defaults with custom heights, padding, and font sizes (`h-8`, `h-10`, `h-12`, `px-1`, `px-2`, `py-0`, `py-1`, `text-xs`, `font-bold`, `font-semibold`, etc.). We will strip all of those overrides so every table inherits the same clean defaults.

### The Standard Style (shadcn defaults)

- **Header row height**: 2.5rem (40px) via `--table-head-h`
- **Header font**: `text-sm font-medium` (14px, medium weight) -- already in base component
- **Cell padding**: `1rem` horizontal, `0.5rem` vertical via CSS variables
- **Row hover**: subtle `bg-muted/50` on hover
- **No bold headers, no tiny text, no cramped rows**

### What We Keep (not removed)

- Column widths (`w-12`, `w-20`, `w-44`, etc.) -- each table has its own proportions
- Text alignment (`text-right`, `text-center`)
- Sticky positioning (`sticky right-0`, `sticky top-0`)
- Semantic colors for special rows (totals with `bg-muted/30`, group headers with `bg-primary/10`)
- Functional classes (`colSpan`, `whitespace-nowrap`, `truncate`, `overflow-hidden`)
- `table-fixed` layout where used

### What We Remove

From `TableHead` elements: `h-8`, `h-10`, `px-1`, `px-2`, `px-3`, `py-0`, `py-1`, `py-2`, `text-xs`, `text-sm`, `font-bold`, `font-semibold`, `font-medium`

From `TableCell` elements: `px-1`, `px-2`, `px-3`, `py-0`, `py-1`, `py-2`, `py-3`, `text-xs`, `text-sm` (keeping them only inside inner `span` elements if needed for specific content formatting)

From `TableRow` elements: Custom `h-8`, `h-10`, `h-12` height overrides on standard rows (keeping semantic classes on total/group rows)

### CSS Variable Update

In `src/index.css`, confirm the variables are set to:

```
--table-head-h: 2.5rem;
--table-cell-py: 0.5rem;
--table-cell-px: 1rem;
```

### Base Component Cleanup

In `src/components/ui/table.tsx`, ensure `TableHeader` uses `bg-background` instead of `bg-white` for proper theme support, and `TableHead` uses `bg-background` as well.

### Scope -- Not Touching

- `src/components/schedule/*` -- all schedule/Gantt components are excluded
- Functionality, data flow, and behavior remain unchanged
- This is purely a visual consistency pass

### Files to Modify (58 files)

**Settings:**
- `src/components/settings/CostCodesTable.tsx`
- `src/components/settings/CostCodeTableRow.tsx`
- `src/components/settings/SpecificationsTable.tsx`
- `src/components/settings/SpecificationTableRow.tsx`
- `src/components/settings/SpecificationGroupRow.tsx`
- `src/components/settings/ChartOfAccountsTab.tsx`

**Budget:**
- `src/components/budget/BudgetTableHeader.tsx`
- `src/components/budget/ActualTableHeader.tsx`
- `src/components/budget/BudgetProjectTotalRow.tsx`
- `src/components/budget/HistoricalOnlyRow.tsx`
- `src/components/budget/BudgetCostCodeRow.tsx`
- `src/components/budget/ActualCostCodeRow.tsx`

**Bills:**
- `src/components/bills/BillsApprovalTable.tsx`
- `src/components/bills/BillsReviewTable.tsx`
- `src/components/bills/POComparisonDialog.tsx`

**Bidding:**
- `src/components/bidding/BiddingTableHeader.tsx`
- `src/components/bidding/components/BiddingTableRowContent.tsx`

**Purchase Orders:**
- `src/components/purchaseOrders/PurchaseOrdersTableHeader.tsx`
- `src/components/purchaseOrders/PurchaseOrdersGroupHeader.tsx`
- `src/components/purchaseOrders/components/PurchaseOrdersTableRowContent.tsx`

**Issues:**
- `src/components/issues/IssuesTableHeader.tsx`
- `src/components/issues/AddIssueRow.tsx`
- `src/components/issues/IssueRow.tsx`

**Reports:**
- `src/components/reports/JobCostActualDialog.tsx`
- `src/components/reports/JobCostRow.tsx`
- `src/components/reports/JobCostGroupTotalRow.tsx`
- `src/components/reports/JobCostProjectTotalRow.tsx`
- `src/components/reports/AccountsPayableContent.tsx`

**Accounting:**
- `src/components/accounting/AccountDetailDialog.tsx`
- `src/components/accounting/BankStatementsDialog.tsx`

**Credit Cards:**
- `src/components/creditcards/CreditCardSearchDialog.tsx`

**Deposits:**
- `src/components/deposits/DepositSearchDialog.tsx`

**Marketplace:**
- `src/components/marketplace/MarketplaceCompaniesTable.tsx`

**Lots:**
- `src/components/LotManagementSection.tsx`

**Estimate:**
- `src/components/estimate/UploadSheetDialog.tsx`

**Employees:**
- `src/components/employees/EmployeeTable.tsx`

**Accountant Dashboard:**
- `src/components/accountant-dashboard/AccountantJobsTable.tsx`

**Base:**
- `src/components/ui/table.tsx`
- `src/index.css`

Plus any remaining files from the 58 found in the search (all will get the same treatment: strip overrides, keep structural/functional classes).

### Result

Navigate between any page -- Cost Codes, Specifications, Chart of Accounts, Budget, Bills, Purchase Orders, Reports -- and every table will have the same header height, font size, weight, and padding. Clean, consistent, and professional.

