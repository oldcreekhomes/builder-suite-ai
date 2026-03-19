

## Fix: "Missing vendor" Error on Bill Submit

### Root Cause

In `BillsApprovalTabs.tsx`, the vendor ID lookup only checks `bill.extracted_data?.vendor_id` and `bill.extracted_data?.vendorId` — it never falls back to `bill.vendor_id` (the root-level property). The display table (`BatchBillReviewTable`) correctly uses `bill.vendor_id` as a fallback, which is why the vendor shows in the UI but fails on submit.

### Fix

**File: `src/components/bills/BillsApprovalTabs.tsx`** — three lines need the same fix:

1. **Line 239** (vendor grouping): Add `bill.vendor_id ||` before the extracted_data checks
2. **Line 491** (duplicate validation): Add `bill.vendor_id ||` before the extracted_data checks  
3. **Line 569** (submit mapping): Add `bill.vendor_id ||` before the extracted_data checks

Each line changes from:
```tsx
const vendorId = bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
```
To:
```tsx
const vendorId = bill.vendor_id || bill.extracted_data?.vendor_id || bill.extracted_data?.vendorId;
```

This matches the pattern already used in `BatchBillReviewTable.tsx` line 702.

