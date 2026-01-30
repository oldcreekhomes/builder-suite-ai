

## Fix Missing POs for Closed Bid Packages

### Problem Summary

You have **5 closed bid packages** in project 103 E Oxford but only **3 POs**. Investigation reveals this is a system-wide issue affecting **120 closed bid packages** that have submitted bids with prices but no corresponding Purchase Orders.

**Root Cause**: Bid packages can be manually changed to "Closed" status via dropdown without going through the proper "Send PO" workflow, which skips PO creation entirely.

### Affected Data

| Project | Cost Code | Vendor | Bid Price | Status |
|---------|-----------|--------|-----------|--------|
| 103 E Oxford | 2065 - Architectural | Good Life House Plans | $4,000 | Missing PO |
| 103 E Oxford | 3230 - Water & Sewer Shut Off | John H. Morgal Plumbing | $2,545 | Missing PO |
| 115 E. Oceanwatch | 4330 - Lumber & Framing | Guy C Lee | $18,583 | Missing PO |
| 115 E. Oceanwatch | 4340 - Floor Joists | Kellogg Building Supply | $17,254 | Missing PO |
| ... and 116 more | | | | |

---

### Solution Overview

Two-part fix to address both historical and future data:

1. **Data Migration**: Create missing POs for all closed bids with submitted prices
2. **Code Change**: Prevent manual status change to "Closed" - only allow through PO workflow

---

### Part 1: Database Migration

Create POs for closed bid packages that have submitted bids with prices but no matching PO.

**SQL Logic**:
- Find all closed `project_bid_packages`
- Join with `project_bids` where status = 'submitted' and price > 0
- Left join with `project_purchase_orders` to find missing matches
- Insert new PO records for the gaps

This will create **120 new POs** with:
- Status: `approved`
- Amount from the submitted bid price
- Linked to the bid package and bid record
- Auto-generated PO numbers following existing convention

**Note**: These POs will be created but no emails will be sent (since the bids are already closed/awarded historically).

---

### Part 2: Code Change

Prevent the "Closed" status from being selectable in the dropdown. The only way to close a bid package should be through the "Send PO" button flow.

**File**: `src/components/bidding/components/BiddingTableRowContent.tsx`

Remove "Closed" option from the status dropdown:
```tsx
// Current
<SelectItem value="closed">Closed</SelectItem>

// Removed - status can only become 'closed' via PO creation flow
```

**File**: `src/components/bidding/BidPackageDetailsModal.tsx`

Same change - remove "Closed" from selectable options.

---

### Technical Details

#### Database Migration SQL (Approximate)
```sql
-- Create missing POs for closed bids
INSERT INTO project_purchase_orders (
  project_id, company_id, cost_code_id, total_amount, 
  status, bid_package_id, bid_id, notes
)
SELECT 
  bp.project_id,
  b.company_id,
  bp.cost_code_id,
  b.price,
  'approved',
  bp.id,
  b.id,
  'Auto-generated PO for previously closed bid'
FROM project_bid_packages bp
JOIN project_bids b ON b.bid_package_id = bp.id 
  AND b.bid_status = 'submitted' 
  AND b.price IS NOT NULL 
  AND b.price > 0
LEFT JOIN project_purchase_orders po 
  ON po.project_id = bp.project_id 
  AND po.cost_code_id = bp.cost_code_id 
  AND po.company_id = b.company_id
WHERE bp.status = 'closed'
  AND po.id IS NULL;
```

#### Files to Modify
| File | Change |
|------|--------|
| `src/components/bidding/components/BiddingTableRowContent.tsx` | Remove "Closed" from status dropdown |
| `src/components/bidding/BidPackageDetailsModal.tsx` | Remove "Closed" from status dropdown |

---

### Expected Results

After implementation:
- All 5 closed bids in 103 E Oxford will have corresponding POs
- John H. Morgal Plumbing will show as "Matched" in Bills PO Status
- Future bids can only be closed through proper PO creation workflow
- Bill matching will work correctly for all historical closed bids

