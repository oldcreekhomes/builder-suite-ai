

## Redesign Inputs Page to Match Dashboard Layout

### Problem
The Inputs page uses a form-style layout with stacked label+input fields in grids, while the Dashboard uses a clean row-based layout with label on the left and value on the right. The user wants a uniform look.

### Approach
Restructure the Inputs page to mirror the Dashboard's exact card structure and row layout. Each row will show the label on the left and an inline editable input on the right (instead of a static value). The input will be a compact, borderless-style field that blends into the row layout.

### New Layout

**Card 1 & 2 (side-by-side, top row):**
- "Property & Revenue" card (matches Dashboard's "Income Summary" position) with rows: Number of Units, Average Rent per Unit, Vacancy Rate, Purchase Price
- "Loan Terms" card (matches "Loan Summary" position) with rows: Loan-to-Value, Interest Rate, Amortization (years), Loan Term (years)

**Card 3 (full-width, middle):**
- "Operating Expenses" card (matches "Expense & NOI Summary") in a 3-column grid layout with rows: Taxes, Insurance, Utilities, Repairs & Maintenance | Management Fee, Payroll, General & Administrative, Marketing | Reserves per Unit

### Row Component
Replace the current stacked Field component with an inline `EditableRow` that uses the same `flex justify-between` pattern as the Dashboard's `Row` component, but renders a right-aligned, compact input instead of static text. The input will have minimal styling (no visible border until focus, right-aligned text) to maintain the clean dashboard aesthetic.

### Files changed
- `src/pages/apartments/ApartmentInputs.tsx` -- complete restructure

