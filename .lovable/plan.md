
Objective
Align Budget, Bidding, Purchase Orders, Manage Bills, and Reports with the Files-page pattern: all page-level controls (buttons, search, date pickers, lot dropdowns, upload triggers) live in DashboardHeader’s right-side action area, and content starts cleanly below the header with no extra toolbar row.

What I verified in the current code
- Budget: only lock icon is in DashboardHeader; BudgetPrintToolbar still renders inside BudgetTable (`src/components/budget/BudgetTable.tsx`).
- Bidding: search + Global Settings + Load Bid Packages still render inside BiddingTable (`src/components/bidding/BiddingTable.tsx`).
- Purchase Orders: search + Create Purchase Order still render inside PurchaseOrdersTable (`src/components/purchaseOrders/PurchaseOrdersTable.tsx`).
- Manage Bills: upload/search/filter controls still render inside BillsApprovalTabs content area (`src/components/bills/BillsApprovalTabs.tsx`), not header.
- Reports: As-of/calendar and report controls remain inside report content components (`BalanceSheetContent`, `IncomeStatementContent`, `JobCostsContent`, `AccountsPayableContent`) instead of header.

Implementation strategy
Use a shared “header action bridge” pattern so complex table/report components can keep their internal state while rendering their controls in the parent page header.

Pattern
1) Parent page owns `headerAction` state and passes it to `<DashboardHeader headerAction={...} />`.
2) Parent passes callback prop down (e.g., `onHeaderActionChange`).
3) Child component builds its action JSX from its local state and reports it upward via `useEffect`.
4) Child removes the old in-content toolbar row.
5) On unmount/tab switch, child clears header actions by sending `null`.

This avoids risky full state lifting while giving exact Files-page behavior.

Detailed file-by-file plan

1) Budget page
Files:
- `src/pages/ProjectBudget.tsx`
- `src/components/budget/BudgetTable.tsx`
- (reuse existing) `src/components/budget/BudgetPrintToolbar.tsx`

Changes:
- Add `budgetHeaderActions` state in `ProjectBudget.tsx`.
- Compose final header action as lock button + `budgetHeaderActions` in one horizontal group.
- Pass `onHeaderActionChange` prop into `BudgetTable`.
- In `BudgetTable`, keep existing toolbar logic/state, but:
  - remove in-content toolbar wrapper at top.
  - emit `<BudgetPrintToolbar ... />` through `onHeaderActionChange`.
- Ensure no extra top gap remains in `BudgetTable` (`space-y-4` adjusted if needed so table starts immediately).

Outcome:
Budget lock + expand/collapse + lot selector + Add Budget + Export PDF all appear in DashboardHeader right side.

2) Bidding page
Files:
- `src/pages/ProjectBidding.tsx`
- `src/components/bidding/BiddingTabs.tsx`
- `src/components/bidding/BiddingTable.tsx`

Changes:
- Add `biddingHeaderActions` state in `ProjectBidding.tsx`; pass to `DashboardHeader`.
- Add `onHeaderActionChange` prop chain: ProjectBidding -> BiddingTabs -> BiddingTable.
- In `BiddingTable`, move search + Global Settings + Load Bid Packages UI to emitted header action.
- Remove existing in-content top toolbar row(s) from `BiddingTable`.
- Keep upload progress/bulk bars in content (these are contextual data-state banners, not page header controls).

Outcome:
Bidding controls in top header, content/table starts flush under header like Files page.

3) Purchase Orders page
Files:
- `src/pages/ProjectPurchaseOrders.tsx`
- `src/components/purchaseOrders/PurchaseOrdersTable.tsx`

Changes:
- Add `purchaseOrdersHeaderActions` state in `ProjectPurchaseOrders.tsx`; pass to DashboardHeader.
- Add `onHeaderActionChange` prop to `PurchaseOrdersTable`.
- In `PurchaseOrdersTable`, emit header actions containing search input + Create Purchase Order button.
- Remove in-content toolbar row from table component.
- Keep dialog state in table (or minimally lift if needed), but trigger stays from header action.

Outcome:
PO search/create controls sit in header right; table aligns directly below.

4) Manage Bills page
Files:
- `src/pages/ApproveBills.tsx`
- `src/components/bills/BillsApprovalTabs.tsx`
- `src/components/bills/SimplifiedAIBillExtraction.tsx` (for upload trigger refactor)

Changes:
- Add `manageBillsHeaderActions` state in `ApproveBills.tsx`; pass to DashboardHeader.
- Add `onHeaderActionChange` prop to `BillsApprovalTabs`.
- In `BillsApprovalTabs`, emit different header actions based on active tab:
  - Upload tab: Upload PDFs button (triggering extraction uploader).
  - Review/Rejected/Paid tabs: search field in header.
  - Approve tab: search + due-date filter controls in header.
  - Manual tab: likely no action (null) unless needed.
- Remove duplicated in-content control rows (`mb-4` search/filter wrappers).
- For `SimplifiedAIBillExtraction`, decouple uploader trigger from in-component button:
  - introduce trigger API (e.g., `onRegisterUploadTrigger` or `renderUploadTrigger`) so Upload button can live in page header while hidden file input remains functional.
  - keep extraction progress/status messages in content area.

Outcome:
Manage Bills keeps left content sidebar, but all top controls are in page header action slot.

5) Reports page (all report types)
Files:
- `src/pages/Reports.tsx`
- `src/components/reports/ReportsTabs.tsx`
- `src/components/reports/BalanceSheetContent.tsx`
- `src/components/reports/IncomeStatementContent.tsx`
- `src/components/reports/JobCostsContent.tsx`
- `src/components/reports/AccountsPayableContent.tsx`

Changes:
- Add `reportsHeaderActions` state in `Reports.tsx`; pass into DashboardHeader.
- Add callback chain `Reports -> ReportsTabs -> ActiveReportContent`.
- Each report content component emits its top controls into header:
  - Balance Sheet: As-of date picker button.
  - Income Statement: As-of date picker button.
  - Job Costs: As-of date + lot selector + lock toggle + export PDF.
  - Accounts Payable: As-of date + lot selector + export PDF.
- Remove the in-content action rows that currently hold those controls.
- Remove action-bearing CardHeader rows in report cards where they are only there for controls (preserve data card titles like “Assets” and “Liabilities & Equity”).

Outcome:
No duplicated “report toolbar” row in content; all report controls live in page header right, exactly matching your Files-page standard.

Layout consistency checks to enforce
- Page wrapper remains `px-6 pt-3 pb-6` or tabs’ inner standard equivalent.
- No top spacer/toolbars above first table/card in content.
- No hidden elements inside spaced stacks creating phantom gaps.
- Keep shadcn button variants/sizes only (project standard).

Validation checklist after implementation
1) Budget
- Lock + lot + expand/collapse + add + export appear in header.
- First table border aligns with sidebar selector line.
2) Bidding
- Search + Global Settings + Load Bid Packages appear in header.
- No duplicate controls in content.
3) Purchase Orders
- Search + Create Purchase Order appear in header.
- Table starts immediately below.
4) Manage Bills
- Upload/Search/Date filter controls appear in header according to active sub-tab.
- No duplicate in-content top control rows.
5) Reports
- As-of and other controls are in header for each report type.
- No redundant report toolbar row in content.
- Switching report types updates header actions correctly and clears stale controls.

Risk points and mitigations
- Stale header actions when switching tabs/routes:
  - Always clear via cleanup effect in child components (`onHeaderActionChange(null)` on unmount/tab change).
- Event handlers tied to child state:
  - Emit fresh JSX whenever relevant state changes (dependency-complete `useEffect`).
- Upload trigger complexity in Manage Bills:
  - Keep file input ownership in extraction component and expose a trigger callback instead of duplicating upload logic.

Execution order (safe sequence)
1) Implement header action bridge in Budget + PO (simpler wins first).
2) Implement Bidding bridge.
3) Implement Reports bridge (date/lot/export/lock per active report).
4) Implement Manage Bills bridge + uploader trigger refactor.
5) Run visual consistency pass against Files-page alignment on all five pages.
