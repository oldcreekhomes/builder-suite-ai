
Problem status:
- I dug through the full export path.
- The live Nob Hill data is correct in `project_budgets`:
  - 1010 / 1020 / 1040 = `actual`
  - 3180 / 3220 / 3340 / 3380 = `purchase-orders`
- The latest uploaded PDF I parsed also already shows those rows correctly.
- That means the remaining issue is not the database. It is the export pipeline being too fragile and likely allowing stale/opened-wrong-file confusion.

What I found in code:
- Budget page source label: `BudgetSourceBadge` -> `getBudgetSourceLabel(...)`
- PDF export path: `BudgetTable.tsx` -> `handleExportPdf()` -> `BudgetPdfDocument.tsx`
- Print path: `BudgetPrintView.tsx`
- `BudgetTable.tsx` currently injects `__sourceLabel`, but both PDF and print still keep fallback label logic:
  - `item.__sourceLabel ?? getBudgetSourceLabel(item)`
- Exported files are all named `Project_Budget-YYYY-MM-DD.pdf`, which makes it easy to open the wrong download and think the newest export is still wrong.

Plan to fully fix it:
1. Harden the export model in `BudgetTable.tsx`
- Build a dedicated export row structure from the exact grouped items shown on screen.
- Precompute and store:
  - cost code
  - name
  - required `sourceLabel`
  - totals / historical / variance inputs
- Stop passing loose raw item objects as the contract for export rendering.

2. Remove all source-label decision logic from PDF and print
- Update `BudgetPdfDocument.tsx` to render only the precomputed `sourceLabel`.
- Update `BudgetPrintView.tsx` to render only the precomputed `sourceLabel`.
- Delete the fallback `getBudgetSourceLabel(...)` usage from those export components so they can never drift again.

3. Make stale-file confusion impossible
- Change the PDF filename to include timestamp, e.g. `Project_Budget-2026-04-17-10-57-11.pdf`.
- This ensures each export is a unique file and prevents opening an older download by mistake.

4. Add a strict export guard
- If any export row is missing a `sourceLabel`, fail the export with a toast instead of silently falling back.
- This turns future drift into an obvious bug instead of a silent wrong PDF.

5. End-to-end validation after implementation
- Re-export Nob Hill and verify the PDF rows match the on-screen budget page exactly, especially:
  - 1010 Lot Costs → Actual
  - 1020 Closing Costs → Actual
  - 1040 Land Taxes → Actual
  - 3180 Sediment & Erosion → Purchase Order
  - 3220 Demolition → Purchase Order
  - 3340 Earthwork → Purchase Order
  - 3380 Sanitary → Purchase Order
- Also confirm the new download filename is unique so the correct file is being opened.

Technical details:
- Files to update:
  - `src/components/budget/BudgetTable.tsx`
  - `src/components/budget/pdf/BudgetPdfDocument.tsx`
  - `src/components/budget/BudgetPrintView.tsx`
  - likely one small shared export-row type/helper under `src/components/budget/` or `src/utils/`
- Root principle:
  - The export must not “figure out” Source again.
  - The budget page decides the label once.
  - PDF/print only render that resolved label.
