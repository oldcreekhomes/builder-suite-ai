

## Two UI Updates to PO Details Dialog

### 1. Show Full Cost Code (Number + Name)

Currently the Cost Code column in the PO Details dialog shows only the numeric code (e.g., "4370"). It should display both the code and name (e.g., "4370: Framing Labor") to match the format used in the Manage Bills table.

**File: `src/components/bills/PODetailsDialog.tsx`** (line 150)

Change:
```
{line.cost_code ? line.cost_code.code : '—'}
```
To:
```
{line.cost_code ? `${line.cost_code.code}: ${line.cost_code.name}` : '—'}
```

The `cost_code` object already includes `name` (from `useVendorPurchaseOrders.ts` which fetches `id, code, name`), so no data changes are needed.

---

### 2. Add "Matched" Status Indicator to Billed Rows

For PO line items that have billing allocated against them (`total_billed > 0`), add a green "Matched" badge (with checkmark icon) in a new "Status" column -- matching the same visual style as the `POStatusBadge` used in the Manage Bills table.

**File: `src/components/bills/PODetailsDialog.tsx`**

- Import `Check` from lucide-react
- Add a new "Status" column header after "Remaining"
- For each line item row:
  - If `total_billed > 0` and `remaining >= 0`: show a green badge with checkmark and "Matched" text (using `bg-green-100 text-green-700` classes)
  - If `remaining < 0` (over budget): show a yellow/amber badge with warning icon and "Over" text
  - If `total_billed === 0`: leave blank (no allocation yet)
- Empty cells in the Unallocated and Totals rows

This gives users an instant visual indicator of which PO lines have invoices allocated, directly matching the familiar green "Matched" badge they already see in the bills table.

