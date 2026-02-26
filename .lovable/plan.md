

## Two Fixes for Job Cost Actual Dialog

### 1. Replace Edit Icon with 3-Dot Menu (Actions Column)

Currently, editable bills show a pencil icon directly in the Actions column. This should use the standardized `TableRowActions` dropdown (3-dot menu) consistent with the rest of the application.

**Changes in `src/components/reports/JobCostActualDialog.tsx`:**
- Import `TableRowActions` from `@/components/ui/table-row-actions`
- Replace the `<Button>` with `<Pencil>` icon (lines 370-378) with a `<TableRowActions>` component
- The dropdown will contain an "Edit" action for bills that are not locked
- Locked rows continue to show the lock icon only (no 3-dot menu)

### 2. Show Vendor Name for Deposits

Currently, the query only enriches `bill` and `check` source types with vendor names. Deposits are not enriched, so the Name column shows "-" for deposit transactions.

**Changes in `src/components/reports/JobCostActualDialog.tsx`:**
- After the checks enrichment block (around line 201), add a deposit enrichment block:
  - Collect all `source_id`s where `source_type === 'deposit'`
  - Query the `deposits` table with `companies(company_name)` join (via `company_id`)
  - Build a `depositsMap` mapping deposit ID to company name
- In the line mapping section (around line 204-233), add an `else if (sourceType === 'deposit')` branch:
  - Set `vendor_name` from `depositsMap` using the deposit's company name
  - Set `reconciled` from the deposit record

### Files Changed
| File | Change |
|------|--------|
| `src/components/reports/JobCostActualDialog.tsx` | Replace pencil icon with TableRowActions dropdown; add deposit enrichment for vendor name |
