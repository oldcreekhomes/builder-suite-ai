

## Fix Table Inconsistencies: Remove `table-fixed` and Add Missing Column Widths

### Root Cause
Two structural issues are making the tables look different despite having the same font:

1. **`BillsApprovalTable.tsx`** uses `table-fixed` layout and a custom container (`containerClassName="relative w-full"`) which changes how the browser sizes columns -- making text appear different even though it's the same font
2. **`PayBillsTable.tsx`** is missing width classes on most `TableHead` elements (Vendor, Cost Code, Bill Date, Due Date, Amount have no `w-` class), so columns auto-size based on content instead of matching the reference

The reference standard is `BatchBillReviewTable.tsx` which uses plain `<Table>` (no `table-fixed`) with explicit width classes on every column.

### Changes

#### 1. `BillsApprovalTable.tsx` (Rejected, NRAI, Paid tabs)
- Remove `className="table-fixed"` from `<Table>` (line 598)
- Remove `containerClassName="relative w-full"` from `<Table>` (line 598)
- Remove the extra wrapper div (`overflow-auto flex-1 min-h-0`) around the Table (line 597) -- simplify to match `BatchBillReviewTable`'s `border rounded-lg` pattern
- Keep sticky header functionality on `TableHeader`

#### 2. `PayBillsTable.tsx` (Approved tab)
- Add missing width classes to `TableHead` elements to match BatchBillReviewTable:
  - Vendor: add `w-36`
  - Cost Code: add `w-44`
  - Project: add `w-44`
  - Bill Date: add `w-24`
  - Due Date: add `w-24`
  - Amount: add `w-24`

#### 3. No changes needed
- `BatchBillReviewTable.tsx` -- already the reference standard
- `BillsReviewTable.tsx` -- simple 4-column table, no issues
- `BillsReviewTableRow.tsx` -- already correct

### Result
All bill tables will use the same table layout engine (default auto, no `table-fixed`), the same container pattern, and explicit column widths -- producing identical visual rendering across every tab.

