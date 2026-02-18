
## Fix Table Formatting, Border, Address Width & Input Heights

### Changes Summary

Four distinct fixes in `src/components/bills/EditExtractedBillDialog.tsx`:

---

### 1. Total — Add Comma Formatting

**Current:** `$11500.00`
**Fixed:** `$11,500.00`

`calculateTotal()` returns a raw `.toFixed(2)` string. We'll replace the display with `Intl.NumberFormat` so the total renders with commas, matching the rest of the app's currency standard.

```tsx
// Before (line 1235)
<span className="text-2xl font-bold">${calculateTotal()}</span>

// After
<span className="text-2xl font-bold">
  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
    .format(parseFloat(calculateTotal()))}
</span>
```

---

### 2. Job Cost Table — Add Border Container

Wrap the `<Table>` in a `border rounded-lg overflow-hidden` div, matching the standardized table style used across the app (Files, Manage Bills, etc.).

```tsx
// Before
<Table containerClassName="relative w-full overflow-x-auto ...">

// After — wrapped
<div className="border rounded-lg overflow-hidden overflow-x-auto">
  <Table containerClassName="relative w-full">
    ...
  </Table>
</div>
```

---

### 3. Address Column — Increase Width

`90px` → `130px` so lot names like "2026-100N-..." are more readable.

```tsx
{showAddressColumn && <TableHead className="w-[130px]">Address</TableHead>}
```

---

### 4. Input Heights — Match PO Dropdown (h-8)

The Purchase Order dropdown (`POSelectionDropdown`) uses `h-8` on its `SelectTrigger`. All other inputs in the same row are default `h-10`. This mismatch is the visual inconsistency the user is seeing.

Fix: add `className="h-8"` (or `className="h-8 text-sm"`) to every input in the job cost rows:

| Input | Current | Fix |
|---|---|---|
| Cost Code (`CostCodeSearchInput`) | default h-10 | pass `className="h-8"` |
| Memo (`Input`) | default h-10 | add `className="h-8"` |
| Quantity (`Input`) | default h-10 | add `className="h-8"` |
| Unit Cost (`Input`) | default h-10 | add `className="h-8"` |
| Address (`SelectTrigger`) | default h-10 | already uses `w-full`, add `className="h-8 w-full"` |

The same fix applies to the **Expense** tab inputs (Account, Memo, Quantity, Unit Cost) to keep them consistent.

---

### Files Changed

- **`src/components/bills/EditExtractedBillDialog.tsx`** only — no other files touched.

### Column Widths After This Change

```text
Cost Code:      220px
Memo:           220px
Quantity:       70px
Unit Cost:      120px
Total:          80px
Address:        130px   (was 90px)
Purchase Order: 180px
Match:          55px
Actions:        50px
```
