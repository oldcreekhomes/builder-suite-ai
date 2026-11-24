# Bill Double-Check Spreadsheet (v2)

A new Excel file, `BuilderSuite-Bill-Audit-v2.xlsx`, so you can check every bill yourself. The first audit file stays as it is.

## Tabs
1. **All Bills.** Every bill on every job, one row each (about 3,000 rows). It has filters, frozen headers and is sorted by Job, then Vendor.
   - Columns: Job, Vendor, Invoice #, Bill Date, Due Date, Status (Review / Approved / Late / Paid / Rejected / Archived), Bill Total, Sum of Lines, Qty x Rate Total, Difference, Amount Paid, Open Balance, Number of Lots on the Job, Number of Lines, Entered By, Entered On, Last Edited By, Last Edited On, Notes, and a **Flag** column.
   - Flag values: "Doubled (lines = 2x total)", "Lines don't match total", "Qty x Rate doesn't match", "Note mentions doubling", or blank when everything matches.
   - Flagged rows are highlighted red, so you can filter Flag to show only the problem bills.
2. **Flagged Only.** The same columns, showing only the bills that have a flag.
3. **Line Detail.** One row for each line on every flagged bill: Job, Vendor, Invoice #, Lot, Cost Code, Description, Qty, Rate, Line Amount. Use it to compare against the invoice PDF.
4. **Payments.** Every payment recorded in BuilderSuite against a flagged bill: date, amount, bank account, and check or reference number.
5. **Summary by Job.** Bills checked, bills flagged, and the dollar difference for each job. The figures are spreadsheet formulas, so they recalculate automatically.

## Notes
- Payments made outside BuilderSuite (like the $3,046 scheduled for Green Landscaping) can't be seen in the app, so compare them against your bank or bill-pay records.
- All amounts show to the cent with 2 decimals, and differences are calculated cent by cent.
- Before delivering, I'll recalculate the file and check it for formula errors.

## Technical
- A read-only SQL pull from bills, bill_lines, vendors, projects, project_lots, cost_codes, bill_payments and allocations, and users (for names), joined in Python. The workbook is built with openpyxl.
- Saved to /mnt/documents. No app code changes.
