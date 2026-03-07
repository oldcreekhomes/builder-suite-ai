

## Fix: PO Dialog Description Field + Chronological "Billed to Date"

### Problem 1: Description Always Empty
Every PO line in the database has `description: null`. The Create PO dialog has the field and saves it correctly (`description: line.description || null`), but users apparently never fill it in. This is a data-entry issue, not a code bug. No code fix needed — just awareness.

### Problem 2: "Billed to Date" Shows All Other Bills Instead of Prior Bills Only
Currently, `useVendorPurchaseOrders` excludes only the current bill (by `excludeBillId`) from "Billed to Date." This means when viewing an older bill, it includes future bills in the total — producing incorrect numbers.

**Example with PO 2025-923T-0008 ($21,067.73):**
- Bill 379869-070 ($12,640.64, dated 02/06): Shows Billed to Date = $8,427.09 (includes two later bills). Should be **$0**.
- Bill 381241-070 ($7,373.71, dated 02/13): Shows Billed to Date = $13,694.02. Should be **$12,640.64**.
- Bill 381662-070 ($1,053.38, dated 02/20): Would correctly show $20,014.35.

### Fix

**Pass `bill_date` through the chain and filter chronologically:**

1. **`BillPOSummaryDialog` interface** — Add `bill_date?: string` to the `bill` prop type.

2. **All callers** (`BillsApprovalTable`, `PayBillsTable`, `BatchBillReviewTable`) — Already pass the full `bill` object which has `bill_date`. Just add it to the interface.

3. **`BillPOSummaryDialog`** — Pass `excludeBillDate` to `useVendorPurchaseOrders`.

4. **`PODetailsDialogWrapper`** — Same: pass `bill_date` through.

5. **`useVendorPurchaseOrders`** — Add `excludeBillDate?: string` parameter. Change the filtering logic from:
   ```
   filter(bl => bl.bill_id !== excludeBillId)
   ```
   to:
   ```
   filter(bl => {
     // Exclude current bill
     if (bl.bill_id === excludeBillId) return false;
     // Exclude bills dated after the current bill
     if (excludeBillDate && bl.bills?.bill_date > excludeBillDate) return false;
     // Exclude same-date bills that come after (by bill_id for deterministic ordering)
     if (excludeBillDate && bl.bills?.bill_date === excludeBillDate && bl.bill_id > excludeBillId) return false;
     return true;
   })
   ```
   This ensures "Billed to Date" only includes bills dated **before** the current bill, plus same-date bills with a lower ID (for deterministic ordering).

### Files Changed
| File | Change |
|---|---|
| `src/hooks/useVendorPurchaseOrders.ts` | Add `excludeBillDate` param; filter bills chronologically |
| `src/components/bills/BillPOSummaryDialog.tsx` | Add `bill_date` to bill interface; pass to hook |
| `src/components/bills/PODetailsDialogWrapper.tsx` | Pass `bill_date` through |

### Result
- Bill 379869-070: Billed to Date = $0, This Bill = $12,640.64, Remaining = $8,427.09
- Bill 381241-070: Billed to Date = $12,640.64, This Bill = $7,373.71, Remaining = $1,053.38
- Bill 381662-070: Billed to Date = $20,014.35, This Bill = $1,053.38, Remaining = $0

