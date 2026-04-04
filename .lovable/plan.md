

## Align Operating Expenses Columns with Cards Above

### Problem
The top row uses two separate `Card` components inside a `grid-cols-2 gap-6` grid. The bottom Operating Expenses is a single `Card` with an internal `grid-cols-2 gap-6`. Because the single card has its own padding (from `CardContent`), the internal two columns don't align horizontally with the two separate cards above -- the columns are shifted inward and closer together.

### Solution
Split the Operating Expenses section into **two separate cards** (just like Property & Revenue and Loan Terms above), placed inside the same `grid-cols-2 gap-6` grid. This guarantees the left and right columns align perfectly with the cards above.

- **Left card** titled "Operating Expenses": Tax Rate, Estimated Value, Taxes, Insurance, Utilities, Repairs & Maintenance
- **Right card** titled "Operating Expenses (cont.)": Management Fee, Payroll, General & Administrative, Marketing, Reserves per Unit

Alternatively, the right card can share the same title or have no title -- matching whichever looks cleaner. Both cards will use the same `CardHeader`/`CardContent` structure and spacing as the cards above.

### Files Changed
- `src/pages/apartments/ApartmentInputs.tsx` -- Replace the single Operating Expenses `Card` with two separate cards in the same grid as the top row (or a second `grid-cols-2 gap-6` row)

