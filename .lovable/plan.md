

## Fix: "No Purchase Order" Not Saving to Database

### Root Cause

When you select "No purchase order" and save, the system converts the `__none__` sentinel to `undefined` via the `sanitizePoId` utility. However, Supabase's `.update()` method silently ignores `undefined` values, meaning the old auto-matched `purchase_order_id` is never actually cleared from the database. On re-open, the stale PO link is still there, and it gets carried into the approved bill.

This is why the Exterior Trim/Cornice lines ($400 each) still show as linked to the Framing Labor PO -- the auto-match wrote a PO ID, and the user's "No PO" selection never overwrote it.

### Fix

**File: `src/utils/poSentinelUtils.ts`**

Change `sanitizePoId` to return `null` instead of `undefined`. Supabase properly sets columns to `NULL` when the value is `null`, but ignores `undefined`.

```
Before:  return undefined
After:   return null
```

This single change fixes the issue across all three parent components (EditExtractedBillDialog, ManualBillEntry, EditBillDialog) since they all call `sanitizePoId`.

### Already-Approved Bill

The Four Seasons bill (INV0022) already has the wrong PO IDs saved in the `bill_lines` table. After deploying this fix, you will need to edit the approved bill and re-select "No purchase order" for those three lines, then save again. This time the save will properly clear the PO assignment.

