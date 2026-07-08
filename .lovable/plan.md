## Goal
When opening the Create Purchase Order dialog from a bid package, the Cost Code field should be pre-filled with the bid package's cost code (currently the id is set but the display text is empty, so the field appears blank).

## Changes

1. **`src/components/bidding/BiddingTableRow.tsx`**
   - Populate `cost_code_display` on the seeded line using the already-available `costCode` (`item.cost_codes`):
     ```
     cost_code_display: costCode ? `${costCode.code} - ${costCode.name}` : ''
     ```

2. **`src/components/bidding/BiddingCompanyList.tsx`**
   - Add optional prop `costCodeDisplay?: string` and forward it to `BiddingCompanyRow`.

3. **`src/components/bidding/components/BiddingCompanyRow.tsx`**
   - Accept `costCodeDisplay?: string` prop.
   - Set `cost_code_display: costCodeDisplay ?? ''` on the seeded line.

4. **`src/components/bidding/BidPackageDetailsModal.tsx`** (and any other caller of `BiddingCompanyList`)
   - Pass `costCodeDisplay={`${costCode.code} - ${costCode.name}`}` through so the modal path also autofills.

No changes to backend, PO dialog, or line saving logic — `CreatePurchaseOrderDialog` already renders `cost_code_display` when provided.
