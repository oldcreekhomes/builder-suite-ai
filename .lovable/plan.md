

## Fix: PO Status on Extracted Bills Table Should Auto-Match Against Existing POs

### Problem
The "PO Status" column in the "Enter with AI" (extracted bills) table only checks whether `purchase_order_id` is already set on `pending_bill_lines`. Since the AI extraction does not pre-populate this field, the status always shows "No PO" -- even when a matching PO clearly exists for that vendor, project, and cost code.

The auto-matching logic only runs inside the Edit dialog (`EditExtractedBillDialog`), so the user has to open every bill to trigger matching. The table itself shows stale/missing data.

### Solution
Replace the inline PO status check in `BatchBillReviewTable` with a real-time lookup against the `project_purchase_orders` table, using the same vendor + project + cost code composite key approach already used elsewhere.

### Technical Details

**File: `src/components/bills/BatchBillReviewTable.tsx`**

1. Add a query (or inline logic using the existing `supabase` client) that fetches POs for the vendor/project combinations present in the current batch of bills.

2. For each bill row, determine PO status by checking:
   - First: Does any `pending_bill_line` already have an explicit `purchase_order_id`? (current logic -- keeps working for lines matched in the Edit dialog)
   - Second (new): If not, does a PO exist in `project_purchase_orders` matching the bill's `vendor_id` + `project_id` + line's `cost_code_id`? If so, treat it as "matched".

3. Replace the current inline status calculation (lines 858-867) with this enhanced logic.

**Implementation approach**: Create a small helper hook (e.g., `usePendingBillPOStatus`) or add a `useQuery` inside `BatchBillReviewTable` that fetches all POs for the relevant vendor+project pairs. Then for each bill, check if its cost codes have matching POs.

This avoids any changes to the data model or edge functions -- it is purely a display-time lookup using existing data.

