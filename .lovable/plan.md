

## Align Operating Expenses Columns on Inputs Page

### Problem
The Operating Expenses section uses a 3-column grid, but column 1 has 6 rows, column 2 has 4 rows, and column 3 has only 1 row ("Reserves per Unit"). This creates misaligned, uneven columns. The values and labels don't stack neatly under the two-column cards above.

### Solution
Restructure Operating Expenses from a 3-column to a **2-column grid** that aligns with the Property & Revenue and Loan Terms cards above:

**Left column** (stacks under Property & Revenue):
- Tax Rate
- Estimated Value
- Taxes (computed, read-only)
- Insurance
- Utilities
- Repairs & Maintenance

**Right column** (stacks under Loan Terms):
- Management Fee
- Payroll
- General & Administrative
- Marketing
- Reserves per Unit

This ensures labels and values in each column line up vertically with the cards above, and "Reserves per Unit" moves below Marketing instead of sitting alone in a third column.

### Files Changed
- `src/pages/apartments/ApartmentInputs.tsx` — Change Operating Expenses from `md:grid-cols-3` to `lg:grid-cols-2`, move Reserves per Unit into column 2 below Marketing

