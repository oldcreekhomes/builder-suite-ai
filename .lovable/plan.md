## Goal
Add a Print button to the Account Detail dialog (the modal that opens when you click an account like "1430 - WIP - Direct Construction Costs") that exports a PDF matching the Budget PDF visual style.

## Changes

### 1. New file: `src/components/accounting/pdf/AccountDetailPdfDocument.tsx`
- `@react-pdf/renderer` document mirroring `src/components/budget/pdf/BudgetPdfDocument.tsx` styling (Helvetica 9pt, centered title, bordered table header, alternating row borders, footer with page numbers).
- Props: `accountLabel` (e.g. "1430 - WIP - Direct Construction Costs"), `projectName`, `dateRange` (From/To if set), `rows` (the currently filtered/sorted rows already displayed in the dialog), `totalAmount`, `endingBalance`.
- Columns match the on-screen table: Type, Date, Name, Account, Description, Amount, Balance, Status. (Actions column omitted.)
- Landscape Letter for horizontal room.

### 2. Edit: `src/components/accounting/AccountDetailDialog.tsx`
- Add a Print icon button in the dialog header next to the search bar.
- On click: use `pdf(<AccountDetailPdfDocument .../>).toBlob()`, open blob URL in a new tab (same pattern used in `CheckPrintPreview.handlePrint`).
- Pass in the same row array the table currently renders (after filter/date range/search), plus the header label already shown at top-left, plus the running total/ending balance already computed.

No business logic changes; presentation only.
