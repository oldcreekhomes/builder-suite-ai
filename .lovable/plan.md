
## Fix PO Status Badge on Extracted Bills Table

### Problem
The "PO Status" column in the Extracted Bills table always shows "No PO" even though the Edit dialog correctly auto-matches all three line items to purchase orders (85%, 85%, 95% confidence).

### Root Cause
The PO auto-matching logic runs **only inside the EditExtractedBillDialog** component (in local React state). The `purchase_order_id` values are only written to the `pending_bill_lines` database table when the user clicks "Save Changes." The table reads `purchase_order_id` directly from the database, where it is `NULL` until saved.

So the flow is:
1. Table loads lines from DB -- `purchase_order_id` is NULL -- badge shows "No PO"
2. User opens Edit dialog -- auto-matching runs in local state -- POs appear correct
3. User closes without saving -- table still shows "No PO"
4. Even if user saves, the re-fetch we added in the last change should update it -- but users shouldn't need to Save just to see the correct status

### Solution
Two changes to ensure PO status is accurate immediately:

**1. Auto-persist PO matches when they are computed (EditExtractedBillDialog)**
When the auto-matching logic in `EditExtractedBillDialog` assigns `purchase_order_id` values to lines, immediately write those values to the `pending_bill_lines` table in the database. This is a lightweight UPDATE (just the `purchase_order_id` column) that runs alongside the existing matching logic, so the data is persisted without requiring the user to click Save.

**2. Re-fetch lines after Edit dialog closes (already done, verify it works)**
The `onOpenChange` handler we added in the last change re-fetches lines when the dialog closes. Combined with change 1, this will ensure the table badge updates correctly.

### Technical Details

**File: `src/components/bills/EditExtractedBillDialog.tsx`**
- In the `useEffect` that runs the auto-matching (where `setJobCostLines` is called with updated `purchase_order_id` values), add a follow-up database update
- After computing matches, batch-update all matched `pending_bill_lines` rows with their `purchase_order_id` values
- This is a fire-and-forget update (no need to block the UI)

**File: `src/components/bills/BatchBillReviewTable.tsx`**
- No changes needed to the PO status logic itself (lines 858-867) -- the existing check for `line.purchase_order_id` is correct
- The re-fetch on dialog close (lines 887-910) will pick up the persisted PO IDs

### What the user will see after this fix
- Open the Manage Bills dialog, go to "Enter with AI" tab
- The PO Status badge will initially show "No PO" (before any edit)
- Open the Edit dialog -- auto-matching runs and immediately persists PO links to DB
- Close the Edit dialog -- table re-fetches lines and badge updates to "Matched"
- On subsequent page loads, the badge will show "Matched" immediately since PO IDs are already in the DB
