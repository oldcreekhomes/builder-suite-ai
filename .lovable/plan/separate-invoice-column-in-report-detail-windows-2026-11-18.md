# Separate "Invoice #" column in report detail windows

## What changes
- Description goes back to only the description (e.g. "Touch up cabinets"), with no invoice number in front.
- A new **Invoice #** column sits just left of Description (e.g. "MSG630"). Combined payments list all their invoice numbers, comma-separated. Rows with no bill show "-".
- Everything stays on one line. Long values are cut off, and hovering shows the full text.
- Searching by invoice number or amount still works.

## Where
- Balance Sheet and Income Statement detail windows (bank registers like 1015 Capital One, and other accounts).
- Job Costs detail window. It gets the same Invoice # column for bill lines.
- A/P already has its own invoice/reference column, so it stays as is.
- Printed versions of these windows get the same column.

## Technical details
- `AccountDetailDialog.tsx`: add `invoiceNumber` to Transaction. Set it from `bill.reference_number` (single bill) or the joined allocation refs (consolidated payments) instead of prefixing `description`. Add a `w-28` header/cell with `truncate` and `title`. The search filter checks `invoiceNumber`.
- `JobCostActualDialog.tsx`: add an Invoice # column from the existing `reference_number`, and take its width from the Description column.
- Update the matching print/PDF column lists.
