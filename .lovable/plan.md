

## Convert Info Cards to Standard Table Rows

### What's Changing

Replace the three Card components (Historical Pricing, Adjustment, Cost Code Breakdown) with a standard `<Table>` that matches the existing bid package management table above it. The section titles become `<TableHead>` cells in a header row, and the data sits in a body row — identical font, padding, and styling to the Status/Sent On/Due Date row.

### Layout

```text
┌──────────────────────┬──────────────────────┬──────────────────────┐
│ Historical Pricing   │ Adjustment           │ Cost Code Breakdown  │  ← TableHead row
├──────────────────────┼──────────────────────┼──────────────────────┤
│ 415 E Nelson         │ [ 100 ] %            │ 4820.1 Gates  $450   │  ← TableBody row
│ $5,620.00            │ $5,620.00            │ 4820.2 Fencing $27.50│
└──────────────────────┴──────────────────────┴──────────────────────┘
```

### Technical Details

**File**: `src/components/bidding/BidPackageDetailsModal.tsx`

- Remove the `Card`/`CardHeader`/`CardContent` imports (if no longer used elsewhere in this file) and the `History`, `Percent`, `List` icon imports
- Replace the `<div className="grid ...">` block (lines 308-389) with a `<div className="border rounded-lg"><Table>` structure:
  - `<TableHeader>` with one `<TableRow>` containing 2 or 3 `<TableHead>` cells: "Historical Pricing" (conditional), "Adjustment", "Cost Code Breakdown"
  - `<TableBody>` with one `<TableRow>` containing matching `<TableCell>` entries holding the same data content
- The conditional logic for `historicalProjectAddress` remains — when absent, the table has 2 columns instead of 3
- Input height stays `h-9` per project standard

