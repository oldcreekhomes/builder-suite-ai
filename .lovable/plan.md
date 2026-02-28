

## Convert Horizontal Tabs to Vertical Sidebar Menus (Marketplace Style)

### Overview

Replace horizontal tab bars on 5 pages with vertical sidebar menus matching the Marketplace's `MarketplaceCategorySidebar` pattern: a fixed-width `w-[220px]` panel with a header row (icon + title, `border-b`, `h-10`), followed by a scrollable list of menu items. The content area sits to the right.

### Pages to Convert

| Page | Current Tabs | New Sidebar Items |
|------|-------------|-------------------|
| **Settings** | Already vertical but uses Radix Tabs styling | Convert to Marketplace-style sidebar with simple buttons, same `w-[220px]` width, matching header row |
| **Bidding** | 3 horizontal tabs: Draft, Bidding, Closed | Vertical sidebar with counts in parentheses |
| **Manage Bills** | 4-6 horizontal tabs: Enter Manually, Enter with AI, Review, Rejected, Approved, Paid | Vertical sidebar with counts |
| **Transactions** | 5 horizontal tabs: Journal Entry, Write Checks, Make Deposits, Credit Cards, Reconcile Accounts | Vertical sidebar |
| **Reports** | 4 horizontal tabs: Balance Sheet, Income Statement, Job Costs, Accounts Payable | Vertical sidebar |

### Approach

**1. Create a reusable `ContentSidebar` component** (`src/components/ui/ContentSidebar.tsx`)

A generic vertical sidebar matching Marketplace's exact styling:
- `w-[220px] flex-shrink-0 border-r border-border bg-background`
- Header: `px-4 py-3 border-b border-border` with icon + title in `h-10` flex container (aligns with sidebar's "Construction Management" divider)
- Menu items: `px-3 py-2 text-sm rounded-md` buttons with `hover:bg-muted` and active state `bg-primary/10 text-primary font-medium`
- Wraps items in `ScrollArea`
- Accepts: `title`, `icon`, `items` array (label, value, count?), `activeItem`, `onItemChange`
- Supports collapsible sub-groups (like Settings' "Suppliers" section) using the same Collapsible pattern as Marketplace

**2. Convert each tabs component to use sidebar layout**

For each page, the pattern change is:
```text
BEFORE:
[Header Bar]
[Horizontal Tabs: Tab1 | Tab2 | Tab3]
[Content]

AFTER:
[Header Bar]
[Sidebar w-220px | Content area]
```

**BiddingTabs.tsx**: Replace `<Tabs>` with flex layout + `ContentSidebar`. Sidebar header: icon + "Bid Status". Items: Draft (count), Bidding (count), Closed (count). Content renders `BiddingTable` based on active item.

**BillsApprovalTabs.tsx**: Replace `<Tabs>` with flex layout + `ContentSidebar`. Sidebar header: icon + "Bill Actions". Items: Enter Manually, Enter with AI (count), Review (count), Rejected (count), Approved (count), Paid (count). All existing content and logic stays the same, just rendered conditionally by active item instead of `TabsContent`.

**TransactionsTabs.tsx**: Replace `<Tabs>` with flex layout + `ContentSidebar`. Sidebar header: icon + "Transaction Type". Items: Journal Entry, Write Checks, Make Deposits, Credit Cards, Reconcile Accounts. The `UnsavedChangesProvider` and navigation guard logic stays intact -- `handleTabChange` becomes `handleItemChange`.

**ReportsTabs.tsx**: Replace `<Tabs>` with flex layout + `ContentSidebar`. Sidebar header: icon + "Report Type". Items: Balance Sheet, Income Statement, Job Costs, Accounts Payable.

**Settings.tsx**: Replace the current `w-52` vertical `TabsList` with `ContentSidebar` at `w-[220px]`. The "Suppliers" collapsible group maps to `ContentSidebar`'s sub-group feature. Header: icon + "Settings". Items stay the same (Budget, Chart of Accounts, Company Profile, etc.).

**3. Update parent page layouts**

Each parent page needs the content wrapper changed from `<div className="p-6">` to `<div className="flex flex-1 overflow-hidden">` to accommodate the sidebar + content side-by-side layout (matching Marketplace.tsx lines 79-148).

### Technical Details

- The `ContentSidebar` component accepts a generic `items` prop:
  ```ts
  interface ContentSidebarItem {
    value: string;
    label: string;
    count?: number;
    indent?: boolean; // for sub-items like Settings > Suppliers > Companies
  }
  interface ContentSidebarGroup {
    label: string;
    items: ContentSidebarItem[];
    collapsible?: boolean;
  }
  ```
- Active state styling exactly matches Marketplace: `bg-primary/10 text-primary font-medium`
- Header height matches the `h-10` inner container standard for border alignment
- No functional changes to any content -- only the navigation wrapper changes from horizontal tabs to vertical sidebar

### Files Changed

| File | Action |
|------|--------|
| `src/components/ui/ContentSidebar.tsx` | **New** -- reusable vertical sidebar |
| `src/components/bidding/BiddingTabs.tsx` | Replace Tabs with ContentSidebar layout |
| `src/components/bills/BillsApprovalTabs.tsx` | Replace Tabs with ContentSidebar layout |
| `src/components/transactions/TransactionsTabs.tsx` | Replace Tabs with ContentSidebar layout |
| `src/components/reports/ReportsTabs.tsx` | Replace Tabs with ContentSidebar layout |
| `src/pages/Settings.tsx` | Replace vertical TabsList with ContentSidebar |
| `src/pages/ProjectBidding.tsx` | Update content wrapper to flex layout |
| `src/pages/ApproveBills.tsx` | Update content wrapper to flex layout |
| `src/pages/Transactions.tsx` | Update content wrapper to flex layout |
| `src/pages/Reports.tsx` | Update content wrapper to flex layout |

