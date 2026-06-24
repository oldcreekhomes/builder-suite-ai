## Goal
On the "Enter with ML" tab, show the matched company's canonical name (e.g. `City of Alexandria`) in the Vendor column instead of the raw OCR text (`CITY OF ALEXANDRIA VA`).

## Vendor confirmation
DB check confirms there is exactly **one** vendor matching: `City of Alexandria` (id `6606a4e7-7bb5-4a85-b3f5-36a418865a49`). No duplicate `CITY OF ALEXANDRIA VA` company exists — that string is only the raw text the ML extractor pulled from the PDF, stored on `pending_bill_uploads.extracted_data.vendor_name`. The pending bill is already correctly linked to the one real vendor via `vendor_id`.

## Fix

**File: `src/components/bills/BatchBillReviewTable.tsx`**

In the Vendor cell (around line 726 / 857), when the bill has a resolved `vendor_id`, display the matched company's name instead of `getExtractedValue(bill, 'vendor_name', 'vendor')`.

Approach:
1. Collect unique `vendor_id`s from `bills` and fetch `id, company_name` from `companies` via a small `useQuery` (cached). Build a `Map<vendorId, company_name>`.
2. When computing `vendorName`:
   - If `bill.vendor_id` is present and exists in the map → use the company name from the map.
   - Else if `bill.vendor_name` looks like a canonical (set by re-match flow) → use it.
   - Else fall back to the extracted text (so the unmatched/red-text + "Add vendor" flow still works).
3. Tooltip text uses the same resolved name.

No change to the unmatched branch (`!vendorId && vendorName`) — that intentionally shows the raw extracted text in red with Re-match / Add vendor buttons.

## Out of scope
- No data migration. Existing rows keep their raw `extracted_data.vendor_name`; the UI just prefers the matched company name for display.
- No change to the Edit dialog (already correct).
- No change to other tabs.
