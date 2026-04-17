
## Goal
Add an "Export PDF" button to the three Apartment pages (Dashboard, Income Statement, Amortization Schedule) using the same header/footer template as the Budget PDF.

## Template (reused from `BudgetPdfDocument`)
- **Header (centered):** big title + project address subtitle
- **Footer (fixed, on every page):** date (left) · time (center) · "Page N of M" (right)
- Letter size, 40pt padding, Helvetica, same font sizes/colors

I'll create a small shared layout component `src/components/apartments/pdf/ApartmentPdfLayout.tsx` exporting:
- `apartmentPdfStyles` (page, header, title, subtitle, table styles, footer)
- `ApartmentPdfHeader({ title, address })`
- `ApartmentPdfFooter()` (fixed footer with date/time/page numbers)

This keeps the three documents DRY and guarantees identical headers/footers to Budget.

## New PDF documents
1. `src/components/apartments/pdf/ApartmentDashboardPdfDocument.tsx`
   - Title: "Apartment Dashboard"
   - Renders the 4 cards as PDF sections: Income Summary, Loan Summary, Property Assumptions, Asset Valuation (label/value rows mirroring the on-screen layout).
2. `src/components/apartments/pdf/ApartmentIncomeStatementPdfDocument.tsx`
   - Title: "Income Statement"
   - Table with columns: Line Item · Annual · Monthly · % of EGI. Section headers (Revenue, Operating Expenses, Debt Service), totals rows bolded/highlighted.
3. `src/components/apartments/pdf/ApartmentAmortizationPdfDocument.tsx`
   - Title: "Amortization Schedule"
   - Loan summary block (Loan Amount, Rate, Amortization, Term, Monthly Payment) followed by the year-by-year table (9 columns matching the page).

## Page wiring (each of the three apartment pages)
- Fetch the project's address via React Query (same pattern as `ProjectBudget.tsx`):
  ```ts
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await supabase.from('projects').select('address').eq('id', projectId).single()).data,
    enabled: !!projectId,
  });
  ```
- Add an "Export PDF" button passed via `DashboardHeader`'s `headerAction` prop.
- Click handler renders the corresponding PDF doc with `pdf(<Doc .../>).toBlob()` and triggers a download (same pattern used in `BudgetTable.handleExportPdf`).
- Filename: `apartment-dashboard-{address}.pdf`, etc.

## Files
- New: `src/components/apartments/pdf/ApartmentPdfLayout.tsx`
- New: `src/components/apartments/pdf/ApartmentDashboardPdfDocument.tsx`
- New: `src/components/apartments/pdf/ApartmentIncomeStatementPdfDocument.tsx`
- New: `src/components/apartments/pdf/ApartmentAmortizationPdfDocument.tsx`
- Edit: `src/pages/apartments/ApartmentDashboard.tsx` (fetch address, add Export button)
- Edit: `src/pages/apartments/ApartmentIncomeStatement.tsx` (same)
- Edit: `src/pages/apartments/ApartmentAmortizationSchedule.tsx` (same)

## Out of scope
No changes to data calculations, no changes to Budget PDF, no changes to the on-screen apartment UIs beyond the new header button.
