## Changes

### 1. Remove "Lot Cost" column (duplicates Quantity × Unit Cost info)

**`src/components/bills/EditBillDialog.tsx`**
- Remove the `Lot Cost` `<TableHead>` (line 943)
- Remove the corresponding `<TableCell>` block (lines 1045–1056) that renders `${group.lotCost.toFixed(2)} /lot`

**`src/components/bills/EditExtractedBillDialog.tsx`**
- Remove the `Lot Cost` `<TableHead>` (line 1292)
- Remove the corresponding `<TableCell>` block (lines 1376–1387)

### 2. Sort PO dropdown by cost code number ascending (3180, 3200, 3220, …)

**`src/components/bills/POSelectionDropdown.tsx`**
- Before the `.map((po) => ...)` at line 144, derive a sorted copy:
  ```ts
  const sortedPOs = [...purchaseOrders].sort((a, b) => {
    const aCode = a.cost_code?.code ?? '';
    const bCode = b.cost_code?.code ?? '';
    return aCode.localeCompare(bCode, undefined, { numeric: true });
  });
  ```
- Iterate `sortedPOs` instead of `purchaseOrders`.

No other files affected; no DB or save-path changes.
