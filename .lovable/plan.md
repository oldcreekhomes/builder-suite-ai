

## Equalize row heights in Job Cost Actual dialog

### Problem
Rows with file icons (e.g. Bill rows showing red PDF icons) are visibly taller than rows without (e.g. the "Deposit — Refunding over payment" row). The `BillFilesCell` button uses `p-1` padding around an `h-4 w-4` icon, making those cells ~24px tall vs ~16px for plain-text rows.

### Fix (one file)
`src/components/reports/JobCostActualDialog.tsx`, the Files `<TableCell>` at lines 464–470:

- Wrap `<BillFilesCell>` in a container that neutralizes its vertical footprint so every row matches the height of the "Deposit" (no-files) row:
  - Cell becomes `<TableCell className="py-0">`.
  - Apply a fixed line-height container (`h-4 leading-none flex items-center`) so the icon button's `p-1` no longer expands the row.
- The em-dash branch already renders compact text — leave it as-is.
- No changes to `BillFilesCell` itself (it's reused on Bills page and A/P Aging report — keep its existing padding for those contexts).
- No changes to columns, data, sort, totals, or any other row.

### Verification
Open Job Costs → 2120 Permit Fees actual dialog: every row (Bill rows with PDF icons, Deposit, Check, etc.) is the same compact height as the "07/31/2025 Deposit — Refunding over payment" row. File icons remain clickable and open the universal preview.

### Files touched
- `src/components/reports/JobCostActualDialog.tsx` only.

