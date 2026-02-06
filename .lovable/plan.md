

# Multi-Lot Allocation Dialog for Enter with AI

## Overview

When a project has 2 or more lots and the user submits bills where any line items are missing a lot assignment, a dialog will pop up allowing them to allocate the bill amounts across the lots. By default, it suggests an even split, but users can manually adjust.

## User Experience

1. User uploads bill(s) to "Enter with AI"
2. AI extracts bill data - lots are not assigned (Address column shows "-")
3. User selects bills and clicks "Submit Selected Bills"
4. **NEW**: Dialog appears showing:
   - Total amount being allocated (sum of all lines without lot assignments)
   - List of all project lots with checkboxes (all checked by default)
   - Pre-calculated even split amounts per lot
   - Editable amount fields for manual adjustment
5. User can:
   - Keep the even split (just click "Apply")
   - Manually adjust amounts per lot
   - Uncheck lots to exclude them from the split
6. Upon clicking "Apply Allocation":
   - Original lines are updated with first lot's amount and lot_id
   - New lines are created for each additional lot
   - Submission continues normally

## Technical Implementation

### 1. New Component: `LotAllocationDialog.tsx`

Create a new dialog component at `src/components/bills/LotAllocationDialog.tsx`:

```tsx
interface LotAllocation {
  lotId: string;
  lotName: string;
  amount: number;
  selected: boolean;
}

interface LotAllocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lots: ProjectLot[];
  totalAmount: number;
  billCount: number;
  onConfirm: (allocations: LotAllocation[]) => Promise<void>;
  onCancel: () => void;
}
```

**Dialog UI Structure:**
- Header: "Allocate Bill(s) to Addresses"
- Description explaining the project has multiple addresses
- Total amount being allocated displayed prominently
- Checkbox: "Divide evenly across all addresses" (checked by default)
- Table with columns: Checkbox | Address Name | Amount | Percentage
- Footer with Cancel and Apply buttons
- Validation: Total must equal original amount, at least one lot selected

### 2. Modify `BillsApprovalTabs.tsx`

**New State Variables:**
```tsx
const [showLotAllocationDialog, setShowLotAllocationDialog] = useState(false);
const [pendingAllocationData, setPendingAllocationData] = useState<{
  bills: BatchBill[];
  totalAmount: number;
} | null>(null);
```

**Updated `handleSubmitAllBills` Logic:**

After cost code validation passes, add this check:

```tsx
// Check if multi-lot allocation is needed
if (lots.length >= 2) {
  // Find all lines that need lot allocation
  const billsWithMissingLots = validatedBills.filter(bill =>
    bill.lines?.some(line => !line.lot_id)
  );
  
  if (billsWithMissingLots.length > 0) {
    // Calculate total amount needing allocation
    const totalAmount = billsWithMissingLots.reduce((sum, bill) => {
      const lineTotal = bill.lines
        ?.filter(line => !line.lot_id)
        .reduce((lineSum, line) => lineSum + (line.amount || 0), 0) || 0;
      return sum + lineTotal;
    }, 0);
    
    // Store data and show dialog
    setPendingAllocationData({ bills: billsWithMissingLots, totalAmount });
    setShowLotAllocationDialog(true);
    setIsSubmitting(false);
    return;
  }
}
```

**New Handler for Allocation Confirmation:**

```tsx
const handleAllocationConfirm = async (allocations: LotAllocation[]) => {
  const selectedAllocations = allocations.filter(a => a.selected);
  if (selectedAllocations.length === 0 || !pendingAllocationData) return;
  
  setIsSubmitting(true);
  
  // For each bill with missing lots, split lines across selected lots
  for (const bill of pendingAllocationData.bills) {
    const linesToSplit = bill.lines?.filter(line => !line.lot_id) || [];
    
    for (const line of linesToSplit) {
      const originalAmount = line.amount || 0;
      
      // Calculate proportional amounts based on allocation
      const totalAllocation = selectedAllocations.reduce((s, a) => s + a.amount, 0);
      
      // Update original line with first lot
      const firstLot = selectedAllocations[0];
      const firstLotProportion = firstLot.amount / totalAllocation;
      const firstLotAmount = Math.round(originalAmount * firstLotProportion * 100) / 100;
      
      await supabase
        .from('pending_bill_lines')
        .update({ 
          lot_id: firstLot.lotId, 
          amount: firstLotAmount,
          unit_cost: firstLotAmount
        })
        .eq('id', line.id);
      
      // Create new lines for remaining lots
      let remainingAmount = originalAmount - firstLotAmount;
      for (let i = 1; i < selectedAllocations.length; i++) {
        const lot = selectedAllocations[i];
        const isLast = i === selectedAllocations.length - 1;
        const lotProportion = lot.amount / totalAllocation;
        const lotAmount = isLast 
          ? remainingAmount  // Last lot gets remainder to avoid rounding issues
          : Math.round(originalAmount * lotProportion * 100) / 100;
        remainingAmount -= lotAmount;
        
        // Get next line number
        const { data: maxLine } = await supabase
          .from('pending_bill_lines')
          .select('line_number')
          .eq('pending_upload_id', bill.id)
          .order('line_number', { ascending: false })
          .limit(1);
        
        const nextLineNumber = (maxLine?.[0]?.line_number || 0) + 1;
        
        await supabase.from('pending_bill_lines').insert({
          pending_upload_id: bill.id,
          owner_id: line.owner_id,
          line_number: nextLineNumber,
          line_type: line.line_type,
          cost_code_id: line.cost_code_id,
          account_id: line.account_id,
          project_id: line.project_id,
          lot_id: lot.lotId,
          quantity: line.quantity,
          unit_cost: lotAmount,
          amount: lotAmount,
          memo: line.memo,
          description: line.description,
        });
      }
    }
  }
  
  // Refresh bills data and continue with submission
  await refetchPendingBills();
  setShowLotAllocationDialog(false);
  setPendingAllocationData(null);
  
  // Re-trigger submission with updated data
  // (The useEffect will update batchBills, then we submit)
};
```

**Render Dialog:**

Add to the component's return JSX:

```tsx
<LotAllocationDialog
  open={showLotAllocationDialog}
  onOpenChange={setShowLotAllocationDialog}
  lots={lots}
  totalAmount={pendingAllocationData?.totalAmount || 0}
  billCount={pendingAllocationData?.bills.length || 0}
  onConfirm={handleAllocationConfirm}
  onCancel={() => {
    setShowLotAllocationDialog(false);
    setPendingAllocationData(null);
    setIsSubmitting(false);
  }}
/>
```

### 3. Dialog Component Details

**Features:**
- Even split toggle that auto-recalculates when checked
- Editable amount inputs that update percentages in real-time
- Validation ensuring total matches original amount
- Warning if amounts don't sum correctly
- Disable Apply button if no lots selected or totals don't match

**Example for $300 across 3 lots:**

| Select | Address | Amount | Percentage |
|--------|---------|--------|------------|
| [x] | Lot 1 | $100.00 | 33.33% |
| [x] | Lot 2 | $100.00 | 33.33% |
| [x] | Lot 3 | $100.00 | 33.34% |
| **Total** | | **$300.00** | **100%** |

### 4. Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| 0-1 lots | No dialog shown, auto-assigns or submits normally |
| 2+ lots, all lines have lot_id | No dialog shown, submits normally |
| 2+ lots, some lines missing lot_id | Dialog shown |
| User unchecks all lots | Apply button disabled |
| Amounts don't sum to total | Apply button disabled with warning |
| Odd pennies ($100 / 3 lots) | Last lot gets remainder ($33.34) |
| User cancels dialog | Returns to Enter with AI without submitting |
| Mixed batch (some have lots, some don't) | Only lines without lots get split |

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/bills/LotAllocationDialog.tsx` | **CREATE** - New dialog component |
| `src/components/bills/BillsApprovalTabs.tsx` | **MODIFY** - Add dialog trigger and allocation handler |

## Summary

This implementation provides a clean, efficient way for users to allocate bills across multiple lots when the AI doesn't know which address the bill belongs to. The default even-split suggestion makes the common case fast, while still allowing manual adjustments for special situations.

