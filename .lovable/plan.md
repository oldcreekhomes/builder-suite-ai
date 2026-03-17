

## Problem

The Excel file doesn't have clean "Code" / "Description" / "Amount" column headers. Instead, the data is in a **nested, indented layout** across multiple columns:

- Column 0: Empty or "TOTAL"
- Column 1: "Service" / "No item"  
- Column 2: Group headers like "1000 LAND ACQUISITION COSTS"
- Column 3: Line items like "1010 Lot Costs" (code + name combined in one cell)
- Column 4: Sub-items like "4010.1 Parking"
- Column 5: Amount (Act. Cost)

The current parser looks for header cells labeled "code", "description", "act cost" — finds none — falls back to column 0 (which is mostly empty), so nothing matches.

## Fix

Rewrite the parsing logic in `BudgetExcelImportDialog.tsx` to handle this indented format:

1. **Scan all rows for the pattern `"NNNN Description"` (a number followed by text in one cell)** across columns 2, 3, and 4.
2. **Extract the code and description** by splitting on the first space (e.g., `"1010 Lot Costs"` → code `1010`, description `Lot Costs`).
3. **Find the amount** in the rightmost populated numeric column of that row (column 5 in this file, but should be flexible).
4. **Keep existing filtering**: skip group headers (1000, 2000, 3000, 4000), skip "Total" rows.
5. **Keep all existing matching logic** (exact match, known mappings, etc.) unchanged.

The key change is replacing the "find header row by label" approach with a "find cells matching `^\d+(\.\d+)?\s+.+$` pattern" approach that works regardless of column position.

### Files to Edit
- `src/components/budget/BudgetExcelImportDialog.tsx` — rewrite the `handleParse` column detection and row extraction logic (lines ~100-142)

