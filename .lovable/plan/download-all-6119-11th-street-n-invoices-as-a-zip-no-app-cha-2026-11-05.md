# Download all 6119 11th Street N invoices as a ZIP (no app changes)

6119 11th Street N has 64 bills with 62 invoice files attached.

## Steps
1. Download every invoice file attached to bills on 6119 11th Street N.
2. Name each file so you can tell them apart: `Vendor - Invoice # - Bill Date - Amount.pdf`.
3. Add an `index.csv` listing every bill: vendor, invoice #, date, amount, status, and file name. Bills with no file attached are marked "no file".
4. Pack everything into `6119-11th-St-N-invoices.zip` and share it here for download.

## Not changing
- No app code, no data edits. Read-only export.

## Technical details
- Query `bills` + `bill_attachments` by project_id `a50ae540-...`, include reversed/archived bills flagged in the CSV.
- Download from storage, build ZIP in /tmp, inspect entries, copy to Files.
