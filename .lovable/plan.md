
## Add Address (Lot) Column to Edit Extracted Bill Dialog

### What Needs to Change

The "Enter Manually" form already shows an **Address** column between **Total** and **Purchase Order** when a project has more than one lot. The **Edit Extracted Bill** dialog is missing this entirely. The goal is to make them identical on this point.

### Root Cause

The `LineItem` interface in `EditExtractedBillDialog.tsx` has no `lot_id` field, the dialog never loads `useLots`, and the Job Cost table has no Address column between Total and Purchase Order. The save logic (`addLine` / `updateLine`) also never passes `lot_id`.

---

### Files to Change

#### 1. `src/components/bills/EditExtractedBillDialog.tsx`

**A. Add `lot_id` to the `LineItem` interface**
```ts
interface LineItem {
  id: string;
  line_type: string;
  account_id?: string;
  account_display?: string;
  cost_code_id?: string;
  cost_code_display?: string;
  purchase_order_id?: string;
  purchase_order_line_id?: string;
  lot_id?: string;          // ← NEW
  quantity: number;
  unit_cost: number;
  amount: number;
  memo?: string;
  matchingText?: string;
  poConfidence?: number;
}
```

**B. Import `useLots` and compute `showAddressColumn`**
```ts
import { useLots } from "@/hooks/useLots";
// inside component:
const { lots } = useLots(projectId);
const showAddressColumn = lots.length > 1;
```

**C. Load `lot_id` from DB when fetching lines**
In the `loadBillData` effect, when building `jobCost` items, include `lot_id: line.lot_id || undefined`.

**D. Add the Address column header to the Job Cost table**
```tsx
{showAddressColumn && <TableHead className="w-[160px]">Address</TableHead>}
```
(Placed between the **Total** and **Purchase Order** `<TableHead>` elements, matching the manual form.)

**E. Add the Address cell per row**
```tsx
{showAddressColumn && (
  <TableCell>
    <Select
      value={line.lot_id || ''}
      onValueChange={(value) => updateJobCostLine(line.id, 'lot_id', value)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {lots.map((lot) => (
          <SelectItem key={lot.id} value={lot.id}>
            {lot.lot_name || `Lot ${lot.lot_number}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </TableCell>
)}
```
(Placed between the **Total** cell and the **Purchase Order** cell.)

**F. Include `lot_id` when saving lines**
In `handleSave`, both the `addLine.mutateAsync` call and the `updateLine.mutateAsync` call need to pass `lot_id: line.lot_id`.

#### 2. `src/hooks/usePendingBills.ts`

The `addLine` mutation currently omits `lot_id` from the insert. Add it:
```ts
lot_id: lineData.lot_id,
```
(The `updateLine` mutation already uses `Partial<PendingBillLine>` so it will pass `lot_id` through automatically once it's included in the `updates` object from the dialog.)

---

### Behavior Summary

- **Single-lot projects**: No Address column appears (identical to the manual form).
- **Multi-lot projects**: An Address dropdown appears between Total and Purchase Order for every Job Cost line, populated with the project's lots.
- **Existing lines**: `lot_id` is loaded from the DB and pre-selected if previously assigned.
- **On Save**: `lot_id` is persisted to `pending_bill_lines.lot_id`, ready to flow through to `bill_lines` when the bill is approved.
- **Expense tab**: No Address column (consistent with the manual form, which only shows Address on the Job Cost tab).
