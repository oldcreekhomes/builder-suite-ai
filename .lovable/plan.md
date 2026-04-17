
Problem:
- The uploaded PDF still does not match the Budget page for Nob Hill.
- Confirmed from the uploaded export:
  - 1000s (1010 / 1020 / 1040) show as Manual in the PDF, but should be Actual.
  - Several 3000s (3180 / 3220 / 3340 / 3380) show as Estimate/Manual in the PDF, but should be Purchase Order.
- The on-screen budget table uses `BudgetSourceBadge.tsx`, while the PDF and print paths each maintain their own separate `getSourceLabel()` logic. That duplication is the real weakness: even if one path is edited, the export can still drift from the budget page.

Implementation plan:
1. Create one shared budget source helper
   - Extract the exact source-label decision tree from `src/components/budget/BudgetSourceBadge.tsx` into a shared utility such as `src/utils/budgetSource.ts`.
   - Have it return the canonical label for each item (`Actual`, `Purchase Order`, `Vendor Bid`, `Historical`, `Estimate`, `Settings`, `Manual`) using `budget_source` first, then legacy fallback only when `budget_source` is missing.

2. Make the budget page use the shared helper
   - Update `BudgetSourceBadge.tsx` to call the shared helper instead of owning its own source decision logic.
   - This keeps the current page behavior as the single source of truth.

3. Make PDF export use the exact same helper
   - Replace `getSourceLabel()` in `src/components/budget/pdf/BudgetPdfDocument.tsx` with the shared helper.
   - This guarantees the PDF uses the same label resolution as the budget page.

4. Make print view use the exact same helper
   - Replace `getSourceLabel()` in `src/components/budget/BudgetPrintView.tsx` with the shared helper.
   - This prevents print/export drift going forward.

5. Regression validation
   - Re-export Nob Hill and verify the PDF matches the on-screen budget page row-for-row for the Source column.
   - Specifically verify:
     - 1010 Lot Costs → Actual
     - 1020 Closing Costs → Actual
     - 1040 Land Taxes → Actual
     - 3180 Sediment & Erosion → Purchase Order
     - 3220 Demolition → Purchase Order
     - 3340 Earthwork → Purchase Order
     - 3380 Sanitary → Purchase Order
   - Also spot-check Vendor Bid, Historical, Estimate, and Manual rows to confirm no regressions.

Technical details:
- Files to update:
  - `src/components/budget/BudgetSourceBadge.tsx`
  - `src/components/budget/pdf/BudgetPdfDocument.tsx`
  - `src/components/budget/BudgetPrintView.tsx`
  - new shared helper file in `src/utils/`
- Goal:
  - No independent source-label logic in export/print paths.
  - PDF export must render the same Source labels as the Budget page, using the same helper and same precedence rules.
