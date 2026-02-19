
## Root Cause — The Real Reason Changes Had No Effect

The header `TableHead` width classes were updated in previous attempts, but **the body `TableCell` width classes were never changed**. In HTML tables without `table-fixed`, the browser ignores header widths and sizes columns based on the **body cell content**. Because the body cells still have the original wide widths (`w-44`, `w-36`, `w-24`, `w-32`, etc.) and `whitespace-nowrap` on Vendor and Cost Code, the table stays wide regardless of what was changed in the header.

Here is the mismatch that exists right now:

| Column | Header Width (changed) | Body Cell Width (unchanged — still old) |
|---|---|---|
| Vendor | `w-32` | `w-36` (old) |
| Cost Code | `w-36` | `w-44` (old) + `whitespace-nowrap` |
| Bill Date | `w-20` | `w-24` (old) |
| Due Date | `w-20` | `w-24` (old) |
| Amount | `w-20` | `w-24` (old) |
| Reference | `w-24` | `w-32` (old) |
| Memo | `w-10` | `w-12` (old) |
| Address | `w-16` | `w-24` (old) |
| Files | `w-10` | `w-14` (old) |
| Notes | `w-10` | `w-14` (old) |

This also explains why the user says "nothing changed" — because the header changes are visually overridden by the wider body cells.

## The Fix

Update all the `TableCell` width classes in the body rows of `BillsApprovalTable.tsx` to match the tighter header widths, and remove `whitespace-nowrap` from Vendor and Cost Code cells so they can wrap inside constrained columns.

Also simplify the container — remove the `min-w-[900px]` from `<Table>` since the columns will fit naturally once tightened, just like `PayBillsTable` works with a plain `<div className="border rounded-lg"><Table>` and no min-width at all.

### Exact Changes in `src/components/bills/BillsApprovalTable.tsx`

**Container (lines 598-599)** — simplify to match PayBillsTable's working pattern:
```tsx
// FROM:
<div className="border rounded-lg overflow-x-auto">
    <Table containerClassName="relative w-full" className="min-w-[900px]">

// TO:
<div className="border rounded-lg">
    <Table>
```

**Body cells** — update widths to match the headers and remove `whitespace-nowrap`:

- Line 744: `<TableCell className="w-36">` → `<TableCell className="w-32 max-w-[128px]">`
- Line 758: `<TableCell className="overflow-hidden w-44">` → `<TableCell className="w-36 max-w-[144px] overflow-hidden">`
- Line 799: `<TableCell className="w-24">` (Bill Date) → `<TableCell className="w-20">`
- Line 802: `<TableCell className="w-24">` (Due Date) → `<TableCell className="w-20">`
- Line 819: `<TableCell className="w-24">` (Amount) → `<TableCell className="w-20">`
- Line 829: `<TableCell className="w-32">` (Reference) → `<TableCell className="w-24 max-w-[96px]">`
- Line 833: `<TableCell className="w-12 text-center">` (Memo) → `<TableCell className="w-10 text-center">`
- Line 849: `<TableCell className="w-24">` (Address) → `<TableCell className="w-16 max-w-[64px]">`
- Line 887: `<TableCell className="w-14 text-center">` (Files) → `<TableCell className="w-10 text-center">`
- Line 890: `<TableCell className="w-14 text-center">` (Notes) → `<TableCell className="w-10 text-center">`
- Line 930 (Vendor cell): Remove `whitespace-nowrap` from the span inside
- Line 933 (Cost Code cell): Remove `whitespace-nowrap` from the span inside

This matches exactly how `PayBillsTable.tsx` works (plain `<div className="border rounded-lg"><Table>`, no min-width, body cells drive widths), and will bring all columns — including PO Status, Cleared, and Actions — into view.
