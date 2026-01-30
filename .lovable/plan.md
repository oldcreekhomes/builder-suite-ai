
## Fix "Create PO" Workflow When Closing Bid Packages

### Problem
When a user selects "Closed" from the status dropdown and clicks "Create PO", the system incorrectly opens the "Send Bid Package" modal (which sends bid requests to vendors) instead of creating an actual Purchase Order.

### Root Cause
In `BiddingTableRow.tsx`, the `handleCloseWithPO` function calls `setShowSendModal(true)`, which opens `SendBidPackageModal` - the wrong modal entirely.

### Best Workflow Design

The correct workflow should be:

1. User selects "Closed" from status dropdown
2. `CloseBidPackageDialog` appears with options:
   - **Just Close**: Closes without creating a PO (for cancelled packages)
   - **Create PO**: Proceeds to PO creation flow
3. If "Create PO" is clicked:
   - Show a list of companies that have submitted bids with prices
   - User selects one company to award the PO to
   - Show `ConfirmPODialog` with company details, amount, and optional custom message
   - Create PO, send email, and close the bid package

### Implementation Plan

#### 1. Create New Component: `SelectCompanyForPODialog`
**File**: `src/components/bidding/components/SelectCompanyForPODialog.tsx`

A new dialog that:
- Lists all companies from the bid package that have submitted bids with prices
- Allows user to select one company to award the PO to
- Shows company name, bid price, and any attached proposals
- Validates that at least one company has a valid bid before allowing selection

#### 2. Update `CloseBidPackageDialog.tsx`
**File**: `src/components/bidding/components/CloseBidPackageDialog.tsx`

Add validation before allowing "Create PO":
- Check if any companies have submitted bids with prices
- If no valid bids exist, disable the "Create PO" button and show a helpful message
- Pass the bid package data to determine available companies

#### 3. Update `BiddingTableRow.tsx`
**File**: `src/components/bidding/BiddingTableRow.tsx`

Replace the current incorrect flow:
- Remove the call to `setShowSendModal(true)` for PO creation
- Add state for `SelectCompanyForPODialog`
- Add state for `ConfirmPODialog`
- Wire up the complete flow:
  1. `CloseBidPackageDialog` → "Create PO" → opens `SelectCompanyForPODialog`
  2. `SelectCompanyForPODialog` → select company → opens `ConfirmPODialog`
  3. `ConfirmPODialog` → confirm → creates PO, sends email, closes bid package

#### 4. Update `BiddingTableRowContent.tsx` and `BidPackageDetailsModal.tsx`
Pass necessary bid package data (companies with bids) to validate whether PO creation is possible.

---

### User Flow Diagram

```text
User selects "Closed" from dropdown
              |
              v
+---------------------------+
|   Close Bid Package       |
|---------------------------|
| How would you like to     |
| close this package?       |
|                           |
| [Just Close]  [Create PO] |
|        [Cancel]           |
+---------------------------+
              |
     +--------+--------+
     |                 |
     v                 v
Just Close        Create PO
     |                 |
     v                 v
Status =       +-------------------+
"closed"       | Select Company    |
(no PO)        |-------------------|
               | ○ ABC Plumbing    |
               |   $15,000         |
               | ○ XYZ Electric    |
               |   $18,500         |
               |                   |
               |  [Select & Continue]
               +-------------------+
                       |
                       v
               +-------------------+
               | Confirm PO        |
               |-------------------|
               | Company: ABC      |
               | Amount: $15,000   |
               | Cost Code: 4610   |
               |                   |
               | Custom Message:   |
               | [____________]    |
               |                   |
               | [Cancel] [Send PO]|
               +-------------------+
                       |
                       v
                Creates PO +
                Sends Email +
                Closes Package
```

---

### Technical Details

| File | Changes |
|------|---------|
| `src/components/bidding/components/SelectCompanyForPODialog.tsx` | **New file** - Company selection dialog for PO creation |
| `src/components/bidding/components/CloseBidPackageDialog.tsx` | Add validation for available bids, disable "Create PO" if no valid bids |
| `src/components/bidding/BiddingTableRow.tsx` | Add new dialog states, wire up complete PO creation flow using `ConfirmPODialog` |
| `src/components/bidding/components/BiddingTableRowContent.tsx` | Pass bid data to enable validation |
| `src/components/bidding/BidPackageDetailsModal.tsx` | Same changes as BiddingTableRowContent |

### Edge Cases Handled
- **No submitted bids**: "Create PO" button disabled with tooltip explaining why
- **Multiple submitted bids**: User selects which company to award
- **Single submitted bid**: Pre-select that company but still show selection dialog for confirmation
- **Bids without prices**: These should not appear in the selection list
