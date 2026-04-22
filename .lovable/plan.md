

## Add Files column to Job Cost Actual dialog

### What changes
In the Job Cost actual-detail dialog (e.g. clicking GL Insurance on Oceanwatch), add a **Files** column so you can preview each bill's attached invoice PDF directly from the row.

### Layout
Move "Description" left by narrowing it slightly and inserting a new column to its right:

```text
Type | Date | Name | Description | Files | Amount | Balance | Cleared | Actions
```

- "Description" sits one column further left than today.
- "Files" sits between Description and Amount.
- Each bill row's Files cell renders one icon per attachment (PDF / image icon, color-coded), styled like the existing `FilesCell` used in Purchase Orders. Hover shows the file name; click opens it via `openBillAttachment` in the universal preview pane.
- Non-bill rows (checks, deposits, journal entries) show a muted dash.

### Implementation (single file)
`src/components/reports/JobCostActualDialog.tsx`:
1. Extend the existing bill-enrichment query to also pull `bill_attachments(id, file_path, file_name, content_type)` alongside the bill fields already selected at lines 165–174.
2. Store attachments per bill in `billsMap` and attach them to each bill journal line as `attachments: [...]`.
3. Add `<TableHead>Files</TableHead>` between Description and Amount in the header (line ~432).
4. Add a `<TableCell>` in the body (line ~456) that:
   - For bill rows: maps `line.attachments` to small icon buttons using `getFileIcon` / `getFileIconColor` / `getCleanFileName` from `src/components/bidding/utils/fileIconUtils`, capped at 3 with `+N` overflow (mirroring `FilesCell`).
   - On click: `openBillAttachment(att.file_path, att.file_name, { ... })` from `useUniversalFilePreviewContext` (already imported pattern in `EditBillDialog`).
   - For non-bill rows or bills with no attachments: render `—`.
5. No schema, hook, or other-component changes. Footer/total row unaffected.

### Verification
- Open Job Costs → Oceanwatch → GL Insurance actual dialog.
- New **Files** column appears between Description and Amount; Description sits visibly further left.
- Each Erie Insurance / Palomar / Nicholson bill row shows clickable file icon(s); clicking opens the invoice PDF in the universal preview.
- Bills with no attachment show `—`. Non-bill rows show `—`.
- Sorting, running balance, totals, Cleared, and Actions columns continue to work unchanged.

### Files touched
- `src/components/reports/JobCostActualDialog.tsx` only.

