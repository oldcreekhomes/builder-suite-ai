

## Add Files column to Accounts Payable (A/P Aging) report

### What changes
On Reports → Accounts Payable, add a **Files** column to each aging bucket's bill table so each invoice's PDF/image attachments can be opened directly from the row, just like the Job Cost actual dialog.

### Layout
New column order in each bucket table:

```text
Date | Num | Name | Due Date | Aging | Files | Open Balance
```

- "Aging" moves left (no longer the right-most non-amount column).
- "Files" sits between Aging and Open Balance.
- Each bill row's Files cell renders one icon per attachment (color-coded by file type, hover shows file name, click opens the universal file preview), capped at 3 with `+N` overflow — using the existing `BillFilesCell` component already used on the Bills page.
- Bills with no attachments show a muted dash (`—`), matching the existing pattern.

### Implementation (single file)
`src/components/reports/AccountsPayableContent.tsx`:
1. Extend the `bills` query (lines 87–104) to also select `bill_attachments(id, file_path, file_name, file_size, content_type)`.
2. Extend the `BillWithVendor` interface and the `APAgingBill` shape used for grouping (lines 27–36, 233–241) to carry an `attachments` array through to each row.
3. Import `BillFilesCell` from `@/components/bills/BillFilesCell`.
4. Wrap the report body in `UniversalFilePreviewProvider` is already in place (Reports.tsx wraps `ReportsTabs` with it), so `BillFilesCell`'s context will resolve — no provider changes needed.
5. Update the table header (lines 510–518) to insert `<TableHead>Files</TableHead>` between Aging and Open Balance, and tweak column widths so the row still totals 100% (e.g. `Date 12% | Num 12% | Name 26% | Due Date 12% | Aging 8% right | Files 12% | Open Balance 18% right`).
6. Update the table body (lines 521–531) to render a new `<TableCell>` between Aging and Open Balance:
   - If `bill.attachments?.length > 0`: `<BillFilesCell attachments={bill.attachments} />`
   - Else: `<span className="text-xs text-muted-foreground">—</span>`
7. PDF export (`AccountsPayablePdfDocument`) is **not** changed — Files column is on-screen only (PDFs can't host clickable previews to in-app storage in a meaningful way for this report).

### Verification
- Reports → Accounts Payable on Oceanwatch → expand "1 - 30 Days":
  - New **Files** column appears between Aging and Open Balance.
  - Bill rows with attachments (e.g. NV Waterproofing 111592) show clickable file icon(s); click opens the invoice in the universal preview pane.
  - Bills without attachments show `—`.
- Bucket subtotals, grand total, lot filtering, As-of-date filtering, and PDF export continue to work unchanged.
- Other report tabs (Balance Sheet, Income Statement, Job Costs) unaffected.

### Files touched
- `src/components/reports/AccountsPayableContent.tsx` only.

