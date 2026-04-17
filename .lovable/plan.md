
Problem confirmed: the Nob Hill database rows are correct (`1010/1020/1040 = actual`, `3180/3220/3340/3380 = purchase-orders`), but the exported PDF still shows fallback labels like Manual/Estimate. That means the data is right and the budget page is right, but the PDF render path is still resolving Source incorrectly at export time.

Plan

1. Stop resolving Source inside the PDF/print components
- In the budget page layer (`BudgetTable.tsx`), build a normalized export row model from the exact same items the table is rendering.
- For each row, compute and store:
  - `costCode`
  - `name`
  - `sourceLabel`
  - `total`
  - optional historical/variance values
- Use `getBudgetSourceLabel(item)` there, before handing data to print/PDF.

2. Make PDF and print render the precomputed label
- Update `BudgetPdfDocument.tsx` to render `row.sourceLabel` directly.
- Update `BudgetPrintView.tsx` to render `row.sourceLabel` directly.
- Remove any local `getSourceLabel()` calls from those components so they cannot drift or fall back differently.

3. Use one shared export-prep helper
- Add a shared helper (for example in `src/utils/` or near the budget components) that converts grouped budget items into export rows.
- Both PDF export and print view should consume that same prepared structure.

4. Keep the budget page as the source of truth
- `BudgetSourceBadge` can continue using `getBudgetSourceLabel(item)`.
- Export/print will no longer “re-decide” the label from raw item data; they will use the already-computed label coming from the same source as the screen.

Validation
- Re-export Nob Hill and verify these rows exactly:
  - 1010 Lot Costs → Actual
  - 1020 Closing Costs → Actual
  - 1040 Land Taxes → Actual
  - 3180 Sediment & Erosion → Purchase Order
  - 3220 Demolition → Purchase Order
  - 3340 Earthwork → Purchase Order
  - 3380 Sanitary → Purchase Order
- Spot-check Vendor Bid, Historical, Estimate, and Manual rows to confirm no regressions.

Technical details
- Files to update:
  - `src/components/budget/BudgetTable.tsx`
  - `src/components/budget/BudgetPrintView.tsx`
  - `src/components/budget/pdf/BudgetPdfDocument.tsx`
  - one shared export-row helper in `src/utils/` or `src/components/budget/`
- This is the safest fix because it makes the PDF export consume the same already-resolved Source text the user sees on the budget page, instead of recalculating it again in a separate render path.
