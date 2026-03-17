

## Plan: Budget Excel Import with Matching Dialog

### Overview
Create a new "Import Excel" button in the budget toolbar that opens a multi-step dialog: (1) upload an Excel file, (2) parse and match line items against the user's cost codes, (3) show a review table with match status and allow remapping of unmatched items, (4) import selected items into `project_budgets`.

### Files to Create

**1. `src/components/budget/BudgetExcelImportDialog.tsx`**
A dialog component with two steps:

- **Step 1 - File Upload**: File input accepting `.xlsx/.xls`, plus a note about expected format (code column + amount column).

- **Step 2 - Review & Map**: A scrollable table showing each parsed line item with columns:
  - Excel Code | Excel Description | Amount | Match Status | Mapped Cost Code (dropdown)
  - **Matched rows**: green indicator, auto-populated cost code dropdown
  - **Unmatched rows**: red "No Match" indicator, cost code dropdown (searchable Select) to manually pick a cost code
  - **Checkbox** per row to include/exclude from import
  - Hardcoded mapping table for known mismatches (e.g., `4010.1`→`4010 Parking`, `4010.2`→`4040 Office Supplies`, `4010.3`→`4015 Office`, `4010.4`→`4020 Project Manager`, `4010.5`→`4025 Accounting`, `4010.6`→`4030 Other`)
  - Skip group header rows (1000, 2000, 3000, 4000) and total/summary rows

- **Parsing logic**:
  - Read the first sheet with `xlsx` library
  - Find rows with numeric code patterns (e.g., "1010", "4010.1")
  - Extract "Act. Cost" or similar amount column
  - Query the user's `cost_codes` table, match by code number
  - For each Excel row, find the matching cost_code record by `code` field

- **Import action**: Insert matched/mapped items into `project_budgets` with `quantity: 1`, `unit_price: amount`, `budget_source: 'manual'`, current `lot_id` if selected.

**2. Edit `src/components/budget/BudgetPrintToolbar.tsx`**
- Add an "Import Excel" button (Upload icon) next to the "+ Budget" button
- Add `onImportExcel` callback prop

**3. Edit `src/components/budget/BudgetTable.tsx`**
- Add state for the import dialog (`showImportDialog`)
- Wire `onImportExcel` to open the dialog
- Pass `projectId`, `selectedLotId`, and `existingCostCodeIds` to the dialog
- Invalidate budget queries on successful import

### Key Technical Details
- Reuse existing `xlsx` library (already installed)
- Query cost codes via `supabase.from('cost_codes').select('*')` (RLS handles owner filtering)
- The searchable cost code dropdown for remapping will use a Combobox/Select with search filtering
- Skip items where the matched cost_code_id already exists in the current budget (prevent duplicates, same as BudgetCreationModal logic)
- Summary at bottom of dialog: "X matched, Y unmatched, Z to import"

