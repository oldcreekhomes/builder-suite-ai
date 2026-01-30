
## Add Close Confirmation Dialog for Bid Packages

### Problem
Users need the ability to close bid packages via the status dropdown, but the system should prompt them to choose between:
1. **Just Close** - The bid package is no longer needed (cancelled)
2. **Create PO** - Finalize the bidding and create a Purchase Order

### Solution
Create a new confirmation dialog that appears when users select "Close" from the status dropdown, giving them the choice of how to proceed.

---

### Implementation Details

#### 1. Create New Dialog Component

**New File**: `src/components/bidding/components/CloseBidPackageDialog.tsx`

A dialog that:
- Shows the cost code name for context
- Provides two clear options:
  - "Just Close" button - Updates status to closed without creating a PO
  - "Create PO" button - Opens the existing Send PO modal to complete the proper workflow
- Has a Cancel option to abort

#### 2. Modify BiddingTableRowContent.tsx

Update the status dropdown handler:
- Re-add "Closed" option to the dropdown
- When "Closed" is selected, instead of directly updating status, open the new CloseBidPackageDialog
- Pass necessary callbacks for both scenarios

Changes:
- Add state for showing the close dialog
- Add new callback prop `onCloseWithPO` to trigger PO flow
- Intercept status change when value is "closed"
- Add the dialog component

#### 3. Modify BidPackageDetailsModal.tsx

Same changes as above for the modal view:
- Re-add "Closed" option
- Handle the close selection with dialog
- Integrate with existing PO workflow

#### 4. Modify BiddingTableRow.tsx

- Add handler for the "close with PO" scenario
- Wire up the new dialog props to BiddingTableRowContent and BidPackageDetailsModal

---

### User Flow

```text
User clicks Status dropdown
         |
         v
Selects "Closed"
         |
         v
+---------------------------+
|   Close Bid Package       |
|---------------------------|
| How would you like to     |
| close this bid package?   |
|                           |
| [Just Close]  [Create PO] |
|                           |
|        [Cancel]           |
+---------------------------+
         |
    +----+----+
    |         |
    v         v
Just Close   Create PO
    |         |
    v         v
Status ->  Opens Send
"closed"   PO Modal
(no PO)    (existing flow)
```

---

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/bidding/components/CloseBidPackageDialog.tsx` | New confirmation dialog component |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/bidding/components/BiddingTableRowContent.tsx` | Re-add "Closed" option, intercept selection, show dialog |
| `src/components/bidding/BidPackageDetailsModal.tsx` | Same changes for modal view |
| `src/components/bidding/BiddingTableRow.tsx` | Wire up new dialog and handle both close scenarios |

---

### Technical Notes

- The `usePOMutations` hook already has `updateBidPackageStatus` for the "just close" scenario
- The existing `SendBidPackageModal` or per-company PO flow handles the "create PO" scenario
- For "Create PO", the dialog will need to validate that there's at least one submitted bid with a price before allowing PO creation
