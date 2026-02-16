

## Fix: Pass Current Bill Context to PO Details Dialog

### Problem

When clicking the info (i) button on a PO in the Edit Extracted Bill dialog, the PO Details dialog opens but:
1. **No green highlighting** showing which billed amounts belong to the current bill
2. The current bill reference and amount aren't displayed at the bottom

This is because `POSelectionDropdown` renders `PODetailsDialog` without passing `currentBillId`, `currentBillAmount`, or `currentBillReference` props (line 217-223 of POSelectionDropdown.tsx). The approval table's wrapper correctly passes these, but the extraction dialog's dropdown does not.

### Solution

**File: `src/components/bills/POSelectionDropdown.tsx`**

1. Add optional props for `currentBillId`, `currentBillAmount`, and `currentBillReference` to the component interface
2. Pass them through to the `PODetailsDialog` render

**File: `src/components/bills/EditExtractedBillDialog.tsx`**

3. Pass the current bill's ID (if editing an existing bill), total amount, and reference number to each `POSelectionDropdown`

### Technical Details

**POSelectionDropdown.tsx** -- Add 3 new optional props:

```typescript
interface POSelectionDropdownProps {
  // ... existing props ...
  currentBillId?: string;
  currentBillAmount?: number;
  currentBillReference?: string;
}
```

Pass them to `PODetailsDialog` at lines 217-223:

```typescript
<PODetailsDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  purchaseOrder={selectedPOForDialog}
  projectId={projectId}
  vendorId={vendorId}
  currentBillId={currentBillId}
  currentBillAmount={currentBillAmount}
  currentBillReference={currentBillReference}
/>
```

**EditExtractedBillDialog.tsx** -- Pass bill context to each POSelectionDropdown:

```typescript
<POSelectionDropdown
  projectId={projectId}
  vendorId={vendorId}
  value={line.purchase_order_id}
  purchaseOrderLineId={line.purchase_order_line_id}
  onChange={...}
  costCodeId={line.cost_code_id}
  currentBillId={bill?.id}
  currentBillAmount={totalAmount}
  currentBillReference={referenceNumber}
/>
```

### Expected Result

- When viewing PO details from the Edit Extracted Bill dialog, billed amounts from the current bill will be highlighted in green
- The current bill reference and amount will appear at the bottom of the PO dialog
- Matches the behavior already working in the approval table view

### Files Changed

| File | Change |
|------|--------|
| `src/components/bills/POSelectionDropdown.tsx` | Add currentBillId/Amount/Reference props, pass to PODetailsDialog |
| `src/components/bills/EditExtractedBillDialog.tsx` | Pass bill context to POSelectionDropdown |

