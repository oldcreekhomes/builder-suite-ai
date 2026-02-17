

## Fix: PO Status Shows "No PO" Because vendor_id Is Not Available to the Hook

### Root Cause

The `usePendingBillPOStatus` hook reads `bill.vendor_id` to look up matching POs. However, when bills are first loaded from `pending_bill_uploads`, there is no `vendor_id` column on that table -- the vendor information lives inside `extracted_data` (as `extracted_data.vendor_id` or `extracted_data.vendorId`).

The `vendor_id` only gets set at the top level of the bill object later, after a vendor-matching RPC call completes (line 334-339 in BillsApprovalTabs). But the PO status hook runs immediately on render with the initial data, where `vendor_id` is undefined. Since all vendor IDs are empty, the hook short-circuits and returns "No PO" for everything.

### Solution

Update the `usePendingBillPOStatus` hook to also check `bill.extracted_data?.vendor_id` as a fallback when `bill.vendor_id` is not set. This mirrors what the auto-matching code in BillsApprovalTabs already does (line 197).

### Technical Details

**File: `src/hooks/usePendingBillPOStatus.ts`**

1. Expand the `PendingBillForStatus` interface to include an optional `extracted_data` field.
2. When collecting vendor IDs, check `bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId` to handle all naming conventions.
3. When determining per-bill status, use the same fallback to get the effective vendor ID.

This is a small, targeted change -- just 3-4 lines modified. No new queries, no schema changes.

**Why this fixes the screenshot:** The Contractors Unlimited bill has a `vendor_id` in `extracted_data` and a cost code on its line. The PO exists for that vendor + project + cost code combination. Once the hook can read the vendor ID from `extracted_data`, it will find the match and show "Matched" instead of "No PO".
