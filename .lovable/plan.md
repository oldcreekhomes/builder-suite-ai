

## Standardize Bidding and Purchase Orders Header Buttons

### Problem
Both the Bidding page ("Load Bid Packages" button) and Purchase Orders page ("Create Purchase Order" button) use the default filled/primary button variant instead of `variant="outline"` like the Files page buttons.

### Changes

**1. `src/components/bidding/BiddingTable.tsx`**
- Line 232: Add `variant="outline"` to the "Load Bid Packages" button (the one passed to header via `onHeaderActionChange`).

**2. `src/components/purchaseOrders/PurchaseOrdersTable.tsx`**
- Line 128: Add `variant="outline"` to the "Create Purchase Order" button (header version).
- Line 148: Add `variant="outline"` to the "Create Purchase Order" button (fallback/content version).

### Result
All header action buttons across Files, Photos, Bidding, and Purchase Orders pages will consistently use `variant="outline" size="sm"` -- same font, same colors, same white background with border.

