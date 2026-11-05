# 6119 11th Street N — Invoices by Cost Code (v2 workbook)

No app code or data changes. New file only: `6119-11th-St-N-invoices-by-cost-code_v2.xlsx` (the old one stays).

## What changes

1. **Cost Code column between Vendor and Invoice #**
   Columns become: Vendor | Cost Code | Invoice # | Bill Date | Due Date | Status | Amount | Bill Total | Lot | Description | PDF

2. **Cost code parent rows that roll up / expand**
   - One bold, shaded parent row per cost code (e.g. "2030 - Entitlement Engineering") with its total and bill count.
   - Bills sit underneath as child rows. Opens **collapsed**, so you first see just the cost codes and totals.
   - Click the **+ / –** on the left (or the 1 / 2 buttons at the top-left) to expand one code or all of them.
   - Grand total row at the bottom.
   - Note: the + / – buttons only work in Excel, Numbers or Google Sheets. The quick preview inside Lovable Files shows every row flat, which is likely why it looked wrong last time.

3. **PDF on every bill**
   - The old file wrongly said "no file" on most rows. The books show 60 of the 64 bills have a PDF attached; that will be corrected.
   - Each bill's PDF cell becomes a clickable "Open PDF" link.
   - Delivered as a ZIP: the workbook plus a `PDFs` folder, with files named `Vendor - Invoice # - Date - Amount.pdf`. The links open the PDF from that folder, so they never expire.

## What I need from you for the PDFs

The invoice PDFs are in locked storage and I can't download them from here right now. To pull them, I need one of these:
- **Option A (preferred):** add your Supabase service role key as a secret. I download the 60 PDFs, build the ZIP, and you can delete the key afterward.
- **Option B:** if you don't want to share the key, I deliver the workbook with steps 1 and 2 done and the file name in the PDF column, and you add the PDFs later.

## Checks before delivery

- Each cost code total matches the books to the penny.
- No formula errors; groups open collapsed and expand correctly.
- Every PDF link opens the right invoice (spot-check several).
- 4 bills with no attachment are listed as "No PDF on file".

## Technical details

- Data: `bills` + `bill_lines` (cost code, lot, amount) + `bill_attachments` (file_path) for the 6119 project; reversed bills excluded.
- Workbook built with openpyxl: parent rows outline level 0, child rows level 1 with `hidden=True`, `summaryBelow=False`; parent totals as `SUBTOTAL(9, …)` formulas; recalculated with LibreOffice and scanned for errors.
- PDFs downloaded from the private `bill-attachments` bucket; links are relative `HYPERLINK("PDFs/…")` so they work after unzipping.
