
## Summary

Two issues to address:

1. **Duplicate invoice reference numbers** are being allowed when submitting bills through "Enter with AI" - the validation that exists in "Enter Manually" is missing from the batch submission flow
2. **Remove Terms column** from the Review, Rejected, Approved, and Paid tabs UI (keep in database)

---

## Issue 1: Duplicate Reference Number Validation Missing

### Root Cause

The `useReferenceNumberValidation` hook is used in:
- ManualBillEntry.tsx (Enter Manually)
- EditExtractedBillDialog.tsx (editing individual AI bills)
- EditBillDialog.tsx (editing existing bills)
- ApproveBillDialog.tsx (approving individual bills)

But it is **NOT** used in `BillsApprovalTabs.tsx` in the `handleSubmitAllBills` function - the batch submission for AI-extracted bills.

### Solution

Add duplicate reference number validation to `handleSubmitAllBills` before calling `batchApproveBills`:

1. Import `useReferenceNumberValidation` hook
2. Before approving each bill, check if its reference number already exists
3. Filter out duplicates and show a toast listing which bills were skipped due to duplicate reference numbers
4. Only submit bills that pass validation

### Technical Implementation

In `BillsApprovalTabs.tsx`:

```tsx
// Add import
import { useReferenceNumberValidation } from "@/hooks/useReferenceNumberValidation";

// Add hook in component
const { checkDuplicate } = useReferenceNumberValidation();

// In handleSubmitAllBills, before batchApproveBills:
const validatedBills = [];
const duplicateBills = [];

for (const bill of selectedBills) {
  const referenceNumber = bill.extracted_data?.reference_number || 
                          bill.extracted_data?.referenceNumber || 
                          bill.reference_number;
  
  if (referenceNumber?.trim()) {
    const { isDuplicate, existingBill } = await checkDuplicate(referenceNumber);
    if (isDuplicate && existingBill) {
      duplicateBills.push({
        bill,
        existingVendor: existingBill.vendorName,
        existingProject: existingBill.projectName
      });
      continue;
    }
  }
  validatedBills.push(bill);
}

// Show warning for duplicates
if (duplicateBills.length > 0) {
  toast({
    title: "Duplicate Invoices Skipped",
    description: `${duplicateBills.length} bill(s) skipped due to duplicate reference numbers`,
    variant: "destructive",
  });
}

// Only proceed with validated bills
if (validatedBills.length === 0) {
  setIsSubmitting(false);
  return;
}
```

---

## Issue 2: Remove Terms Column from UI

### Files to Modify

| File | Location | Change |
|------|----------|--------|
| `BillsApprovalTable.tsx` | Line 693 | Remove Terms header |
| `BillsApprovalTable.tsx` | Line 884-886 | Remove Terms cell |
| `BillsApprovalTable.tsx` | Line 581-587 | Update column count calculation |
| `BillsApprovalTable.tsx` | Line 440-452 | Can keep formatTerms function (used elsewhere potentially) or remove if not needed |
| `PayBillsTable.tsx` | Line 886 | Remove Terms header |
| `PayBillsTable.tsx` | Line 1026 | Remove Terms cell |
| `PayBillsTable.tsx` | Line 665-677 | Can keep formatTerms function or remove if not needed |

### Technical Details

The Terms column currently shows values like "Net 30", "On Receipt", etc. Since Bill Date and Due Date are already shown, the terms are implied:
- Bill Date: 01/01/26, Due Date: 01/31/26 = Net 30
- Bill Date: 12/22/25, Due Date: 12/22/25 = On Receipt

Removing this column will save horizontal space in the table.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/bills/BillsApprovalTabs.tsx` | Add duplicate reference number validation before batch submission |
| `src/components/bills/BillsApprovalTable.tsx` | Remove Terms column header and cell from table |
| `src/components/bills/PayBillsTable.tsx` | Remove Terms column header and cell from table |

---

## Expected Behavior After Fix

1. **Duplicate validation**: When submitting bills from "Enter with AI", any bill with a reference number that already exists (company-wide) will be skipped with a warning toast
2. **Terms column removed**: The Review, Rejected, Approved, and Paid tabs will no longer show the Terms column, saving horizontal space while keeping Bill Date and Due Date visible
3. **Database unchanged**: The `terms` field will continue to be stored in the database, just not displayed in these tabs
